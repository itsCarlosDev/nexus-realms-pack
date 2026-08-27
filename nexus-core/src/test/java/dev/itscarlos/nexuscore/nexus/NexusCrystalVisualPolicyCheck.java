package dev.itscarlos.nexuscore.nexus;

public final class NexusCrystalVisualPolicyCheck {
    private NexusCrystalVisualPolicyCheck() {
    }

    public static void main(String[] args) {
        assertNear(
            "height",
            2.4375F,
            NexusCrystalVisuals.OUTER_TOP_Y
                - NexusCrystalVisuals.OUTER_BOTTOM_Y,
            0.000001F
        );

        assertNear(
            "center",
            1.21875F,
            NexusCrystalVisuals.CENTER_Y,
            0.000001F
        );

        assertNear(
            "legacy spawn visual center",
            2.6D,
            NexusCrystalVisuals.SPAWN_BASE_OFFSET_Y
                + NexusCrystalVisuals.LEGACY_DISPLAY_TO_BASE_Y,
            0.000001D
        );

        assertNear(
            "inner shell scale",
            0.90F,
            NexusCrystalVisuals.INNER_SHELL_SCALE,
            0.000001F
        );

        assertNear(
            "inner shell offset",
            18.0F,
            NexusCrystalVisuals.INNER_SHELL_ROTATION_OFFSET_DEGREES,
            0.000001F
        );

        if (NexusCrystalVisuals.CORE_SCALE < 0.30F
            || NexusCrystalVisuals.CORE_SCALE > 0.40F) {
            throw new AssertionError("CORE_SCALE outside safe V7 range.");
        }

        if (NexusCrystalVisuals.OUTER_RADIUS <= 0.60F) {
            throw new AssertionError(
                "Outer shell radius unexpectedly small."
            );
        }

        System.out.println(
            "Nexus Crystal V7.1 policy OK: exact V7 envelope, "
                + "double CUTOUT shell 100%/90%, 18deg offset, 35% core."
        );
    }

    private static void assertNear(
        String name,
        float expected,
        float actual,
        float epsilon
    ) {
        if (Math.abs(expected - actual) > epsilon) {
            throw new AssertionError(
                name + ": expected " + expected + " but got " + actual
            );
        }
    }

    private static void assertNear(
        String name,
        double expected,
        double actual,
        double epsilon
    ) {
        if (Math.abs(expected - actual) > epsilon) {
            throw new AssertionError(
                name + ": expected " + expected + " but got " + actual
            );
        }
    }
}
