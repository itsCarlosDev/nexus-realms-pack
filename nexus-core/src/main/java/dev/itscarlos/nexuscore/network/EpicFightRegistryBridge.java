package dev.itscarlos.nexuscore.network;

import dev.itscarlos.nexuscore.NexusCore;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.network.ServerGamePacketListenerImpl;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

/**
 * Replaces Epic Fight's oversized C2S animation-registry validation packet
 * with a bounded, compressed and fragmented Nexus Core transfer.
 *
 * <p>Epic Fight 20.14.17 serializes every animation registry name into one
 * {@code CPCheckAnimationRegistryMatches} custom payload. Large addon packs
 * exceed Minecraft 1.20.1's 32,767-byte serverbound custom-payload limit.
 * This bridge preserves Epic Fight's original validation by reconstructing
 * the same message on the server and invoking its validator after all chunks
 * have been verified.</p>
 */
public final class EpicFightRegistryBridge {

    private static final String TARGET_MESSAGE =
        "yesman.epicfight.network.client.CPCheckAnimationRegistryMatches";
    private static final String ANIMATION_MANAGER =
        "yesman.epicfight.api.animation.AnimationManager";

    private static final int MAGIC = 0x4E584546; // NXEF
    private static final int FORMAT_VERSION = 1;

    public static final int MAX_CHUNK_BYTES = 16 * 1024;
    public static final int MAX_COMPRESSED_BYTES = 1024 * 1024;
    public static final int MAX_UNCOMPRESSED_BYTES = 4 * 1024 * 1024;
    public static final int MAX_ANIMATIONS = 50_000;
    public static final int MAX_NAME_BYTES = 32_767;
    public static final int MAX_CHUNKS = 128;
    private static final int MAX_ACTIVE_TRANSFERS_PER_PLAYER = 4;

    private static final long TRANSFER_TIMEOUT_NANOS =
        Duration.ofSeconds(45).toNanos();

    private static final Map<TransferKey, TransferAssembly> TRANSFERS =
        new HashMap<>();

    private static volatile EpicFightReflection reflection;

    private EpicFightRegistryBridge() {
    }

    /**
     * Called by the Epic Fight network-manager mixin on the physical client.
     *
     * @return {@code true} when the original Epic Fight packet was replaced
     *         and therefore must be cancelled.
     */
    public static boolean interceptClientMessage(Object message) {
        if (message == null || !TARGET_MESSAGE.equals(message.getClass().getName())) {
            return false;
        }

        try {
            Field countField = message.getClass().getField("animationCount");
            Field namesField = message.getClass().getField("registryNames");

            int animationCount = countField.getInt(message);
            String[] registryNames = (String[]) namesField.get(message);

            validateClientRegistry(animationCount, registryNames);

            byte[] uncompressed = encodeRegistry(animationCount, registryNames);
            byte[] compressed = gzip(uncompressed);
            byte[] checksum = sha256(compressed);

            if (compressed.length > MAX_COMPRESSED_BYTES) {
                throw new IllegalArgumentException(
                    "Compressed Epic Fight registry exceeds "
                        + MAX_COMPRESSED_BYTES + " bytes: " + compressed.length
                );
            }

            int totalChunks = Math.max(
                1,
                (compressed.length + MAX_CHUNK_BYTES - 1) / MAX_CHUNK_BYTES
            );

            if (totalChunks > MAX_CHUNKS) {
                throw new IllegalArgumentException(
                    "Epic Fight registry requires too many chunks: " + totalChunks
                );
            }

            UUID transferId = UUID.randomUUID();

            for (int chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                int offset = chunkIndex * MAX_CHUNK_BYTES;
                int end = Math.min(compressed.length, offset + MAX_CHUNK_BYTES);
                byte[] chunk = Arrays.copyOfRange(compressed, offset, end);

                EpicFightRegistryNetwork.send(
                    new EpicFightRegistryChunkPacket(
                        transferId,
                        chunkIndex,
                        totalChunks,
                        compressed.length,
                        uncompressed.length,
                        animationCount,
                        checksum,
                        chunk
                    )
                );
            }

            NexusCore.LOGGER.info(
                "Bridged Epic Fight animation registry: animations={}, rawBytes={}, "
                    + "compressedBytes={}, chunks={}",
                animationCount,
                uncompressed.length,
                compressed.length,
                totalChunks
            );

            return true;
        } catch (ReflectiveOperationException | IOException | RuntimeException exception) {
            NexusCore.LOGGER.error(
                "Failed to replace Epic Fight's oversized animation-registry packet; "
                    + "falling back to its original sender",
                exception
            );
            return false;
        }
    }

