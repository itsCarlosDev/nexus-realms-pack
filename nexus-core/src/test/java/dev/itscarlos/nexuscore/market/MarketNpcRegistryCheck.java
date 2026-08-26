package dev.itscarlos.nexuscore.market;

import com.mojang.brigadier.exceptions.CommandSyntaxException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.nbt.TagParser;
import net.minecraft.resources.ResourceLocation;

public final class MarketNpcRegistryCheck {
    private static final List<String> EXPECTED_IDS = List.of(
        "nexus_custodian",
        "chronicler",
        "guard_captain",
        "warrior_master",
        "arcane_master",
        "metallurgist_master",
        "gunsmith",
        "explorer",
        "nexus_merchant",
        "nexus_provider",
        "nexus_fisher",
        "market_foreman",
        "market_surveyor",
        "nexus_liaison",
        "district_steward",
        "market_curator",
        "nether_expeditionary"
    );

    private MarketNpcRegistryCheck() {
    }

    public static void main(String[] args) throws IOException, CommandSyntaxException {
        List<MarketNpcDefinition> definitions = MarketNpcRegistry.definitions();
        require(definitions.size() == 17, "expected exactly 17 Market NPC definitions");
        require(
            definitions.stream().map(MarketNpcDefinition::logicalId).toList().equals(EXPECTED_IDS),
            "logical IDs or their stable order differ from the expected Market registry"
        );

        Set<String> ids = new LinkedHashSet<>();
        Set<ResourceLocation> presets = new LinkedHashSet<>();
        Path nexusRoot = Path.of(requiredProperty("nexus.realms.root"));
        Path configDirectory = nexusRoot.resolve("config");
        for (MarketNpcDefinition definition : definitions) {
            require(ids.add(definition.logicalId()), "duplicate logical ID: " + definition.logicalId());
            require(presets.add(definition.preset()), "duplicate preset: " + definition.preset());
            require(
                definition.preset().equals(new ResourceLocation(
                    "easy_npc",
                    "preset/humanoid/" + definition.logicalId() + ".npc.snbt"
                )),
                "unexpected preset ResourceLocation for " + definition.logicalId()
            );

            MarketNpcPresetInspector.Inspection inspection = MarketNpcPresetInspector.inspect(
                configDirectory,
                definition
            );
            require(inspection.valid(), definition.logicalId() + ": " + inspection.error());
            require(
                definition.entityType().equals(inspection.entityType()),
                "preset EntityType mismatch for " + definition.logicalId()
            );
        }

        require(MarketNpcRegistry.find("market_foreman").isPresent(), "known ID was rejected");
        require(MarketNpcRegistry.find("unknown_market_npc").isEmpty(), "unknown ID was accepted");
        MarketNpcDefinition provider = MarketNpcRegistry.find("nexus_provider").orElseThrow();
        require(
            provider.preset().equals(new ResourceLocation("easy_npc", "preset/humanoid/nexus_provider.npc.snbt")),
            "nexus_provider must use its dedicated preset"
        );
        require(
            provider.entityType().equals(new ResourceLocation("easy_npc", "humanoid")),
            "nexus_provider must use the Easy NPC humanoid EntityType"
        );
        verifyProviderPreset(configDirectory.resolve("easy_npc").resolve(provider.preset().getPath()));
        require(
            MarketNpcRegistry.find("nether_expeditionary").orElseThrow().entityType()
                .equals(new ResourceLocation("easy_npc", "piglin")),
            "nether_expeditionary must use the Easy NPC piglin EntityType"
        );
        System.out.println("Market NPC registry checks passed: 17 definitions and presets verified");
    }

