package dev.itscarlos.nexuscore.nexus;

/**
 * Nexus Crystal V8.1 visual constants.
 *
 * The shell follows the Botania Pylon Crystal technique:
 * 8 ultra-thin single-face JSON elements, baked by Minecraft, CUTOUT render,
 * global Y rotation and an animated texture.
 */
public final class NexusCrystalVisuals {
    public static final float OUTER_RADIUS = 0.6495190528F;
    public static final float OUTER_BOTTOM_Y = 0.0F;
    public static final float OUTER_TOP_Y = 2.4375F;
    public static final float CENTER_Y = 1.21875F;

    public static final float CORE_SCALE = 0.35F;

    // Original tall-model centre/dimensions in Minecraft block units.
    public static final float SOURCE_MODEL_CENTER_Y = 12.63F / 16.0F;
    public static final float SOURCE_MODEL_CENTER_XZ = 0.5F;
    public static final float SOURCE_MODEL_WIDTH = 7.2F / 16.0F;
    public static final float SOURCE_MODEL_HEIGHT =
        (22.00726F - 3.25274F) / 16.0F;

    // Map the proven source proportions into the existing V7 world envelope.
    public static final float SHELL_SCALE_XZ =
        (OUTER_RADIUS * 2.0F) / SOURCE_MODEL_WIDTH;
    public static final float SHELL_SCALE_Y =
        (OUTER_TOP_Y - OUTER_BOTTOM_Y) / SOURCE_MODEL_HEIGHT;

    public static final float BOB_AMPLITUDE = 0.14F;
    public static final float BOB_RADIANS_PER_TICK = 0.062832F;

    // Botania Pylon Crystal default is 1 degree per tick.
    public static final float SHELL_DEGREES_PER_TICK = 1.0F;

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
