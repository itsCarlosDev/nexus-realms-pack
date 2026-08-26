package dev.itscarlos.nexuscore.market;

import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
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

    public static void main(String[] args) {
        List<MarketNpcDefinition> definitions = MarketNpcRegistry.definitions();
        require(definitions.size() == 16, "expected exactly 16 Market NPC definitions");
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
        require(
            MarketNpcRegistry.find("nether_expeditionary").orElseThrow().entityType()
                .equals(new ResourceLocation("easy_npc", "piglin")),
            "nether_expeditionary must use the Easy NPC piglin EntityType"
        );
        System.out.println("Market NPC registry checks passed: 16 definitions and presets verified");
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