    private static void verifyProviderPreset(Path path) throws IOException, CommandSyntaxException {
        CompoundTag root = TagParser.parseTag(Files.readString(path, StandardCharsets.UTF_8));
        require(root.contains("PresetMetadata", Tag.TAG_COMPOUND), "provider preset is missing PresetMetadata");
        require(!root.contains("PresetUUID"), "provider preset contains root PresetUUID");

        CompoundTag metadata = root.getCompound("PresetMetadata");
        require(
            metadata.getString("entityTypeId").equals("easy_npc:humanoid"),
            "provider metadata EntityType differs from easy_npc:humanoid"
        );
        require(metadata.getString("name").equals("Proveedora del Nexus"), "provider metadata name changed");
        require(metadata.getString("author").equals("SpendRed23"), "provider metadata author changed");
        require(metadata.getString("category").equals("Custom"), "provider metadata category changed");
        require(metadata.getString("version").equals("1.0.0"), "provider metadata version changed");

        CompoundTag data = root.getCompound("data");
        require(data.getString("id").equals("easy_npc:humanoid"), "provider data.id differs from easy_npc:humanoid");
        require(!data.contains("PresetUUID"), "provider preset contains data.PresetUUID");
        for (String runtimeKey : List.of("UUID", "Pos", "Rotation", "Owner", "Navigation", "NoGravity")) {
            require(!data.contains(runtimeKey), "provider preset contains runtime field data." + runtimeKey);
        }
        for (String exportNoise : List.of(
            "ForgeData", "ForgeCaps", "BalmData", "CitadelData", "LeashingEntities", "LeashedByEntities", "Progression"
        )) {
            require(!data.contains(exportNoise), "provider preset contains export noise data." + exportNoise);
        }

        require(data.getString("VariantType").equals("EFE"), "provider VariantType was not preserved");
        require(data.getCompound("SkinData").getString("Name").equals("EFE"), "provider skin was not preserved");
        require(
            data.getString("CustomName").equals("{\"color\":\"#C99A64\",\"text\":\"Proveedora del Nexus\"}"),
            "provider name or color was not preserved"
        );

        ListTag hands = data.getList("HandItems", Tag.TAG_COMPOUND);
        require(hands.size() == 2, "provider must have two hand item slots");
        require(hands.getCompound(0).getString("id").equals("minecraft:bricks"), "provider main hand changed");
        require(hands.getCompound(1).getString("id").equals("minecraft:lantern"), "provider off hand changed");

        ListTag dialogs = data.getCompound("DialogData").getList("DialogDataSet", Tag.TAG_COMPOUND);
        require(dialogs.size() == 2, "provider must preserve two dialogs");
        require(
            dialogText(dialogs.getCompound(0)).equals(
                "Aquí puedes gastar tus monedas en materiales de construcción y decoración del Overworld. "
                    + "Este puesto ofrece comodidad para levantar hogares y mejorar el Nexus, pero no vende recursos "
                    + "exclusivos de dimensiones todavía selladas."
            ),
            "provider primary dialog changed"
        );
        require(
            dialogText(dialogs.getCompound(1)).equals(
                "Disponemos de piedra, madera, cristal, ladrillos, andamios, faroles y otros elementos decorativos. "
                    + "Los materiales del Nether, Aether, End y Otherside llegarán cuando sus rutas se desbloqueen."
            ),
            "provider secondary dialog changed"
        );
        require(
            buttonNames(dialogs).equals(List.of(
                "Abrir almacén", "¿Qué materiales vendes?", "Comprar materiales", "Volver"
            )),
            "provider buttons changed"
        );
        require(actionCount(dialogs) == 4, "provider dialog actions changed");
        require(
            dialogActionSignatures(dialogs).equals(List.of(
                "OPEN_TRADING_SCREEN:",
                "OPEN_NAMED_DIALOG:builder_stock",
                "OPEN_TRADING_SCREEN:",
                "OPEN_NAMED_DIALOG:default"
            )),
            "provider dialog action types or commands changed"
        );
        require(dialogActionsHaveIds(dialogs), "provider internal dialog action IDs were not preserved");
        ListTag interactionActions = data.getCompound("ActionData").getCompound("ActionEventSet")
            .getList("ON_INTERACTION", Tag.TAG_COMPOUND);
        require(interactionActions.size() == 1, "provider interaction action count changed");
        require(
            interactionActions.getCompound(0).getString("Type").equals("OPEN_DEFAULT_DIALOG"),
            "provider interaction action changed"
        );
        require(interactionActions.getCompound(0).getIntArray("Id").length == 4, "provider interaction action ID changed");

        ListTag armor = data.getList("ArmorItems", Tag.TAG_COMPOUND);
        require(armor.size() == 4, "provider armor slots changed");
        require(armorSignature(armor.getCompound(0)).equals("minecraft:leather_boots:5723991"), "provider boots changed");
        require(armorSignature(armor.getCompound(1)).equals("minecraft:leather_leggings:7361074"), "provider leggings changed");
        require(armorSignature(armor.getCompound(2)).equals("minecraft:leather_chestplate:10592673"), "provider chestplate changed");
        require(armor.getCompound(3).isEmpty(), "provider helmet slot changed");

        ListTag recipes = data.getCompound("Offers").getCompound("Recipes").getList("Recipes", Tag.TAG_COMPOUND);
        require(recipes.size() == 15, "provider must preserve exactly 15 trades");
        List<String> tradeSignatures = recipes.stream()
            .map(CompoundTag.class::cast)
            .map(MarketNpcRegistryCheck::tradeSignature)
            .toList();
        require(
            tradeSignatures.equals(List.of(
                "kubejs:nexus_bronze_coin:8>minecraft:stone_bricks:32",
                "kubejs:nexus_bronze_coin:8>minecraft:oak_planks:32",
                "kubejs:nexus_bronze_coin:8>minecraft:glass:32",
                "kubejs:nexus_bronze_coin:8>minecraft:bricks:32",
                "kubejs:nexus_bronze_coin:6>minecraft:scaffolding:16",
                "kubejs:nexus_bronze_coin:8>minecraft:lantern:8",
                "kubejs:nexus_silver_coin:1>minecraft:chain:8",
                "kubejs:nexus_bronze_coin:6>minecraft:white_wool:16",
                "kubejs:nexus_bronze_coin:6>minecraft:terracotta:16",
                "kubejs:nexus_silver_coin:1>minecraft:deepslate_tiles:16",
                "kubejs:nexus_bronze_coin:5>minecraft:flower_pot:8",
                "kubejs:nexus_bronze_coin:5>minecraft:barrel:4",
                "kubejs:nexus_silver_coin:1>minecraft:bookshelf:4",
                "kubejs:nexus_bronze_coin:5>minecraft:stonecutter:1",
                "kubejs:nexus_bronze_coin:5>minecraft:loom:1"
            )),
            "provider trade currencies, prices, products, quantities or order changed"
        );
        require(recipes.stream().map(CompoundTag.class::cast).allMatch(MarketNpcRegistryCheck::tradeDefaultsMatch),
            "provider trade limits or runtime counters changed");
    }

