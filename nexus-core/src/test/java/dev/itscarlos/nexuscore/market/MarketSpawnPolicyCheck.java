package dev.itscarlos.nexuscore.market;

import java.util.EnumSet;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.entity.MobSpawnType;

public final class MarketSpawnPolicyCheck {
    private static final EnumSet<MobSpawnType> ALLOWED_MONSTER_SPAWNS = EnumSet.of(
        MobSpawnType.EVENT,
        MobSpawnType.COMMAND,
        MobSpawnType.SPAWN_EGG
    );

    private MarketSpawnPolicyCheck() {
    }

    public static void main(String[] args) {
        for (MobSpawnType spawnType : MobSpawnType.values()) {
            boolean expectedBlocked = !ALLOWED_MONSTER_SPAWNS.contains(spawnType);
            require(
                MarketSpawnPolicy.blocks(MobCategory.MONSTER, spawnType) == expectedBlocked,
                "Unexpected monster policy for " + spawnType
            );
            require(
                !MarketSpawnPolicy.blocks(MobCategory.CREATURE, spawnType),
                "Creature spawn must remain allowed for " + spawnType
            );
            require(
                !MarketSpawnPolicy.blocks(MobCategory.MISC, spawnType),
                "Misc spawn must remain allowed for " + spawnType
            );
        }

        System.out.println("Market hostile spawn policy checks passed");
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
