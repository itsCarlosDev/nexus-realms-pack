import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

/**
 * Nexus Realms server-only JAR patcher.
 *
 * Run directly with Java 17 source-file mode:
 *   java NexusServerPatcher.java --server-root /path/to/server --apply
 *
 * Modified JARs are never stored in Git. Only exact original and validated
 * patched SHA-256 hashes are accepted.
 */
public final class NexusServerPatcher {
    private static final String BACKUP_DIRECTORY =
        ".nexus-server-patches/originals";

    private enum Kind {
        REMOVE_ENTRY,
        ROOT_MIXIN_TO_CLIENT,
        TXNI_BUNDLE,
        FRAGMENTUM_BUNDLE,
        JSON_MAP_KEY_REMOVE
    }

    private record PatchSpec(
        String name,
        String file,
        String originalHash,
        Set<String> patchedHashes,
        Kind kind,
        String config,
        List<String> names
    ) {}

    private record ZipItem(String name, long time, boolean directory, byte[] data) {}

    private static final List<PatchSpec> PATCHES = List.of(
        patch(
            "Indestructible KubeJS",
            "indestructible-20.13.0.jar",
            "6DE25C515F8284FEBB9E2F0B2D35E0ECAD5A520CDE279C424D8A6F2BE1554685",
            Set.of(
                "E29D3C9EB24615870DC25EA9DEE5E75B587B8ECEF29D5AF1B23A67FBB897AB85",
                "F1F1C40A1536948CDF3D6C850D76DB2060258EF4FF1E3B7CE0452B7029996918"
            ),
            Kind.REMOVE_ENTRY,
            "kubejs.plugins.txt"
        ),
        patch(
            "Epic Fight KubeJS",
            "epic-fight-20.14.17-mc1.20.1-forge.jar",
            "69566CF70AE2D91D3F2564C608F014C87E290CEF6215C2A27719851165485F73",
            Set.of(
                "E675BF0A6FBA5BAC8573AD46C5531E7BA34939059B1598781F7902E5D7498350",
                "C48A3C2E85181BDBA4E5A9D602F02BFF66F43DF95588822F1747C46DDB6A6C09"
            ),
            Kind.REMOVE_ENTRY,
            "kubejs.plugins.txt"
        ),
        patch(
            "TxniLib Fabric API server compatibility",
            "txnilib-forge-1.0.24-1.20.1.jar",
            "71CA69345EF763903213E0B0DB3C9C07D2A090AD311D1DE66C31798A813A9D0E",
            Set.of(
                "D8FFF1F3297547F070E32667ECB50C7D4E8DB81D3CD175A68D95850A363415B9",
                "992951CF6CDABA4237B840E082EF210D3CAD85099D8D027182119415BA043D40"
            ),
            Kind.TXNI_BUNDLE,
            ""
        ),
        patch(
            "Sword Soaring OBB renderer",
            "sword_soaring-20.14.2.8-mc1.20.1-forge.jar",
            "286359A3546B6CD87C58E2ED01FDA8CD9D854868E08A6D096EC10E3A84A41765",
            Set.of(
                "33956478FF9C4F71B47D6E5DE272547238319C20A5820724E2C44CCD7E380FFE",
                "49F8201C5869F2D2B03D38B2B79E0D073CCB6568D722064757ACAD6FB789ACF7"
            ),
            Kind.ROOT_MIXIN_TO_CLIENT,
            "sword_soaring.mixins.json",
            "OBBColliderMixin"
        ),
        patch(
            "Relics screen mixin",
            "relics-1.20.1-0.8.0.13.jar",
            "2731D3B81533564C5D206FAF94E4E8AFAF928D97B47B720E5D6AAA017333096F",
            Set.of(
                "2B1210B171550053AF71AF83CD4C689CEB2E4AB9D226034C76BDD02A945C3698",
                "55A479CDBA1B68E2D0A998BED302DC253615B763388A8FC8A70661402DD23C14"
            ),
            Kind.ROOT_MIXIN_TO_CLIENT,
            "relics.mixins.json",
            "ScreenMixin"
        ),
        patch(
            "Fragmentum server compatibility",
            "fragmentum-forge-1.20.1-1.3.0.jar",
            "BE2E501DDC44EC9E899C8A76F0DC1C302FE786E5ACA4A517C564228EE8DB532E",
            Set.of(
                "4F371A90E378B4050A9F5D7D137E60907D0CB2E80F123D38DA4165A5C673A418",
                "C06B99E41CAE04F9A692453030F093A0457D20BCBB436D00F32090C3BCBE4432"
            ),
            Kind.FRAGMENTUM_BUNDLE,
            "fragmentum.mixins.json",
            "MixinMinecraft"
        ),
        patch(
            "FamiliarsLib item renderer mixin",
            "familiarslib-1.20.1-1.6.jar",
            "DA9D2FE1B8D861DF8AEC6D75FF54277DB469A301E23689B8A9C9E173B1247610",
            Set.of(
                "3F64E8D9336C2EDFE90A5EB868496F3DE900792ED8F6B8307D96B90A201ACD78",
                "43CED3E9C315773C9ADF30CE16FF58A0A09FC41829A5B19A6F3C214B921E90FB"
            ),
            Kind.ROOT_MIXIN_TO_CLIENT,
            "familiarslib.mixins.json",
            "ItemTransformMixin"
        ),
        patch(
            "Starcatcher Artifacts data map",
            "starcatcher-2.3.17-FORGE-1.20.1.jar",
            "3A261C4CDD10D75AA0744268C0C867CE3945D237713A6C199E0D1428A7D754D6",
            Set.of(
                "C3472A5AB85FE2DC15C129963FD1C004FC3FDF90BC3A27339D1CE47A6F84B803",
                "490C7E6435E6CC8BD0656EA0736558176AFFF899E412EC00B5FECB3F4F45FED4"
            ),
            Kind.JSON_MAP_KEY_REMOVE,
            "data/starcatcher/data_maps/item/catch_modifiers.json",
            "artifacts:anglers_hat"
        )
    );

