package dev.itscarlos.nexuscore.nexus;

/**
 * Nexus Crystal V7.2 visual constants.
 *
 * V7.2 keeps the exact V7 world envelope and core, but replaces the two
 * closed 12-face shells with one sparse 8-plane crystal shell.
 */
public final class NexusCrystalVisuals {
    public static final float OUTER_RADIUS = 0.6495190528F;
    public static final float OUTER_BOTTOM_Y = 0.0F;
    public static final float OUTER_RING_Y = 0.9375F;
    public static final float OUTER_TOP_Y = 2.4375F;
    public static final float CENTER_Y = 1.21875F;

    public static final float CORE_SCALE = 0.35F;

    public static final float BOB_AMPLITUDE = 0.14F;
    public static final float BOB_RADIANS_PER_TICK = 0.062832F;

    public static final float SHELL_DEGREES_PER_TICK = 0.82F;
    public static final float CORE_DEGREES_PER_TICK = -0.55F;
    public static final float CORE_PULSE_AMPLITUDE = 0.035F;
    public static final float CORE_PULSE_RADIANS_PER_TICK = 0.11F;

    public static final double LEGACY_DISPLAY_TO_BASE_Y = 1.21875D;
    public static final double LEGACY_SPAWN_CENTER_OFFSET_Y = 2.6D;
    public static final double SPAWN_BASE_OFFSET_Y =
        LEGACY_SPAWN_CENTER_OFFSET_Y - LEGACY_DISPLAY_TO_BASE_Y;

    public static final double COMMAND_SEARCH_RADIUS = 128.0D;
    public static final double LOCAL_CLEANUP_RADIUS = 6.0D;

    private NexusCrystalVisuals() {
    }

    public static float bob(float animationTime) {
        return (float) Math.sin(animationTime * BOB_RADIANS_PER_TICK)
            * BOB_AMPLITUDE;
    }

    public static float corePulse(float animationTime) {
        return 1.0F
            + (float) Math.sin(animationTime * CORE_PULSE_RADIANS_PER_TICK)
            * CORE_PULSE_AMPLITUDE;
    }
}
