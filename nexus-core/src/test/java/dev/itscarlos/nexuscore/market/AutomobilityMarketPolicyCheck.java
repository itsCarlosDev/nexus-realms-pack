package dev.itscarlos.nexuscore.market;

import net.minecraft.core.BlockPos;
import net.minecraft.world.phys.Vec3;

public final class AutomobilityMarketPolicyCheck {
    private AutomobilityMarketPolicyCheck() {
    }

    public static void main(String[] args) {
        Vec3 centered = new Vec3(10.5D, 64.0D, 20.5D);

        requireTouches(
            "harvester center",
            centered,
            0.25D,
            new BlockPos(10, 64, 20)
        );
        requireTouches(
            "harvester far footprint corner",
            centered,
            0.25D,
            new BlockPos(11, 64, 21)
        );
        requireMisses(
            "harvester outside footprint",
            centered,
            0.25D,
            new BlockPos(12, 64, 21)
        );
        requireTouches(
            "plow lower Y",
            centered,
            -0.25D,
            new BlockPos(10, 63, 20)
        );
        requireMisses(
            "plow wrong Y",
            centered,
            -0.25D,
            new BlockPos(10, 64, 20)
        );
        requireTouches(
            "negative coordinate flooring",
            new Vec3(-0.25D, 70.0D, -0.25D),
            0.25D,
            new BlockPos(-1, 70, -1)
        );

        System.out.println(
            "Automobility market footprint checks passed: 6/6"
        );
    }

    private static void requireTouches(
        String label,
        Vec3 origin,
        double yOffset,
        BlockPos protectedPos
    ) {
        if (!AutomobilityMarketPolicy.touchesProtectedFootprint(
            origin,
            yOffset,
            protectedPos::equals
        )) {
            throw new AssertionError(label + " should touch");
        }
    }

    private static void requireMisses(
        String label,
        Vec3 origin,
        double yOffset,
        BlockPos protectedPos
    ) {
        if (AutomobilityMarketPolicy.touchesProtectedFootprint(
            origin,
            yOffset,
            protectedPos::equals
        )) {
            throw new AssertionError(label + " should miss");
        }
    }
}
