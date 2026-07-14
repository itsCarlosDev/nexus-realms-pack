package dev.itscarlos.nexuscore.client;

import net.minecraftforge.common.ForgeConfigSpec;

public final class ProgressionClientConfig {
    public enum HudAnchor {
        TOP_LEFT,
        TOP_RIGHT,
        BOTTOM_LEFT,
        BOTTOM_RIGHT
    }

    private static final ForgeConfigSpec.Builder BUILDER = new ForgeConfigSpec.Builder();

    public static final ForgeConfigSpec.BooleanValue SHOW_HUD = BUILDER
        .comment("Show the compact Nexus era HUD.")
        .define("progressionHud.enabled", true);
    public static final ForgeConfigSpec.EnumValue<HudAnchor> HUD_ANCHOR = BUILDER
        .comment("Screen anchor for the Nexus era HUD.")
        .defineEnum("progressionHud.anchor", HudAnchor.TOP_LEFT);
    public static final ForgeConfigSpec.IntValue HUD_OFFSET_X = BUILDER
        .comment("Horizontal distance from the selected anchor.")
        .defineInRange("progressionHud.offsetX", 8, 0, 10000);
    public static final ForgeConfigSpec.IntValue HUD_OFFSET_Y = BUILDER
        .comment("Vertical distance from the selected anchor. The default leaves room for navigation HUDs.")
        .defineInRange("progressionHud.offsetY", 48, 0, 10000);

    public static final ForgeConfigSpec SPEC = BUILDER.build();

    private ProgressionClientConfig() {
    }
}
