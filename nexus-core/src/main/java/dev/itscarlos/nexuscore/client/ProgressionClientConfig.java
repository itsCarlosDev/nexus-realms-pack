package dev.itscarlos.nexuscore.client;

import net.minecraftforge.common.ForgeConfigSpec;

public final class ProgressionClientConfig {
    public enum HudAnchor {
        TOP_LEFT,
        TOP_RIGHT,
        BOTTOM_LEFT,
        BOTTOM_RIGHT
    }

    public enum HudMode {
        NORMAL,
        COMPACT
    }

    public enum PanelScale {
        AUTO
    }

    public enum PreferredPosition {
        AUTO,
        LEFT,
        TOP
    }

    private static final ForgeConfigSpec.Builder BUILDER = new ForgeConfigSpec.Builder();

    public static final ForgeConfigSpec.BooleanValue SHOW_INVENTORY_TAB = BUILDER
        .comment("Show the Nexus progression tab attached to the inventory.")
        .define("progressionInventory.showTab", true);
    public static final ForgeConfigSpec.BooleanValue PANEL_OPEN_BY_DEFAULT = BUILDER
        .comment("Open the compact progression panel when the first inventory of the session is opened.")
        .define("progressionInventory.openByDefault", false);
    public static final ForgeConfigSpec.BooleanValue REMEMBER_PANEL_STATE = BUILDER
        .comment("Remember the open/closed panel state while Minecraft remains running.")
        .define("progressionInventory.rememberSessionState", true);
    public static final ForgeConfigSpec.EnumValue<PanelScale> PANEL_SCALE = BUILDER
        .comment("Panel scale. AUTO follows Minecraft GUI scale and available inventory space.")
        .defineEnum("progressionInventory.scale", PanelScale.AUTO);
    public static final ForgeConfigSpec.EnumValue<PreferredPosition> PREFERRED_POSITION = BUILDER
        .comment("Preferred tab position. The panel only opens on the left when that space is free.")
        .defineEnum("progressionInventory.preferredPosition", PreferredPosition.AUTO);

    // Deprecated compatibility keys. They are intentionally ignored by the renderer so existing
    // client configs remain readable without restoring the removed persistent gameplay HUD.
    public static final ForgeConfigSpec.BooleanValue SHOW_HUD = BUILDER
        .comment("Deprecated: the persistent progression HUD was removed in Nexus Core 0.4.1.")
        .define("progressionHud.enabled", false);
    public static final ForgeConfigSpec.EnumValue<HudAnchor> HUD_ANCHOR = BUILDER
        .comment("Deprecated compatibility value.")
        .defineEnum("progressionHud.anchor", HudAnchor.TOP_LEFT);
    public static final ForgeConfigSpec.EnumValue<HudMode> HUD_MODE = BUILDER
        .comment("Deprecated compatibility value.")
        .defineEnum("progressionHud.mode", HudMode.NORMAL);
    public static final ForgeConfigSpec.IntValue HUD_OFFSET_X = BUILDER
        .comment("Deprecated compatibility value.")
        .defineInRange("progressionHud.offsetX", 8, 0, 10000);
    public static final ForgeConfigSpec.IntValue HUD_OFFSET_Y = BUILDER
        .comment("Deprecated compatibility value.")
        .defineInRange("progressionHud.offsetY", 48, 0, 10000);

    public static final ForgeConfigSpec SPEC = BUILDER.build();

    private ProgressionClientConfig() {
    }
}
