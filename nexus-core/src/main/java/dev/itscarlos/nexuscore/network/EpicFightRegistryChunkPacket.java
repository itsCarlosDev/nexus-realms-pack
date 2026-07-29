package dev.itscarlos.nexuscore.network;

import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.network.NetworkEvent;

import java.util.Arrays;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * One bounded fragment of the compressed Epic Fight animation registry.
 */
public record EpicFightRegistryChunkPacket(
    UUID transferId,
    int chunkIndex,
    int totalChunks,
    int compressedLength,
    int uncompressedLength,
    int animationCount,
    byte[] checksum,
    byte[] chunk
) {

    private static final int SHA_256_BYTES = 32;

    public EpicFightRegistryChunkPacket {
        checksum = checksum == null ? null : checksum.clone();
        chunk = chunk == null ? null : chunk.clone();
    }

    @Override
    public byte[] checksum() {
        return checksum == null ? null : checksum.clone();
    }

    @Override
    public byte[] chunk() {
        return chunk == null ? null : chunk.clone();
    }

    public static void encode(
        EpicFightRegistryChunkPacket packet,
        FriendlyByteBuf buffer
    ) {
        packet.validateMetadata();

        buffer.writeUUID(packet.transferId());
        buffer.writeVarInt(packet.chunkIndex());
        buffer.writeVarInt(packet.totalChunks());
        buffer.writeVarInt(packet.compressedLength());
        buffer.writeVarInt(packet.uncompressedLength());
        buffer.writeVarInt(packet.animationCount());
        buffer.writeByteArray(packet.checksum);
        buffer.writeByteArray(packet.chunk);
    }

    public static EpicFightRegistryChunkPacket decode(FriendlyByteBuf buffer) {
        return new EpicFightRegistryChunkPacket(
            buffer.readUUID(),
            buffer.readVarInt(),
            buffer.readVarInt(),
            buffer.readVarInt(),
            buffer.readVarInt(),
            buffer.readVarInt(),
            buffer.readByteArray(SHA_256_BYTES),
            buffer.readByteArray(EpicFightRegistryBridge.MAX_CHUNK_BYTES)
        );
    }

    public static void handle(
        EpicFightRegistryChunkPacket packet,
        Supplier<NetworkEvent.Context> contextSupplier
    ) {
        NetworkEvent.Context context = contextSupplier.get();
        ServerPlayer sender = context.getSender();

        if (sender != null) {
            EpicFightRegistryBridge.acceptChunk(packet, sender);
        }

        context.setPacketHandled(true);
    }

    public void validateMetadata() {
        if (transferId == null) {
            throw new IllegalArgumentException("Missing Epic Fight transfer id");
        }
        if (totalChunks < 1 || totalChunks > EpicFightRegistryBridge.MAX_CHUNKS) {
            throw new IllegalArgumentException(
                "Epic Fight total chunk count outside bounds: " + totalChunks
            );
        }
        if (chunkIndex < 0 || chunkIndex >= totalChunks) {
            throw new IllegalArgumentException(
                "Epic Fight chunk index outside bounds: " + chunkIndex
            );
        }
        if (compressedLength < 1
            || compressedLength > EpicFightRegistryBridge.MAX_COMPRESSED_BYTES) {
            throw new IllegalArgumentException(
                "Epic Fight compressed length outside bounds: " + compressedLength
            );
        }
        if (uncompressedLength < 1
            || uncompressedLength > EpicFightRegistryBridge.MAX_UNCOMPRESSED_BYTES) {
            throw new IllegalArgumentException(
                "Epic Fight uncompressed length outside bounds: "
                    + uncompressedLength
            );
        }
        if (animationCount < 0
            || animationCount > EpicFightRegistryBridge.MAX_ANIMATIONS) {
            throw new IllegalArgumentException(
                "Epic Fight animation count outside bounds: " + animationCount
            );
        }
        if (checksum == null || checksum.length != SHA_256_BYTES) {
            throw new IllegalArgumentException(
                "Epic Fight transfer requires a SHA-256 checksum"
            );
        }
        if (chunk == null
            || chunk.length < 1
            || chunk.length > EpicFightRegistryBridge.MAX_CHUNK_BYTES) {
            throw new IllegalArgumentException(
                "Epic Fight chunk length outside bounds: "
                    + (chunk == null ? -1 : chunk.length)
            );
        }

        int expectedChunks = Math.max(
            1,
            (compressedLength + EpicFightRegistryBridge.MAX_CHUNK_BYTES - 1)
                / EpicFightRegistryBridge.MAX_CHUNK_BYTES
        );
        if (totalChunks != expectedChunks) {
            throw new IllegalArgumentException(
                "Epic Fight total chunks do not match compressed length: "
                    + totalChunks + " != " + expectedChunks
            );
        }
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof EpicFightRegistryChunkPacket packet)) {
            return false;
        }
        return chunkIndex == packet.chunkIndex
            && totalChunks == packet.totalChunks
            && compressedLength == packet.compressedLength
            && uncompressedLength == packet.uncompressedLength
            && animationCount == packet.animationCount
            && transferId.equals(packet.transferId)
            && Arrays.equals(checksum, packet.checksum)
            && Arrays.equals(chunk, packet.chunk);
    }

    @Override
    public int hashCode() {
        int result = transferId.hashCode();
        result = 31 * result + chunkIndex;
        result = 31 * result + totalChunks;
        result = 31 * result + compressedLength;
        result = 31 * result + uncompressedLength;
        result = 31 * result + animationCount;
        result = 31 * result + Arrays.hashCode(checksum);
        result = 31 * result + Arrays.hashCode(chunk);
        return result;
    }
}