    public static void acceptChunk(
        EpicFightRegistryChunkPacket packet,
        ServerPlayer sender
    ) {
        Objects.requireNonNull(packet, "packet");
        Objects.requireNonNull(sender, "sender");

        cleanupExpiredTransfers();

        try {
            packet.validateMetadata();

            TransferKey key = new TransferKey(sender.getUUID(), packet.transferId());
            if (!TRANSFERS.containsKey(key)
                && activeTransfersFor(sender.getUUID())
                    >= MAX_ACTIVE_TRANSFERS_PER_PLAYER) {
                throw new IllegalArgumentException(
                    "Too many concurrent Epic Fight registry transfers"
                );
            }

            TransferAssembly assembly = TRANSFERS.computeIfAbsent(
                key,
                ignored -> new TransferAssembly(packet)
            );

            byte[] completePayload = assembly.accept(packet);
            if (completePayload == null) {
                return;
            }

            TRANSFERS.remove(key);
            validateChecksum(completePayload, packet.checksum());

            byte[] uncompressed = gunzipBounded(
                completePayload,
                packet.uncompressedLength()
            );

            String[] registryNames = decodeRegistry(
                uncompressed,
                packet.animationCount()
            );

            invokeEpicFightValidation(sender, registryNames);

            NexusCore.LOGGER.info(
                "Validated bridged Epic Fight animation registry for {}: "
                    + "animations={}, compressedBytes={}, chunks={}",
                sender.getGameProfile().getName(),
                registryNames.length,
                completePayload.length,
                packet.totalChunks()
            );
        } catch (ReflectiveOperationException | IOException | RuntimeException exception) {
            removeTransfer(sender, packet.transferId());
            NexusCore.LOGGER.error(
                "Rejected invalid Epic Fight animation-registry transfer from {}",
                sender.getGameProfile().getName(),
                exception
            );
            sender.connection.disconnect(
                Component.literal(
                    "Nexus Realms: no se pudo validar el registro de animaciones "
                        + "de Epic Fight. Revisa los logs del servidor."
                )
            );
        }
    }

    private static void validateClientRegistry(
        int animationCount,
        String[] registryNames
    ) {
        if (registryNames == null) {
            throw new IllegalArgumentException("Epic Fight registry names are null");
        }
        if (animationCount != registryNames.length) {
            throw new IllegalArgumentException(
                "Epic Fight animation count mismatch: " + animationCount
                    + " != " + registryNames.length
            );
        }
        if (animationCount < 0 || animationCount > MAX_ANIMATIONS) {
            throw new IllegalArgumentException(
                "Epic Fight animation count outside bounds: " + animationCount
            );
        }
    }

