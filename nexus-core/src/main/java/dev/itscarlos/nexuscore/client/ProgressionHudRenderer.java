package dev.itscarlos.nexuscore.client;

import dev.itscarlos.nexuscore.NexusCore;
import dev.itscarlos.nexuscore.progression.EraDefinition;
import dev.itscarlos.nexuscore.progression.EraRegistry;
import dev.itscarlos.nexuscore.progression.ProgressionState;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RenderGuiEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = NexusCore.MOD_ID, value = Dist.CLIENT, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class ProgressionHudRenderer {
    private static final int HUD_WIDTH = 136;
    private static final int HUD_HEIGHT = 44;

    private ProgressionHudRenderer() {
    }

    @SubscribeEvent
    public static void onRenderGui(RenderGuiEvent.Post event) {
        Minecraft minecraft = Minecraft.getInstance();
        if (minecraft.options.hideGui) {
            return;
        }

        ProgressionState state = ClientProgressionState.get();
        if (!state.available()) {
            return;
        }

        GuiGraphics graphics = event.getGuiGraphics();
        int screenWidth = minecraft.getWindow().getGuiScaledWidth();
        int screenHeight = minecraft.getWindow().getGuiScaledHeight();
        int offsetX = ProgressionClientConfig.HUD_OFFSET_X.get();
        int offsetY = ProgressionClientConfig.HUD_OFFSET_Y.get();
        int x;
        int y;

        switch (ProgressionClientConfig.HUD_ANCHOR.get()) {
            case TOP_RIGHT -> {
                x = screenWidth - HUD_WIDTH - offsetX;
                y = offsetY;
            }
            case BOTTOM_LEFT -> {
                x = offsetX;
                y = screenHeight - HUD_HEIGHT - offsetY;
            }
            case BOTTOM_RIGHT -> {
                x = screenWidth - HUD_WIDTH - offsetX;
                y = screenHeight - HUD_HEIGHT - offsetY;
            }
            default -> {
                x = offsetX;
                y = offsetY;
            }
        }

        if (ProgressionClientConfig.SHOW_HUD.get()) {
            drawHud(graphics, minecraft.font, Math.max(2, x), Math.max(2, y), state);
        }
        drawUnlockNotification(graphics, minecraft, state);
    }

    private static void drawHud(GuiGraphics graphics, Font font, int x, int y, ProgressionState state) {
        EraDefinition era = EraRegistry.get(state.era());
        int accent = 0xFF000000 | era.color();
        graphics.fill(x, y, x + HUD_WIDTH, y + HUD_HEIGHT, 0xC8141820);
        graphics.fill(x, y, x + 3, y + HUD_HEIGHT, accent);
        graphics.fill(x + 3, y, x + HUD_WIDTH, y + 1, 0x804A5364);
        graphics.fill(x + 3, y + HUD_HEIGHT - 1, x + HUD_WIDTH, y + HUD_HEIGHT, 0x804A5364);
        renderEraIcon(graphics, era, x + 9, y + 14);
        graphics.drawString(font, "ERA " + era.roman(), x + 32, y + 6, accent, false);
        graphics.drawString(font, truncate(font, era.shortName(), 98), x + 32, y + 18, 0xFFE8EDF4, false);
        EraDefinition next = era.nextEra() >= 0 ? EraRegistry.get(era.nextEra()) : null;
        graphics.drawString(font, truncate(font, InventoryProgressionPanel.progressionStatus(state, next), 98), x + 32, y + 30, 0xFFB8C1CE, false);
    }

    private static void drawUnlockNotification(GuiGraphics graphics, Minecraft minecraft, ProgressionState state) {
        float progress = ClientProgressionState.unlockProgress();
        if (progress < 0.0F) {
            return;
        }

        float alphaFactor = progress < 0.12F ? progress / 0.12F : Math.min(1.0F, (1.0F - progress) / 0.18F);
        int alpha = Math.max(0, Math.min(255, Math.round(alphaFactor * 235.0F)));
        EraDefinition era = EraRegistry.get(state.era());
        int width = Math.min(246, minecraft.getWindow().getGuiScaledWidth() - 16);
        int x = (minecraft.getWindow().getGuiScaledWidth() - width) / 2;
        int y = Math.max(18, minecraft.getWindow().getGuiScaledHeight() / 4 - 28);
        int accent = (alpha << 24) | era.color();
        int foreground = (alpha << 24) | 0x00F4F4F4;

        graphics.fill(x, y, x + width, y + 54, (Math.min(alpha, 210) << 24) | 0x10151D);
        graphics.fill(x, y, x + width, y + 2, accent);
        graphics.fill(x, y + 52, x + width, y + 54, accent);
        renderEraIcon(graphics, era, x + 12, y + 19);
        graphics.drawCenteredString(
            minecraft.font,
            "NUEVA ERA DESBLOQUEADA",
            x + width / 2 + 8,
            y + 12,
            accent
        );
        graphics.drawCenteredString(
            minecraft.font,
            "ERA " + era.roman() + " · " + era.name(),
            x + width / 2 + 8,
            y + 31,
            foreground
        );
    }

    static void renderEraIcon(GuiGraphics graphics, EraDefinition era, int x, int y) {
        ItemStack icon = new ItemStack(BuiltInRegistries.ITEM.get(era.icon()));
        graphics.renderItem(icon, x, y);
    }

    private static String truncate(Font font, String value, int maxWidth) {
        if (font.width(value) <= maxWidth) {
            return value;
        }
        return font.plainSubstrByWidth(value, Math.max(0, maxWidth - font.width("..."))) + "...";
    }
}