    private static PatchSpec patch(
        String name,
        String file,
        String originalHash,
        Set<String> patchedHashes,
        Kind kind,
        String config,
        String... names
    ) {
        return new PatchSpec(
            name,
            file,
            originalHash,
            upperSet(patchedHashes),
            kind,
            config,
            List.of(names)
        );
    }

    private static Set<String> upperSet(Set<String> values) {
        var result = new LinkedHashSet<String>();
        for (String value : values) {
            result.add(value.toUpperCase(Locale.ROOT));
        }
        return Set.copyOf(result);
    }

    public static void main(String[] args) {
        try {
            run(args);
        } catch (Exception exception) {
            System.err.println("[NEXUS PATCH ERROR] " + exception.getMessage());
            System.exit(1);
        }
    }

    private static void run(String[] args) throws Exception {
        Path serverRoot = null;
        boolean apply = false;

        for (int index = 0; index < args.length; index++) {
            switch (args[index]) {
                case "--server-root" -> {
                    if (++index >= args.length) {
                        throw new IllegalArgumentException(
                            "--server-root requires a path"
                        );
                    }
                    serverRoot = Path.of(args[index]).toAbsolutePath().normalize();
                }
                case "--apply" -> apply = true;
                case "--check" -> apply = false;
                default -> throw new IllegalArgumentException(
                    "Unknown argument: " + args[index]
                );
            }
        }

        if (serverRoot == null) {
            throw new IllegalArgumentException("--server-root is required");
        }
        if (!Files.isDirectory(serverRoot)) {
            throw new IllegalArgumentException(
                "Server root does not exist: " + serverRoot
            );
        }

        Path modsRoot = serverRoot.resolve("mods").normalize();
        if (!modsRoot.startsWith(serverRoot) || !Files.isDirectory(modsRoot)) {
            throw new IllegalArgumentException(
                "Server mods directory does not exist: " + modsRoot
            );
        }

        System.out.println("Mode: " + (apply ? "APPLY" : "CHECK"));
        System.out.println("Server root: " + serverRoot);

        for (PatchSpec patch : PATCHES) {
            applyPatch(serverRoot, modsRoot, patch, apply);
        }

        System.out.println(
            apply
                ? "All server JAR patches are applied and validated."
                : "JAR patch check completed without modifying files."
        );
    }