    private static byte[] encodeRegistry(
        int animationCount,
        String[] registryNames
    ) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (DataOutputStream output = new DataOutputStream(bytes)) {
            output.writeInt(MAGIC);
            output.writeInt(FORMAT_VERSION);
            output.writeInt(animationCount);

            for (String registryName : registryNames) {
                if (registryName == null) {
                    throw new IllegalArgumentException(
                        "Epic Fight registry contains a null name"
                    );
                }

                byte[] encodedName = registryName.getBytes(StandardCharsets.UTF_8);
                if (encodedName.length > MAX_NAME_BYTES) {
                    throw new IllegalArgumentException(
                        "Epic Fight animation id is too long: " + encodedName.length
                    );
                }

                output.writeInt(encodedName.length);
                output.write(encodedName);

                if (bytes.size() > MAX_UNCOMPRESSED_BYTES) {
                    throw new IllegalArgumentException(
                        "Epic Fight registry exceeds "
                            + MAX_UNCOMPRESSED_BYTES + " uncompressed bytes"
                    );
                }
            }
        }
        return bytes.toByteArray();
    }

    private static String[] decodeRegistry(
        byte[] uncompressed,
        int expectedAnimationCount
    ) throws IOException {
        try (DataInputStream input = new DataInputStream(
            new ByteArrayInputStream(uncompressed)
        )) {
            int magic = input.readInt();
            int version = input.readInt();
            int animationCount = input.readInt();

            if (magic != MAGIC) {
                throw new IOException("Invalid Epic Fight registry transfer magic");
            }
            if (version != FORMAT_VERSION) {
                throw new IOException(
                    "Unsupported Epic Fight registry transfer version: " + version
                );
            }
            if (animationCount != expectedAnimationCount) {
                throw new IOException(
                    "Epic Fight registry count changed during transfer: "
                        + animationCount + " != " + expectedAnimationCount
                );
            }
            if (animationCount < 0 || animationCount > MAX_ANIMATIONS) {
                throw new IOException(
                    "Epic Fight registry count outside bounds: " + animationCount
                );
            }

            String[] registryNames = new String[animationCount];
            for (int index = 0; index < animationCount; index++) {
                int byteLength = input.readInt();
                if (byteLength < 0 || byteLength > MAX_NAME_BYTES) {
                    throw new IOException(
                        "Epic Fight registry name length outside bounds: " + byteLength
                    );
                }

                byte[] encodedName = new byte[byteLength];
                input.readFully(encodedName);
                registryNames[index] = new String(
                    encodedName,
                    StandardCharsets.UTF_8
                );
            }

            if (input.read() != -1) {
                throw new IOException(
                    "Epic Fight registry transfer contains trailing bytes"
                );
            }

            return registryNames;
        }
    }

    private static byte[] gzip(byte[] uncompressed) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (GZIPOutputStream gzip = new GZIPOutputStream(bytes)) {
            gzip.write(uncompressed);
        }
        return bytes.toByteArray();
    }

    private static byte[] gunzipBounded(
        byte[] compressed,
        int expectedLength
    ) throws IOException {
        if (expectedLength < 0 || expectedLength > MAX_UNCOMPRESSED_BYTES) {
            throw new IOException(
                "Uncompressed Epic Fight registry length outside bounds: "
                    + expectedLength
            );
        }

        ByteArrayOutputStream output = new ByteArrayOutputStream(expectedLength);
        try (GZIPInputStream gzip = new GZIPInputStream(
            new ByteArrayInputStream(compressed)
        )) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = gzip.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                if (output.size() > MAX_UNCOMPRESSED_BYTES) {
                    throw new IOException(
                        "Decompressed Epic Fight registry exceeds safety limit"
                    );
                }
            }
        }

        byte[] uncompressed = output.toByteArray();
        if (uncompressed.length != expectedLength) {
            throw new IOException(
                "Epic Fight registry uncompressed length mismatch: "
                    + uncompressed.length + " != " + expectedLength
            );
        }
        return uncompressed;
    }

    private static byte[] sha256(byte[] value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private static void validateChecksum(
        byte[] completePayload,
        byte[] expectedChecksum
    ) {
        byte[] actualChecksum = sha256(completePayload);
        if (!MessageDigest.isEqual(actualChecksum, expectedChecksum)) {
            throw new IllegalArgumentException(
                "Epic Fight registry checksum mismatch"
            );
        }
    }

    private static void invokeEpicFightValidation(
        ServerPlayer sender,
        String[] registryNames
    ) throws ReflectiveOperationException {
        EpicFightReflection cached = reflection;
        if (cached == null) {
            synchronized (EpicFightRegistryBridge.class) {
                cached = reflection;
                if (cached == null) {
                    cached = EpicFightReflection.load();
                    reflection = cached;
                }
            }
        }

        try {
            Object message = cached.messageConstructor().newInstance(
                registryNames.length,
                registryNames
            );
            Object manager = cached.getInstanceMethod().invoke(null);
            cached.validateMethod().invoke(manager, message, sender.connection);
        } catch (InvocationTargetException exception) {
            Throwable cause = exception.getCause();
            if (cause instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new ReflectiveOperationException(
                "Epic Fight registry validation failed",
                cause
            );
        }
    }

    private static void cleanupExpiredTransfers() {
        long now = System.nanoTime();
        Iterator<Map.Entry<TransferKey, TransferAssembly>> iterator =
            TRANSFERS.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<TransferKey, TransferAssembly> entry = iterator.next();
            if (now - entry.getValue().createdAtNanos() > TRANSFER_TIMEOUT_NANOS) {
                iterator.remove();
            }
        }
    }

    private static int activeTransfersFor(UUID playerId) {
        int count = 0;
        for (TransferKey key : TRANSFERS.keySet()) {
            if (key.playerId().equals(playerId)) {
                count++;
            }
        }
        return count;
    }

    private static void removeTransfer(ServerPlayer sender, UUID transferId) {
        TRANSFERS.remove(new TransferKey(sender.getUUID(), transferId));
    }

    private record TransferKey(UUID playerId, UUID transferId) {
    }

    private static final class TransferAssembly {
        private final long createdAtNanos = System.nanoTime();
        private final int totalChunks;
        private final int compressedLength;
        private final int uncompressedLength;
        private final int animationCount;
        private final byte[] checksum;
        private final byte[][] chunks;
        private int receivedChunks;
        private int receivedBytes;

        private TransferAssembly(EpicFightRegistryChunkPacket first) {
            this.totalChunks = first.totalChunks();
            this.compressedLength = first.compressedLength();
            this.uncompressedLength = first.uncompressedLength();
            this.animationCount = first.animationCount();
            this.checksum = first.checksum().clone();
            this.chunks = new byte[totalChunks][];
        }

        private long createdAtNanos() {
            return createdAtNanos;
        }

        private byte[] accept(EpicFightRegistryChunkPacket packet) {
            requireMatchingMetadata(packet);

            int expectedLength = Math.min(
                MAX_CHUNK_BYTES,
                compressedLength - packet.chunkIndex() * MAX_CHUNK_BYTES
            );
            if (packet.chunk().length != expectedLength) {
                throw new IllegalArgumentException(
                    "Epic Fight registry chunk length mismatch at index "
                        + packet.chunkIndex() + ": " + packet.chunk().length
                        + " != " + expectedLength
                );
            }

            byte[] existing = chunks[packet.chunkIndex()];
            if (existing != null) {
                if (!Arrays.equals(existing, packet.chunk())) {
                    throw new IllegalArgumentException(
                        "Conflicting duplicate Epic Fight registry chunk "
                            + packet.chunkIndex()
                    );
                }
                return null;
            }

            chunks[packet.chunkIndex()] = packet.chunk().clone();
            receivedChunks++;
            receivedBytes += packet.chunk().length;

            if (receivedChunks != totalChunks) {
                return null;
            }
            if (receivedBytes != compressedLength) {
                throw new IllegalArgumentException(
                    "Epic Fight registry transfer length mismatch: "
                        + receivedBytes + " != " + compressedLength
                );
            }

            byte[] complete = new byte[compressedLength];
            int offset = 0;
            for (byte[] chunk : chunks) {
                System.arraycopy(chunk, 0, complete, offset, chunk.length);
                offset += chunk.length;
            }
            return complete;
        }

        private void requireMatchingMetadata(EpicFightRegistryChunkPacket packet) {
            if (packet.totalChunks() != totalChunks
                || packet.compressedLength() != compressedLength
                || packet.uncompressedLength() != uncompressedLength
                || packet.animationCount() != animationCount
                || !Arrays.equals(packet.checksum(), checksum)) {
                throw new IllegalArgumentException(
                    "Epic Fight registry transfer metadata changed between chunks"
                );
            }
        }
    }

    private record EpicFightReflection(
        Constructor<?> messageConstructor,
        Method getInstanceMethod,
        Method validateMethod
    ) {
        private static EpicFightReflection load()
            throws ReflectiveOperationException {
            Class<?> messageClass = Class.forName(TARGET_MESSAGE);
            Class<?> managerClass = Class.forName(ANIMATION_MANAGER);

            Constructor<?> constructor = messageClass.getConstructor(
                int.class,
                String[].class
            );
            Method getInstance = managerClass.getMethod("getInstance");
            Method validate = managerClass.getMethod(
                "validateClientAnimationRegistry",
                messageClass,
                ServerGamePacketListenerImpl.class
            );

            return new EpicFightReflection(constructor, getInstance, validate);
        }
    }
}
