package dev.itscarlos.nexuscore.market;

import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.entity.MobSpawnType;

final class MarketSpawnPolicy {
    private MarketSpawnPolicy() {
    }

    static boolean blocks(MobCategory category, MobSpawnType spawnType) {
        return category == MobCategory.MONSTER
            && spawnType != MobSpawnType.EVENT
            && spawnType != MobSpawnType.COMMAND
            && spawnType != MobSpawnType.SPAWN_EGG;
    }
}