    private static void applyPatch(
        Path serverRoot,
        Path modsRoot,
        PatchSpec patch,
        boolean apply
    ) throws Exception {
        Path jar = modsRoot.resolve(patch.file()).normalize();
        if (!jar.startsWith(modsRoot) || !Files.isRegularFile(jar)) {
            throw new IOException("Required JAR not found: " + jar);
        }

        String currentHash = sha256(jar);
        if (patch.patchedHashes().contains(currentHash)) {
            if (!verify(jar, patch)) {
                throw new IOException(
                    "Known patched hash failed validation: " + patch.file()
                );
            }
            System.out.println("[OK] " + patch.name() + ": known patched hash.");
            return;
        }

        if (!currentHash.equals(patch.originalHash())) {
            throw new IOException(
                "[UNKNOWN HASH] " + patch.file()
                    + "\nExpected original: " + patch.originalHash()
                    + "\nAllowed patched:  " + patch.patchedHashes()
                    + "\nActual:           " + currentHash
            );
        }

        if (!apply) {
            System.out.println("[PLAN] " + patch.name() + ": patch required.");
            return;
        }

        Path backup = createOriginalBackup(serverRoot, jar, currentHash);
        Path temporary = Files.createTempFile(
            jar.getParent(),
            "." + jar.getFileName() + ".nexus-",
            ".tmp"
        );

        try {
            byte[] original = Files.readAllBytes(jar);
            byte[] updated = transform(original, patch);
            Files.write(temporary, updated);

            if (!verify(temporary, patch)) {
                throw new IOException(
                    "Patched JAR failed structural validation: " + patch.file()
                );
            }

            String patchedHash = sha256(temporary);
            if (!patch.patchedHashes().contains(patchedHash)) {
                throw new IOException(
                    "Patched output is not allowlisted: " + patch.file()
                        + "\nActual patched SHA-256: " + patchedHash
                );
            }

            safeReplace(temporary, jar);

            String installedHash = sha256(jar);
            if (!installedHash.equals(patchedHash) || !verify(jar, patch)) {
                throw new IOException(
                    "Installed patch failed final validation: " + patch.file()
                );
            }

            System.out.println("[PATCHED] " + patch.name());
            System.out.println("          Backup: " + backup);
            System.out.println("          SHA-256: " + installedHash);
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    private static Path createOriginalBackup(
        Path serverRoot,
        Path jar,
        String originalHash
    ) throws Exception {
        Path backupRoot = serverRoot.resolve(BACKUP_DIRECTORY).normalize();
        if (!backupRoot.startsWith(serverRoot)) {
            throw new IOException("Unsafe backup path: " + backupRoot);
        }
        Files.createDirectories(backupRoot);

        String fileName = jar.getFileName().toString();
        int extension = fileName.toLowerCase(Locale.ROOT).lastIndexOf(".jar");
        String baseName = extension >= 0
            ? fileName.substring(0, extension)
            : fileName;
        Path backup = backupRoot.resolve(
            baseName + ".original-" + originalHash + ".jar"
        );

        if (Files.exists(backup)) {
            if (!sha256(backup).equals(originalHash)) {
                throw new IOException(
                    "Existing original backup has an invalid hash: " + backup
                );
            }
            return backup;
        }

        Path temporary = Files.createTempFile(
            backupRoot,
            "." + baseName + ".",
            ".tmp"
        );
        try {
            Files.copy(jar, temporary, StandardCopyOption.REPLACE_EXISTING);
            if (!sha256(temporary).equals(originalHash)) {
                throw new IOException(
                    "Original backup verification failed: " + jar
                );
            }
            safeReplace(temporary, backup);
        } finally {
            Files.deleteIfExists(temporary);
        }
        return backup;
    }

    private static void safeReplace(Path source, Path destination)
        throws IOException {
        try {
            Files.move(
                source,
                destination,
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING
            );
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(
                source,
                destination,
                StandardCopyOption.REPLACE_EXISTING
            );
        }
    }

    private static String sha256(Path path) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (var input = Files.newInputStream(path)) {
            byte[] buffer = new byte[128 * 1024];
            int read;
            while ((read = input.read(buffer)) >= 0) {
                digest.update(buffer, 0, read);
            }
        }
        var result = new StringBuilder();
        for (byte value : digest.digest()) {
            result.append(String.format("%02X", value));
        }
        return result.toString();
    }

    private static byte[] transform(byte[] archive, PatchSpec patch)
        throws Exception {
        return switch (patch.kind()) {
            case REMOVE_ENTRY -> removeEntry(archive, patch.config());
            case ROOT_MIXIN_TO_CLIENT -> updateJson(
                archive,
                List.of(),
                patch.config(),
                root -> moveMixinsToClient(root, patch.names())
            );
            case TXNI_BUNDLE -> patchTxni(archive);
            case FRAGMENTUM_BUNDLE -> patchFragmentum(
                archive,
                patch.config(),
                patch.names()
            );
            case JSON_MAP_KEY_REMOVE -> updateJson(
                archive,
                List.of(),
                patch.config(),
                root -> removeMapKeys(root, patch.names())
            );
        };
    }

    private static boolean verify(Path jar, PatchSpec patch) throws Exception {
        byte[] archive = Files.readAllBytes(jar);
        return switch (patch.kind()) {
            case REMOVE_ENTRY -> !containsEntry(archive, patch.config());
            case ROOT_MIXIN_TO_CLIENT -> verifyMixinMove(
                readJson(archive, List.of(), patch.config()),
                patch.names()
            );
            case TXNI_BUNDLE -> verifyTxni(archive);
            case FRAGMENTUM_BUNDLE -> verifyFragmentum(
                archive,
                patch.config(),
                patch.names()
            );
            case JSON_MAP_KEY_REMOVE -> verifyMapKeysRemoved(
                readJson(archive, List.of(), patch.config()),
                patch.names()
            );
        };
    }

    private static byte[] patchTxni(byte[] archive) throws Exception {
        List<String> fabricApi = List.of("META-INF/jars/fabric-api-*.jar");

        archive = updateJson(
            archive,
            concat(fabricApi, "*fabric-screen-api-v1-*.jar"),
            "fabric-screen-api-v1.mixins.json",
            root -> moveMixinsToClient(
                root,
                List.of("MouseMixin", "ScreenAccessor")
            )
        );

        archive = updateJson(
            archive,
            concat(fabricApi, "*fabric-object-builder-api-v1-*.jar"),
            "fabric-object-builder-v1.mixins.json",
            root -> removeMixins(
                root,
                List.of("TradeOffersTypeAwareBuyForOneEmeraldFactoryMixin")
            )
        );

        List<MixinVersion> versions = List.of(
            new MixinVersion(
                "*fabric-item-group-api-v1-*.jar",
                "fabric-item-group-api-v1.mixins.json",
                "0.8.5"
            ),
            new MixinVersion(
                "*fabric-item-group-api-v1-*.jar",
                "fabric-item-group-api-v1.client.mixins.json",
                "0.8.5"
            ),
            new MixinVersion(
                "*fabric-item-api-v1-*.jar",
                "fabric-item-api-v1.client.mixins.json",
                "0.8.5"
            ),
            new MixinVersion(
                "*fabric-data-attachment-api-v1-*.jar",
                "fabric-data-attachment-api-v1.mixins.json",
                "0.8.5"
            ),
            new MixinVersion(
                "*fabric-data-attachment-api-v1-*.jar",
                "fabric-data-attachment-api-v1.client.mixins.json",
                "0.8.5"
            )
        );

        for (MixinVersion version : versions) {
            archive = updateJson(
                archive,
                concat(fabricApi, version.nestedPattern()),
                version.config(),
                root -> setStringProperty(root, "minVersion", version.value())
            );
        }
        return archive;
    }

    private record MixinVersion(
        String nestedPattern,
        String config,
        String value
    ) {}

    private static boolean verifyTxni(byte[] archive) throws Exception {
        List<String> fabricApi = List.of("META-INF/jars/fabric-api-*.jar");
        if (!verifyMixinMove(
            readJson(
                archive,
                concat(fabricApi, "*fabric-screen-api-v1-*.jar"),
                "fabric-screen-api-v1.mixins.json"
            ),
            List.of("MouseMixin", "ScreenAccessor")
        )) {
            return false;
        }

        Object trade = readJson(
            archive,
            concat(fabricApi, "*fabric-object-builder-api-v1-*.jar"),
            "fabric-object-builder-v1.mixins.json"
        );
        if (arrayStrings(object(trade).get("mixins")).contains(
            "TradeOffersTypeAwareBuyForOneEmeraldFactoryMixin"
        )) {
            return false;
        }

        List<MixinVersion> versions = List.of(
            new MixinVersion(
                "*fabric-item-group-api-v1-*.jar",
                "fabric-item-group-api-v1.mixins.json",
                "0.8.5"
            ),
            new MixinVersion(
                "*fabric-item-group-api-v1-*.jar",
                "fabric-item-group-api-v1.client.mixins.json",
                "0.8.5"
            ),
            new MixinVersion(
                "*fabric-item-api-v1-*.jar",
                "fabric-item-api-v1.client.mixins.json",
                "0.8.5"
            ),
            new MixinVersion(
                "*fabric-data-attachment-api-v1-*.jar",
                "fabric-data-attachment-api-v1.mixins.json",
                "0.8.5"
            ),
            new MixinVersion(
                "*fabric-data-attachment-api-v1-*.jar",
                "fabric-data-attachment-api-v1.client.mixins.json",
                "0.8.5"
            )
        );
        for (MixinVersion version : versions) {
            Object config = readJson(
                archive,
                concat(fabricApi, version.nestedPattern()),
                version.config()
            );
            if (!version.value().equals(object(config).get("minVersion"))) {
                return false;
            }
        }
        return true;
    }

    private static byte[] patchFragmentum(
        byte[] archive,
        String config,
        List<String> names
    ) throws Exception {
        archive = updateJson(
            archive,
            List.of(),
            config,
            root -> moveMixinsToClient(root, names)
        );
        return updateJson(
            archive,
            List.of("META-INF/jarjar/yet-another-config-lib-*.jar"),
            "yacl.mixins.json",
            root -> setStringProperty(root, "minVersion", "0.8")
        );
    }

    private static boolean verifyFragmentum(
        byte[] archive,
        String config,
        List<String> names
    ) throws Exception {
        if (!verifyMixinMove(readJson(archive, List.of(), config), names)) {
            return false;
        }
        Object yacl = readJson(
            archive,
            List.of("META-INF/jarjar/yet-another-config-lib-*.jar"),
            "yacl.mixins.json"
        );
        return "0.8".equals(object(yacl).get("minVersion"));
    }

    private static List<String> concat(List<String> values, String value) {
        var result = new ArrayList<>(values);
        result.add(value);
        return List.copyOf(result);
    }

    private static Object moveMixinsToClient(
        Object root,
        List<String> names
    ) {
        Map<String, Object> object = object(root);
        List<Object> mixins = array(object.get("mixins"));
        List<Object> client = array(object.get("client"));
        mixins.removeIf(value -> names.contains(String.valueOf(value)));
        for (String name : names) {
            if (!client.contains(name)) {
                client.add(name);
            }
        }
        object.put("mixins", mixins);
        object.put("client", client);
        return object;
    }

    private static Object removeMixins(Object root, List<String> names) {
        Map<String, Object> object = object(root);
        List<Object> mixins = array(object.get("mixins"));
        mixins.removeIf(value -> names.contains(String.valueOf(value)));
        object.put("mixins", mixins);
        return object;
    }

    private static Object setStringProperty(
        Object root,
        String property,
        String value
    ) {
        Map<String, Object> object = object(root);
        object.put(property, value);
        return object;
    }

    private static Object removeMapKeys(Object root, List<String> names) {
        Map<String, Object> object = object(root);
        Map<String, Object> values = object(object.get("values"));
        for (String name : names) {
            values.remove(name);
        }
        return object;
    }

    private static boolean verifyMixinMove(
        Object root,
        List<String> names
    ) {
        Map<String, Object> object = object(root);
        Set<String> mixins = arrayStrings(object.get("mixins"));
        Set<String> client = arrayStrings(object.get("client"));
        for (String name : names) {
            if (mixins.contains(name) || !client.contains(name)) {
                return false;
            }
        }
        return true;
    }

    private static boolean verifyMapKeysRemoved(
        Object root,
        List<String> names
    ) {
        Map<String, Object> values = object(object(root).get("values"));
        for (String name : names) {
            if (values.containsKey(name)) {
                return false;
            }
        }
        return true;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> object(Object value) {
        if (!(value instanceof Map<?, ?>)) {
            throw new IllegalArgumentException("Expected a JSON object");
        }
        return (Map<String, Object>) value;
    }

    @SuppressWarnings("unchecked")
    private static List<Object> array(Object value) {
        if (value == null) {
            return new ArrayList<>();
        }
        if (!(value instanceof List<?>)) {
            throw new IllegalArgumentException("Expected a JSON array");
        }
        return (List<Object>) value;
    }

    private static Set<String> arrayStrings(Object value) {
        var result = new LinkedHashSet<String>();
        for (Object entry : array(value)) {
            result.add(String.valueOf(entry));
        }
        return result;
    }

    private static boolean containsEntry(byte[] archive, String name)
        throws IOException {
        for (ZipItem entry : readZip(archive)) {
            if (entry.name().equals(name)) {
                return true;
            }
        }
        return false;
    }

    private static byte[] removeEntry(byte[] archive, String name)
        throws IOException {
        List<ZipItem> entries = readZip(archive);
        entries.removeIf(entry -> entry.name().equals(name));
        return writeZip(entries);
    }

    private static Object readJson(
        byte[] archive,
        List<String> nestedPatterns,
        String configPath
    ) throws Exception {
        byte[] current = archive;
        for (String pattern : nestedPatterns) {
            current = findEntry(current, pattern).data();
        }
        ZipItem config = findEntryExact(current, configPath);
        return Json.parse(new String(config.data(), StandardCharsets.UTF_8));
    }

    private static byte[] updateJson(
        byte[] archive,
        List<String> nestedPatterns,
        String configPath,
        java.util.function.Function<Object, Object> update
    ) throws Exception {
        if (nestedPatterns.isEmpty()) {
            return replaceEntry(
                archive,
                configPath,
                old -> {
                    Object parsed = Json.parse(
                        new String(old, StandardCharsets.UTF_8)
                    );
                    Object changed = update.apply(parsed);
                    return Json.stringify(changed)
                        .getBytes(StandardCharsets.UTF_8);
                }
            );
        }

        String first = nestedPatterns.get(0);
        List<String> remaining = nestedPatterns.subList(
            1,
            nestedPatterns.size()
        );
        return replaceMatchingEntry(
            archive,
            first,
            old -> {
                try {
                    return updateJson(old, remaining, configPath, update);
                } catch (Exception exception) {
                    throw new WrappedException(exception);
                }
            }
        );
    }

    private static byte[] replaceEntry(
        byte[] archive,
        String name,
        java.util.function.Function<byte[], byte[]> update
    ) throws IOException {
        List<ZipItem> entries = readZip(archive);
        boolean found = false;
        for (int index = 0; index < entries.size(); index++) {
            ZipItem item = entries.get(index);
            if (item.name().equals(name)) {
                entries.set(
                    index,
                    new ZipItem(
                        item.name(),
                        item.time(),
                        item.directory(),
                        update.apply(item.data())
                    )
                );
                found = true;
                break;
            }
        }
        if (!found) {
            throw new IOException("ZIP entry not found: " + name);
        }
        return writeZip(entries);
    }

    private static byte[] replaceMatchingEntry(
        byte[] archive,
        String glob,
        java.util.function.Function<byte[], byte[]> update
    ) throws Exception {
        try {
            Pattern pattern = glob(glob);
            List<ZipItem> entries = readZip(archive);
            boolean found = false;
            for (int index = 0; index < entries.size(); index++) {
                ZipItem item = entries.get(index);
                if (pattern.matcher(item.name()).matches()) {
                    entries.set(
                        index,
                        new ZipItem(
                            item.name(),
                            item.time(),
                            item.directory(),
                            update.apply(item.data())
                        )
                    );
                    found = true;
                    break;
                }
            }
            if (!found) {
                throw new IOException("Nested JAR not found: " + glob);
            }
            return writeZip(entries);
        } catch (WrappedException exception) {
            if (exception.getCause() instanceof Exception cause) {
                throw cause;
            }
            throw exception;
        }
    }

    private static ZipItem findEntry(byte[] archive, String glob)
        throws IOException {
        Pattern pattern = glob(glob);
        for (ZipItem entry : readZip(archive)) {
            if (pattern.matcher(entry.name()).matches()) {
                return entry;
            }
        }
        throw new IOException("Nested JAR not found: " + glob);
    }

    private static ZipItem findEntryExact(byte[] archive, String name)
        throws IOException {
        for (ZipItem entry : readZip(archive)) {
            if (entry.name().equals(name)) {
                return entry;
            }
        }
        throw new IOException("ZIP entry not found: " + name);
    }

    private static Pattern glob(String glob) {
        StringBuilder regex = new StringBuilder("^");
        for (char character : glob.toCharArray()) {
            if (character == '*') {
                regex.append(".*");
            } else {
                if ("\\.^$|?+()[]{}".indexOf(character) >= 0) {
                    regex.append('\\');
                }
                regex.append(character);
            }
        }
        regex.append('$');
        return Pattern.compile(regex.toString());
    }

    private static List<ZipItem> readZip(byte[] bytes) throws IOException {
        var entries = new ArrayList<ZipItem>();
        Path temporary = Files.createTempFile("nexus-zip-read-", ".jar");
        try {
            Files.write(temporary, bytes);
            try (var zip = new ZipFile(temporary.toFile())) {
                var enumeration = zip.entries();
                while (enumeration.hasMoreElements()) {
                    ZipEntry entry = enumeration.nextElement();
                    byte[] data;
                    if (entry.isDirectory()) {
                        data = new byte[0];
                    } else {
                        try (var input = zip.getInputStream(entry)) {
                            data = input.readAllBytes();
                        }
                    }
                    entries.add(
                        new ZipItem(
                            entry.getName(),
                            entry.getTime(),
                            entry.isDirectory(),
                            data
                        )
                    );
                }
            }
        } finally {
            Files.deleteIfExists(temporary);
        }
        return entries;
    }

    private static byte[] writeZip(List<ZipItem> entries) throws IOException {
        var outputBytes = new ByteArrayOutputStream();
        try (var output = new ZipOutputStream(outputBytes)) {
            for (ZipItem item : entries) {
                ZipEntry entry = new ZipEntry(item.name());
                if (item.time() >= 0) {
                    entry.setTime(item.time());
                }
                output.putNextEntry(entry);
                if (!item.directory()) {
                    output.write(item.data());
                }
                output.closeEntry();
            }
        }
        return outputBytes.toByteArray();
    }

    private static final class WrappedException extends RuntimeException {
        WrappedException(Throwable cause) {
            super(cause);
        }
    }

    /**
     * Minimal JSON parser/serializer for the configuration files embedded in
     * the allowlisted JARs. It supports objects, arrays, strings, numbers,
     * booleans and null without external dependencies.
     */
    private static final class Json {
        private final String source;
        private int position;

        private Json(String source) {
            this.source = source;
        }

        static Object parse(String source) {
            Json parser = new Json(source);
            Object value = parser.readValue();
            parser.skipWhitespace();
            if (parser.position != source.length()) {
                throw parser.error("Unexpected trailing content");
            }
            return value;
        }

        static String stringify(Object value) {
            StringBuilder output = new StringBuilder();
            writeValue(value, output);
            output.append('\n');
            return output.toString();
        }

        private Object readValue() {
            skipWhitespace();
            if (position >= source.length()) {
                throw error("Unexpected end of JSON");
            }
            return switch (source.charAt(position)) {
                case '{' -> readObject();
                case '[' -> readArray();
                case '"' -> readString();
                case 't' -> readLiteral("true", Boolean.TRUE);
                case 'f' -> readLiteral("false", Boolean.FALSE);
                case 'n' -> readLiteral("null", null);
                default -> readNumber();
            };
        }

        private Map<String, Object> readObject() {
            expect('{');
            var result = new LinkedHashMap<String, Object>();
            skipWhitespace();
            if (peek('}')) {
                position++;
                return result;
            }
            while (true) {
                skipWhitespace();
                String key = readString();
                skipWhitespace();
                expect(':');
                result.put(key, readValue());
                skipWhitespace();
                if (peek('}')) {
                    position++;
                    return result;
                }
                expect(',');
            }
        }

        private List<Object> readArray() {
            expect('[');
            var result = new ArrayList<Object>();
            skipWhitespace();
            if (peek(']')) {
                position++;
                return result;
            }
            while (true) {
                result.add(readValue());
                skipWhitespace();
                if (peek(']')) {
                    position++;
                    return result;
                }
                expect(',');
            }
        }

        private String readString() {
            expect('"');
            var result = new StringBuilder();
            while (position < source.length()) {
                char character = source.charAt(position++);
                if (character == '"') {
                    return result.toString();
                }
                if (character != '\\') {
                    result.append(character);
                    continue;
                }
                if (position >= source.length()) {
                    throw error("Unterminated string escape");
                }
                char escape = source.charAt(position++);
                switch (escape) {
                    case '"' -> result.append('"');
                    case '\\' -> result.append('\\');
                    case '/' -> result.append('/');
                    case 'b' -> result.append('\b');
                    case 'f' -> result.append('\f');
                    case 'n' -> result.append('\n');
                    case 'r' -> result.append('\r');
                    case 't' -> result.append('\t');
                    case 'u' -> {
                        if (position + 4 > source.length()) {
                            throw error("Invalid unicode escape");
                        }
                        result.append(
                            (char) Integer.parseInt(
                                source.substring(position, position + 4),
                                16
                            )
                        );
                        position += 4;
                    }
                    default -> throw error("Invalid string escape");
                }
            }
            throw error("Unterminated string");
        }

        private Object readNumber() {
            int start = position;
            if (peek('-')) {
                position++;
            }
            while (
                position < source.length()
                    && Character.isDigit(source.charAt(position))
            ) {
                position++;
            }
            if (peek('.')) {
                position++;
                while (
                    position < source.length()
                        && Character.isDigit(source.charAt(position))
                ) {
                    position++;
                }
            }
            if (peek('e') || peek('E')) {
                position++;
                if (peek('+') || peek('-')) {
                    position++;
                }
                while (
                    position < source.length()
                        && Character.isDigit(source.charAt(position))
                ) {
                    position++;
                }
            }
            if (start == position) {
                throw error("Expected JSON value");
            }
            return new BigDecimal(source.substring(start, position));
        }

        private Object readLiteral(String literal, Object value) {
            if (!source.startsWith(literal, position)) {
                throw error("Expected " + literal);
            }
            position += literal.length();
            return value;
        }

        private void skipWhitespace() {
            while (
                position < source.length()
                    && Character.isWhitespace(source.charAt(position))
            ) {
                position++;
            }
        }

        private void expect(char expected) {
            skipWhitespace();
            if (!peek(expected)) {
                throw error("Expected '" + expected + "'");
            }
            position++;
        }

        private boolean peek(char expected) {
            return position < source.length()
                && source.charAt(position) == expected;
        }

        private IllegalArgumentException error(String message) {
            return new IllegalArgumentException(
                message + " at JSON offset " + position
            );
        }

        private static void writeValue(Object value, StringBuilder output) {
            if (value == null) {
                output.append("null");
            } else if (value instanceof String string) {
                writeString(string, output);
            } else if (
                value instanceof Boolean
                    || value instanceof BigDecimal
                    || value instanceof Number
            ) {
                output.append(value);
            } else if (value instanceof Map<?, ?> map) {
                output.append('{');
                boolean first = true;
                for (Map.Entry<?, ?> entry : map.entrySet()) {
                    if (!first) {
                        output.append(',');
                    }
                    first = false;
                    writeString(String.valueOf(entry.getKey()), output);
                    output.append(':');
                    writeValue(entry.getValue(), output);
                }
                output.append('}');
            } else if (value instanceof List<?> list) {
                output.append('[');
                for (int index = 0; index < list.size(); index++) {
                    if (index > 0) {
                        output.append(',');
                    }
                    writeValue(list.get(index), output);
                }
                output.append(']');
            } else {
                throw new IllegalArgumentException(
                    "Unsupported JSON value: " + value.getClass()
                );
            }
        }

        private static void writeString(String value, StringBuilder output) {
            output.append('"');
            for (char character : value.toCharArray()) {
                switch (character) {
                    case '"' -> output.append("\\\"");
                    case '\\' -> output.append("\\\\");
                    case '\b' -> output.append("\\b");
                    case '\f' -> output.append("\\f");
                    case '\n' -> output.append("\\n");
                    case '\r' -> output.append("\\r");
                    case '\t' -> output.append("\\t");
                    default -> {
                        if (character < 0x20) {
                            output.append(
                                String.format("\\u%04x", (int) character)
                            );
                        } else {
                            output.append(character);
                        }
                    }
                }
            }
            output.append('"');
        }
    }
}
