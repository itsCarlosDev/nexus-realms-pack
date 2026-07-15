package dev.itscarlos.nexuscore.client;

import dev.itscarlos.nexuscore.NexusCore;
import dev.itscarlos.nexuscore.progression.EraDefinition;
import dev.itscarlos.nexuscore.progression.EraRegistry;
import dev.itscarlos.nexuscore.progression.ProgressionState;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RenderGuiEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = NexusCore.MOD_ID, value = Dist.CLIENT, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class ProgressionHudRenderer {
    private static final int STONE_DARK = 0xF02A2A2E;
    private static final int OBSIDIAN = 0xF0141416;
    private static final int ANCIENT_BRONZE = 0xFFB5824C;

    private ProgressionHudRenderer() {
    }

    @SubscribeEvent
    public static void onRenderGui(RenderGuiEvent.Post event) {
        Minecraft minecraft = Minecraft.getInstance();
        if (minecraft.options.hideGui) {
            return;
        }

        ProgressionState state = ClientProgressionState.get();
        if (state.available()) {
            drawUnlockNotification(event.getGuiGraphics(), minecraft, state);
        }
    }

    static void drawLithicPanel(GuiGraphics graphics, int x, int y, int width, int height, int eraColor) {
        int accent = 0xFF000000 | eraColor;
        graphics.fill(x + 6, y, x + width - 4, y + 2, ANCIENT_BRONZE);
        graphics.fill(x + 3, y + 2, x + width - 2, y + height - 3, STONE_DARK);
        graphics.fill(x + 1, y + 7, x + width, y + height - 9, STONE_DARK);
        graphics.fill(x + 5, y + 4, x + width - 5, y + height - 5, OBSIDIAN);
        graphics.fill(x + 3, y + height - 3, x + width - 8, y + height - 1, ANCIENT_BRONZE);
        graphics.fill(x + 1, y + 12, x + 3, y + height - 13, ANCIENT_BRONZE);
        graphics.fill(x + width - 12, y + 2, x + width - 10, y + 9, accent);
        graphics.fill(x + width - 15, y + 8, x + width - 11, y + 10, accent);
        graphics.fill(x + width - 17, y + 9, x + width - 15, y + 15, accent);
        graphics.fill(x + 6, y + height - 5, x + 22, y + height - 3, accent);
    }

    static void drawLithicButton(
        GuiGraphics graphics,
        int x,
        int y,
        int width,
        int height,
        int eraColor,
        boolean active
    ) {
        int border = active ? 0xFF000000 | eraColor : ANCIENT_BRONZE;
        graphics.fill(x, y, x + width, y + height, border);
        graphics.fill(x + 1, y + 1, x + width - 1, y + height - 1, OBSIDIAN);
    }

    private static void drawUnlockNotification(GuiGraphics graphics, Minecraft minecraft, ProgressionState state) {
        float progress = ClientProgressionState.unlockProgress();
        if (progress < 0.0F) {
            return;
        }

        float alphaFactor = progress < 0.12F ? progress / 0.12F : Math.min(1.0F, (1.0F - progress) / 0.18F);
        int alpha = Math.max(0, Math.min(255, Math.round(alphaFactor * 255.0F)));
        EraDefinition era = EraRegistry.get(state.era());
        int width = Math.min(246, minecraft.getWindow().getGuiScaledWidth() - 16);
        int x = (minecraft.getWindow().getGuiScaledWidth() - width) / 2;
        int y = Math.max(18, minecraft.getWindow().getGuiScaledHeight() / 4 - 28);
        int accent = (alpha << 24) | era.color();
        int foreground = (alpha << 24) | 0x00E6F2F5;

        drawLithicPanel(graphics, x, y, width, 54, era.color());
        graphics.fill(x + 8, y + 3, x + width - 8, y + 4, accent);
        renderEraIcon(graphics, era, x + 12, y + 19);
        graphics.drawCenteredString(minecraft.font, "NUEVA ERA DESBLOQUEADA", x + width / 2 + 8, y + 12, accent);
        graphics.drawCenteredString(minecraft.font, "ERA " + era.roman() + " \u00B7 " + era.name(), x + width / 2 + 8, y + 31, foreground);
    }

    static void renderEraIcon(GuiGraphics graphics, EraDefinition era, int x, int y) {
        ItemStack icon = new ItemStack(BuiltInRegistries.ITEM.get(era.icon()));
        graphics.renderItem(icon, x, y);
    }
}
