package dev.itscarlos.nexuscore.client;

import dev.itscarlos.nexuscore.NexusCore;
import dev.itscarlos.nexuscore.progression.EraDefinition;
import dev.itscarlos.nexuscore.progression.EraRegistry;
import dev.itscarlos.nexuscore.progression.ProgressionState;
import java.util.List;
import java.util.Map;
import java.util.WeakHashMap;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.inventory.InventoryScreen;
import net.minecraft.network.chat.Component;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ScreenEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = NexusCore.MOD_ID, value = Dist.CLIENT, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class InventoryProgressionPanel {
    private static final int FULL_WIDTH = 154;
    private static final int FULL_HEIGHT = 220;
    private static final int COMPACT_HEIGHT = 74;
    private static final Map<InventoryScreen, Button> QUEST_BUTTONS = new WeakHashMap<>();

    private InventoryProgressionPanel() {
    }

    @SubscribeEvent
    public static void onScreenInit(ScreenEvent.Init.Post event) {
        if (!(event.getScreen() instanceof InventoryScreen screen)) {
            return;
        }

        Button button = Button.builder(Component.literal("Progresión Global · FTB Quests"), ignored -> {
        }).bounds(0, 0, 138, 20).build();
        button.active = false;
        button.visible = false;
        event.addListener(button);
        QUEST_BUTTONS.put(screen, button);
    }

    @SubscribeEvent
    public static void onScreenRender(ScreenEvent.Render.Post event) {
        if (!(event.getScreen() instanceof InventoryScreen screen)) {
            return;
        }

        ProgressionState state = ClientProgressionState.get();
        Button button = QUEST_BUTTONS.get(screen);
        if (!state.available()) {
            if (button != null) button.visible = false;
            return;
        }

        int guiLeft = screen.getGuiLeft();
        int guiTop = screen.getGuiTop();
        int guiWidth = screen.getXSize();
        int guiHeight = screen.getYSize();
        boolean full = guiLeft >= FULL_WIDTH + 12;
        int width = full ? FULL_WIDTH : Math.min(guiWidth, screen.width - 8);
        int height = full ? FULL_HEIGHT : COMPACT_HEIGHT;
        int x = full ? guiLeft - width - 6 : (screen.width - width) / 2;
        int y;

        if (full) {
            y = Math.max(4, guiTop - (height - guiHeight) / 2);
        } else {
            int below = guiTop + guiHeight + 4;
            y = below + height <= screen.height - 4 ? below : Math.max(4, guiTop - height - 4);
        }

        EraDefinition era = EraRegistry.get(state.era());
        if (full) {
            renderFull(event.getGuiGraphics(), Minecraft.getInstance().font, x, y, width, height, era, state);
        } else {
            renderCompact(event.getGuiGraphics(), Minecraft.getInstance().font, x, y, width, height, era, state);
        }
        positionQuestButton(button, x, y, width, height, full);
        if (button != null && button.visible) {
            button.render(event.getGuiGraphics(), event.getMouseX(), event.getMouseY(), event.getPartialTick());
        }
    }

    private static void renderFull(
        GuiGraphics graphics,
        Font font,
        int x,
        int y,
        int width,
        int height,
        EraDefinition era,
        ProgressionState state
    ) {
        drawPanel(graphics, x, y, width, height, era.color());
        ProgressionHudRenderer.renderEraIcon(graphics, era, x + 10, y + 10);
        graphics.drawString(font, "ERA " + era.roman(), x + 34, y + 9, 0xFF000000 | era.color(), false);
        graphics.drawString(font, fit(font, era.name(), width - 44), x + 34, y + 21, 0xFFF1F3F7, false);

        List<net.minecraft.util.FormattedCharSequence> description = font.split(
            Component.literal(era.description()), width - 20
        );
        int lineY = y + 39;
        for (int index = 0; index < Math.min(2, description.size()); index++) {
            graphics.drawString(font, description.get(index), x + 10, lineY, 0xFFBCC4D0, false);
            lineY += 10;
        }

        int dataY = y + 64;
        graphics.drawString(font, "Día actual: " + formatDay(state.worldDay()), x + 10, dataY, 0xFFE0E5EC, false);
        graphics.drawString(font, "Desbloqueada: " + formatDay(state.unlockDay()), x + 10, dataY + 12, 0xFFE0E5EC, false);
        String horde = state.hordeActive()
            ? "Horda activa · " + state.participantCount() + " participantes"
            : "Sin horda activa";
        graphics.drawString(font, fit(font, horde, width - 20), x + 10, dataY + 24, state.hordeActive() ? 0xFFFF6B57 : 0xFF91A0B2, false);
        graphics.drawString(font, "Próxima horda: " + formatDay(state.nextHordeDay()), x + 10, dataY + 36, 0xFFE0E5EC, false);

        EraDefinition next = era.nextEra() >= 0 ? EraRegistry.get(era.nextEra()) : null;
        graphics.drawString(font, "Siguiente era:", x + 10, dataY + 55, 0xFF91A0B2, false);
        graphics.drawString(font, next == null ? "Progresión completada" : next.name(), x + 10, dataY + 67, 0xFFF1F3F7, false);
        if (next != null) {
            graphics.drawString(font, "Día mínimo: " + next.minimumDay(), x + 10, dataY + 79, 0xFFD4DAE3, false);
        }
        graphics.drawString(font, fit(font, progressionStatus(state, next), width - 20), x + 10, dataY + 94, statusColor(state, next), false);
    }

    private static void renderCompact(
        GuiGraphics graphics,
        Font font,
        int x,
        int y,
        int width,
        int height,
        EraDefinition era,
        ProgressionState state
    ) {
        drawPanel(graphics, x, y, width, height, era.color());
        ProgressionHudRenderer.renderEraIcon(graphics, era, x + 9, y + 8);
        graphics.drawString(font, fit(font, "ERA " + era.roman() + " · " + era.name(), width - 40), x + 31, y + 8, 0xFF000000 | era.color(), false);
        EraDefinition next = era.nextEra() >= 0 ? EraRegistry.get(era.nextEra()) : null;
        graphics.drawString(font, fit(font, progressionStatus(state, next), width - 40), x + 31, y + 22, statusColor(state, next), false);
        String horde = state.hordeActive() ? "Horda activa" : "Próxima horda: " + formatDay(state.nextHordeDay());
        graphics.drawString(font, fit(font, horde, width - 40), x + 31, y + 38, 0xFFD4DAE3, false);
    }

    static String progressionStatus(ProgressionState state, EraDefinition next) {
        if (next == null) return "Progresión global completada";
        if (state.milestoneCompleted() < next.id()) return "Hito global pendiente de completar";
        if (state.worldDay() < next.minimumDay()) return "Hito completado · espera día " + next.minimumDay();
        return "Preparado para avanzar";
    }

    private static int statusColor(ProgressionState state, EraDefinition next) {
        if (next == null) return 0xFF8BE39A;
        if (state.milestoneCompleted() < next.id()) return 0xFF91A0B2;
        return state.worldDay() < next.minimumDay() ? 0xFFFFD166 : 0xFF8BE39A;
    }

    private static void drawPanel(GuiGraphics graphics, int x, int y, int width, int height, int color) {
        graphics.fill(x, y, x + width, y + height, 0xEE11161E);
        graphics.fill(x, y, x + 3, y + height, 0xFF000000 | color);
        graphics.fill(x + 3, y, x + width, y + 1, 0xFF3E4858);
        graphics.fill(x + 3, y + height - 1, x + width, y + height, 0xFF3E4858);
    }

    private static void positionQuestButton(Button button, int x, int y, int width, int height, boolean full) {
        if (button == null) return;
        button.visible = full;
        button.active = false;
        button.setX(x + (width - button.getWidth()) / 2);
        button.setY(y + height - 25);
    }

    private static String formatDay(int day) {
        return day < 0 ? "No programado" : "Día " + day;
    }

    private static String fit(Font font, String text, int width) {
        if (font.width(text) <= width) return text;
        return font.plainSubstrByWidth(text, Math.max(0, width - font.width("..."))) + "...";
    }
}
