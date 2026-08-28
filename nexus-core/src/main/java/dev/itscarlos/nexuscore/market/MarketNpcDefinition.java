package dev.itscarlos.nexuscore.market;

import net.minecraft.resources.ResourceLocation;

public record MarketNpcDefinition(
    String logicalId,
    ResourceLocation preset,
    ResourceLocation entityType
) {
    public MarketNpcDefinition {
        if (logicalId == null || !logicalId.matches("[a-z0-9_]+")) {
            throw new IllegalArgumentException("Invalid Market NPC logical ID: " + logicalId);
        }
        if (preset == null || entityType == null) {
            throw new IllegalArgumentException("Market NPC preset and entity type are required for " + logicalId);
        }
    }
}