    private static String dialogText(CompoundTag dialog) {
        return dialog.getList("Texts", Tag.TAG_COMPOUND).getCompound(0).getString("Text");
    }

    private static List<String> buttonNames(ListTag dialogs) {
        return dialogs.stream()
            .map(CompoundTag.class::cast)
            .flatMap(dialog -> dialog.getList("Buttons", Tag.TAG_COMPOUND).stream())
            .map(CompoundTag.class::cast)
            .map(button -> button.getString("Name"))
            .toList();
    }

    private static int actionCount(ListTag dialogs) {
        return dialogs.stream()
            .map(CompoundTag.class::cast)
            .flatMap(dialog -> dialog.getList("Buttons", Tag.TAG_COMPOUND).stream())
            .map(CompoundTag.class::cast)
            .mapToInt(button -> button.getList("Actions", Tag.TAG_COMPOUND).size())
            .sum();
    }

    private static List<String> dialogActionSignatures(ListTag dialogs) {
        return dialogs.stream()
            .map(CompoundTag.class::cast)
            .flatMap(dialog -> dialog.getList("Buttons", Tag.TAG_COMPOUND).stream())
            .map(CompoundTag.class::cast)
            .flatMap(button -> button.getList("Actions", Tag.TAG_COMPOUND).stream())
            .map(CompoundTag.class::cast)
            .map(action -> action.getString("Type") + ":" + action.getString("Cmd"))
            .toList();
    }

    private static boolean dialogActionsHaveIds(ListTag dialogs) {
        return dialogs.stream()
            .map(CompoundTag.class::cast)
            .flatMap(dialog -> dialog.getList("Buttons", Tag.TAG_COMPOUND).stream())
            .map(CompoundTag.class::cast)
            .flatMap(button -> button.getList("Actions", Tag.TAG_COMPOUND).stream())
            .map(CompoundTag.class::cast)
            .allMatch(action -> action.getIntArray("Id").length == 4);
    }

    private static String armorSignature(CompoundTag armor) {
        return armor.getString("id") + ":" + armor.getCompound("tag").getCompound("display").getInt("color");
    }

    private static String tradeSignature(CompoundTag recipe) {
        CompoundTag buy = recipe.getCompound("buy");
        CompoundTag sell = recipe.getCompound("sell");
        return buy.getString("id") + ":" + buy.getByte("Count") + ">"
            + sell.getString("id") + ":" + sell.getByte("Count");
    }

    private static boolean tradeDefaultsMatch(CompoundTag recipe) {
        CompoundTag buyB = recipe.getCompound("buyB");
        return recipe.getInt("maxUses") == 64
            && buyB.getString("id").equals("minecraft:air")
            && buyB.getByte("Count") == 1
            && recipe.getInt("xp") == 0
            && recipe.getInt("uses") == 0
            && recipe.getFloat("priceMultiplier") == 0.0F
            && recipe.getInt("specialPrice") == 0
            && recipe.getInt("demand") == 0
            && recipe.getBoolean("rewardExp");
    }

    private static String requiredProperty(String name) {
        String value = System.getProperty(name);
        if (value == null || value.isBlank()) {
            throw new AssertionError("missing system property: " + name);
        }
        return value;
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
