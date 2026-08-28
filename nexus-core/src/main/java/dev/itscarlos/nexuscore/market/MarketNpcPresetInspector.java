package dev.itscarlos.nexuscore.market;

import com.mojang.brigadier.exceptions.CommandSyntaxException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.Tag;
import net.minecraft.nbt.TagParser;
import net.minecraft.resources.ResourceLocation;

final class MarketNpcPresetInspector {
    private static final String[] FORBIDDEN_PLACEMENT_KEYS = {
        "UUID", "Pos", "Rotation", "Owner", "Navigation", "NoGravity"
    };

    private MarketNpcPresetInspector() {
    }

    static Inspection inspect(Path configDirectory, MarketNpcDefinition definition) {
        Path easyNpcRoot = configDirectory.resolve("easy_npc").toAbsolutePath().normalize();
        Path presetPath = easyNpcRoot.resolve(definition.preset().getPath()).normalize();
        if (!presetPath.startsWith(easyNpcRoot)) {
            return Inspection.failure(presetPath, "la ruta del preset sale de config/easy_npc");
        }
        if (!Files.isRegularFile(presetPath)) {
            return Inspection.failure(presetPath, "preset no encontrado: " + presetPath);
        }

        try {
            CompoundTag root = TagParser.parseTag(Files.readString(presetPath, StandardCharsets.UTF_8));
            if (root.contains("PresetUUID")) {
                return Inspection.failure(presetPath, "el preset contiene PresetUUID runtime no permitido");
            }
            if (!root.contains("data", Tag.TAG_COMPOUND)) {
                return Inspection.failure(presetPath, "el preset no contiene el compound data");
            }

            CompoundTag data = root.getCompound("data");
            if (data.contains("PresetUUID")) {
                return Inspection.failure(presetPath, "el preset contiene data.PresetUUID runtime no permitido");
            }
            ResourceLocation dataEntityType = ResourceLocation.tryParse(data.getString("id"));
            if (!definition.entityType().equals(dataEntityType)) {
                return Inspection.failure(
                    presetPath,
                    "EntityType data.id esperado " + definition.entityType() + " pero encontrado " + dataEntityType
                );
            }

            if (!root.contains("PresetMetadata", Tag.TAG_COMPOUND)) {
                return Inspection.failure(presetPath, "el preset no contiene PresetMetadata");
            }
            ResourceLocation metadataEntityType = ResourceLocation.tryParse(
                root.getCompound("PresetMetadata").getString("entityTypeId")
            );
            if (!definition.entityType().equals(metadataEntityType)) {
                return Inspection.failure(
                    presetPath,
                    "PresetMetadata.entityTypeId esperado " + definition.entityType()
                        + " pero encontrado " + metadataEntityType
                );
            }

            for (String key : FORBIDDEN_PLACEMENT_KEYS) {
                if (data.contains(key)) {
                    return Inspection.failure(
                        presetPath,
                        "el preset contiene el campo runtime no permitido data." + key
                    );
                }
            }
            return Inspection.success(presetPath, dataEntityType);
        } catch (IOException | CommandSyntaxException exception) {
            return Inspection.failure(
                presetPath,
                "no se pudo leer o interpretar el preset: " + exception.getMessage()
            );
        }
    }

    record Inspection(boolean valid, Path path, ResourceLocation entityType, String error) {
        private static Inspection success(Path path, ResourceLocation entityType) {
            return new Inspection(true, path, entityType, "");
        }

        private static Inspection failure(Path path, String error) {
            return new Inspection(false, path, null, error);
        }
    }
}
