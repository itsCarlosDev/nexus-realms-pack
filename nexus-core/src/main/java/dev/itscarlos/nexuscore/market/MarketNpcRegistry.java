package dev.itscarlos.nexuscore.market;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import net.minecraft.resources.ResourceLocation;

public final class MarketNpcRegistry {
    private static final String EASY_NPC_NAMESPACE = "easy_npc";
    private static final List<MarketNpcDefinition> DEFINITIONS = List.of(
        definition("nexus_custodian", "humanoid"),
        definition("chronicler", "humanoid"),
        definition("guard_captain", "humanoid"),
        definition("warrior_master", "humanoid"),
        definition("arcane_master", "humanoid"),
        definition("metallurgist_master", "humanoid"),
        definition("gunsmith", "humanoid"),
        definition("explorer", "humanoid"),
        definition("nexus_merchant", "humanoid"),
        definition("nexus_provider", "humanoid"),
        definition("nexus_fisher", "humanoid"),
        definition("market_foreman", "humanoid"),
        definition("market_surveyor", "humanoid"),
        definition("nexus_liaison", "humanoid"),
        definition("district_steward", "humanoid"),
        definition("market_curator", "humanoid"),
        definition("nether_expeditionary", "piglin")
    );
    private static final Map<String, MarketNpcDefinition> BY_ID = createIndex(DEFINITIONS);

    private MarketNpcRegistry() {
    }

    public static List<MarketNpcDefinition> definitions() {
        return DEFINITIONS;
    }

    public static Optional<MarketNpcDefinition> find(String logicalId) {
        return Optional.ofNullable(BY_ID.get(logicalId));
    }

    private static MarketNpcDefinition definition(String logicalId, String entityTypePath) {
        return new MarketNpcDefinition(
            logicalId,
            new ResourceLocation(EASY_NPC_NAMESPACE, "preset/humanoid/" + logicalId + ".npc.snbt"),
            new ResourceLocation(EASY_NPC_NAMESPACE, entityTypePath)
        );
    }

    private static Map<String, MarketNpcDefinition> createIndex(List<MarketNpcDefinition> definitions) {
        Map<String, MarketNpcDefinition> byId = new LinkedHashMap<>();
        Map<ResourceLocation, String> byPreset = new LinkedHashMap<>();
        for (MarketNpcDefinition definition : definitions) {
            if (byId.putIfAbsent(definition.logicalId(), definition) != null) {
                throw new IllegalStateException("Duplicate Market NPC logical ID: " + definition.logicalId());
            }
            String previousId = byPreset.putIfAbsent(definition.preset(), definition.logicalId());
            if (previousId != null) {
                throw new IllegalStateException(
                    "Duplicate Market NPC preset " + definition.preset() + " for " + previousId + " and "
                        + definition.logicalId()
                );
            }
        }
        return Collections.unmodifiableMap(byId);
    }
}
