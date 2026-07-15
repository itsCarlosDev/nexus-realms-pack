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
import net.minecraft.client.gui.components.AbstractButton;
import net.minecraft.client.gui.narration.NarrationElementOutput;
import net.minecraft.client.gui.screens.inventory.InventoryScreen;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ScreenEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = NexusCore.MOD_ID, value = Dist.CLIENT, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class InventoryProgressionPanel {
    private static final int MIN_PANEL_WIDTH = 126;
    private static final int MAX_PANEL_WIDTH = 136;
    private static final int PANEL_HEIGHT = 166;
    private static final int PANEL_GAP = 4;
    private static final int TAB_WIDTH = 20;
    private static final int TAB_HEIGHT = 22;
    private static final int QUEST_SIZE = 18;
    private static final int FROST_WHITE = 0xFFE6F2F5;
    private static final int MUTED_TEXT = 0xFFB8C1CA;
    private static final Map<InventoryScreen, ScreenState> SCREEN_STATES = new WeakHashMap<>();
    private static boolean sessionInitialized;
    private static boolean sessionOpen;

    private InventoryProgressionPanel() {
    }

    @SubscribeEvent
    public static void onScreenInit(ScreenEvent.Init.Post event) {
        if (!(event.getScreen() instanceof InventoryScreen screen)) {
            return;
        }

        boolean initialOpen;
        if (ProgressionClientConfig.REMEMBER_PANEL_STATE.get()) {
            if (!sessionInitialized) {
                sessionOpen = ProgressionClientConfig.PANEL_OPEN_BY_DEFAULT.get();
                sessionInitialized = true;
            }
            initialOpen = sessionOpen;
        } else {
            initialOpen = ProgressionClientConfig.PANEL_OPEN_BY_DEFAULT.get();
        }

        ScreenState state = new ScreenState(initialOpen);
        event.addListener(state.tab);
        event.addListener(state.quest);
        SCREEN_STATES.put(screen, state);
    }

    @SubscribeEvent
    public static void onScreenRenderPre(ScreenEvent.Render.Pre event) {
        if (!(event.getScreen() instanceof InventoryScreen screen)) {
            return;
        }

        ScreenState screenState = SCREEN_STATES.get(screen);
        ProgressionState progression = ClientProgressionState.get();
        if (screenState == null) {
            return;
        }

        boolean enabled = ProgressionClientConfig.SHOW_INVENTORY_TAB.get() && progression.available();
        screenState.layout = resolveLayout(screen);
        screenState.tab.visible = enabled;
        screenState.tab.active = enabled;
        screenState.tab.setX(screenState.tabX());
        screenState.tab.setY(screenState.layout.tabY());
        screenState.quest.visible = enabled && screenState.isPanelVisible();
        screenState.quest.active = false;
        screenState.quest.setX(screenState.layout.panelX() + screenState.layout.panelWidth() - QUEST_SIZE - 7);
        screenState.quest.setY(screenState.layout.panelY() + screenState.layout.panelHeight() - QUEST_SIZE - 7);
    }

    @SubscribeEvent
    public static void onScreenRenderPost(ScreenEvent.Render.Post event) {
        if (!(event.getScreen() instanceof InventoryScreen screen)) {
            return;
        }

        ScreenState screenState = SCREEN_STATES.get(screen);
        ProgressionState state = ClientProgressionState.get();
        if (screenState == null || !screenState.tab.visible || !state.available()) {
            return;
        }

        GuiGraphics graphics = event.getGuiGraphics();
        Font font = Minecraft.getInstance().font;
        EraDefinition era = EraRegistry.get(state.era());

        if (screenState.isPanelVisible()) {
            renderPanel(graphics, font, screenState.layout, era, state);
            screenState.quest.drawManual(graphics, era);
        }
        screenState.tab.drawManual(graphics, era, screenState.isPanelVisible());

        if (screenState.tab.isMouseOver(event.getMouseX(), event.getMouseY())) {
            graphics.renderComponentTooltip(
                font,
                List.of(
                    Component.literal("Progresi\u00F3n del Nexus"),
                    Component.literal("Era " + era.roman() + " \u00B7 " + era.name())
                ),
                event.getMouseX(),
                event.getMouseY()
            );
        } else if (screenState.quest.visible && screenState.quest.isMouseOver(event.getMouseX(), event.getMouseY())) {
            graphics.renderTooltip(
                font,
                Component.literal("Abre FTB Quests para consultar la progresi\u00F3n"),
                event.getMouseX(),
                event.getMouseY()
            );
        }
    }

    private static Layout resolveLayout(InventoryScreen screen) {
        int guiLeft = screen.getGuiLeft();
        int guiTop = screen.getGuiTop();
        int guiWidth = screen.getXSize();
        int guiHeight = screen.getYSize();
        boolean recipeBookVisible = screen.getRecipeBookComponent().isVisible();
        int availablePanelWidth = guiLeft - PANEL_GAP - TAB_WIDTH - 2;
        boolean leftSpace = availablePanelWidth >= MIN_PANEL_WIDTH;
        boolean panelAvailable = leftSpace && !recipeBookVisible;
        boolean preferTop = ProgressionClientConfig.PREFERRED_POSITION.get()
            == ProgressionClientConfig.PreferredPosition.TOP;
        boolean tabOnLeft = panelAvailable && !preferTop;
        int panelWidth = leftSpace ? Math.min(MAX_PANEL_WIDTH, availablePanelWidth) : MIN_PANEL_WIDTH;
        int closedTabX = tabOnLeft ? guiLeft - TAB_WIDTH : guiLeft + guiWidth - TAB_WIDTH - 4;
        int tabY = tabOnLeft ? guiTop + 5 : Math.max(2, guiTop - TAB_HEIGHT + 2);
        int height = Math.min(PANEL_HEIGHT, guiHeight);
        int panelX = guiLeft - panelWidth - PANEL_GAP;
        int openTabX = tabOnLeft ? panelX - TAB_WIDTH : closedTabX;
        int panelY = guiTop + Math.max(0, (guiHeight - height) / 2);
        return new Layout(closedTabX, openTabX, tabY, panelX, panelY, panelWidth, height, panelAvailable);
    }

    private static void renderPanel(
        GuiGraphics graphics,
        Font font,
        Layout layout,
        EraDefinition era,
        ProgressionState state
    ) {
        int x = layout.panelX();
        int y = layout.panelY();
        int width = layout.panelWidth();
        int height = layout.panelHeight();
        int innerWidth = width - 16;
        int accent = 0xFF000000 | era.color();
        EraDefinition next = era.nextEra() >= 0 ? EraRegistry.get(era.nextEra()) : null;

        ProgressionHudRenderer.drawLithicPanel(graphics, x, y, width, height, era.color());
        graphics.enableScissor(x + 6, y + 5, x + width - 6, y + height - 5);
        ProgressionHudRenderer.renderEraIcon(graphics, era, x + 8, y + 7);
        drawLine(graphics, font, "ERA " + era.roman(), x + 32, y + 10, accent);
        drawTwoLineName(graphics, font, era.name(), x + 8, y + 28, innerWidth, FROST_WHITE);
        graphics.fill(x + 8, y + 52, x + width - 8, y + 53, 0xFFB5824C);

        drawLine(
            graphics,
            font,
            state.campaignStarted()
                ? "Campa\u00F1a: D\u00EDa " + state.campaignDay() + "/" + state.campaignLength()
                : "Campa\u00F1a: no iniciada",
            x + 8,
            y + 60,
            FROST_WHITE
        );
        drawLine(graphics, font, milestoneLabel(state, next), x + 8, y + 73, statusColor(state, next));
        drawLine(graphics, font, hordeLabel(state), x + 8, y + 86, state.hordeActive() ? 0xFFD91A2A : MUTED_TEXT);
        graphics.fill(x + 8, y + 100, x + width - 8, y + 101, 0xFF5A4735);

        drawLine(graphics, font, "Siguiente:", x + 8, y + 108, MUTED_TEXT);
        drawTwoLineName(graphics, font, next == null ? "Era completada" : next.name(), x + 8, y + 120, innerWidth, FROST_WHITE);
        if (next != null) {
            drawLine(graphics, font, "D\u00EDa m\u00EDnimo: " + next.minimumDay(), x + 8, y + 147, MUTED_TEXT);
        }
        graphics.disableScissor();
    }

    static String progressionStatus(ProgressionState state, EraDefinition next) {
        if (next == null) return "Progresi\u00F3n global completada";
        if (state.milestoneCompleted() < next.id()) return "Hito global pendiente de completar";
        if (!state.campaignStarted()) return "Hito completado \u00B7 espera inicio";
        if (state.campaignDay() < next.minimumDay()) return "Hito completado \u00B7 espera d\u00EDa " + next.minimumDay();
        return "Preparado para avanzar";
    }

    private static String milestoneLabel(ProgressionState state, EraDefinition next) {
        if (next == null) return "Hito: completado";
        if (state.milestoneCompleted() < next.id()) {
            return state.era() == 0 && next.id() == 1 ? "Hito inicial pendiente" : "Hito: pendiente";
        }
        if (!state.campaignStarted()) return "Hito: espera inicio";
        if (state.campaignDay() < next.minimumDay()) return "Hito: espera d\u00EDa " + next.minimumDay();
        return "Hito: listo";
    }

    private static String hordeLabel(ProgressionState state) {
        if (state.hordeActive()) return "Horda: activa";
        return state.nextHordeDay() < 0 ? "Horda: no programada" : "Pr\u00F3x. horda: d\u00EDa " + state.nextHordeDay();
    }

    private static int statusColor(ProgressionState state, EraDefinition next) {
        if (next == null) return 0xFF7EDC91;
        if (state.milestoneCompleted() < next.id()) return MUTED_TEXT;
        if (!state.campaignStarted()) return 0xFFFFBF00;
        return state.campaignDay() < next.minimumDay() ? 0xFFFFBF00 : 0xFF7EDC91;
    }

    private static void drawLine(GuiGraphics graphics, Font font, String text, int x, int y, int color) {
        graphics.drawString(font, text, x, y, color, false);
    }

    private static void drawTwoLineName(
        GuiGraphics graphics,
        Font font,
        String text,
        int x,
        int y,
        int width,
        int color
    ) {
        List<String> lines = splitName(font, text, width);
        graphics.drawString(font, lines.get(0), x, y, color, false);
        if (lines.size() > 1) {
            graphics.drawString(font, lines.get(1), x, y + 11, color, false);
        }
    }

    private static List<String> splitName(Font font, String text, int width) {
        if (font.width(text) <= width) {
            return List.of(text);
        }

        String bestLeft = null;
        String bestRight = null;
        int bestScore = Integer.MAX_VALUE;
        for (int index = 1; index < text.length(); index++) {
            char previous = text.charAt(index - 1);
            if (previous != ' ' && previous != '-') {
                continue;
            }

            String left = text.substring(0, previous == ' ' ? index - 1 : index).trim();
            String right = text.substring(index).trim();
            if (left.isEmpty() || right.isEmpty()) {
                continue;
            }

            int leftWidth = font.width(left);
            int rightWidth = font.width(right);
            if (leftWidth > width || rightWidth > width) {
                continue;
            }

            int score = Math.abs(leftWidth - rightWidth) + Math.max(leftWidth, rightWidth);
            if (score < bestScore) {
                bestScore = score;
                bestLeft = left;
                bestRight = right;
            }
        }

        return bestLeft == null ? List.of(text) : List.of(bestLeft, bestRight);
    }

    private static void rememberOpenState(boolean open) {
        if (ProgressionClientConfig.REMEMBER_PANEL_STATE.get()) {
            sessionOpen = open;
            sessionInitialized = true;
        }
    }

    private record Layout(
        int closedTabX,
        int openTabX,
        int tabY,
        int panelX,
        int panelY,
        int panelWidth,
        int panelHeight,
        boolean panelAvailable
    ) {
    }

    private static final class ScreenState {
        private final NexusTabButton tab;
        private final QuestButton quest;
        private boolean open;
        private Layout layout = new Layout(0, 0, 0, 0, 0, MIN_PANEL_WIDTH, PANEL_HEIGHT, false);

        private ScreenState(boolean open) {
            this.open = open;
            this.tab = new NexusTabButton(this);
            this.quest = new QuestButton();
        }

        private boolean isPanelVisible() {
            return open && layout.panelAvailable();
        }

        private int tabX() {
            return isPanelVisible() ? layout.openTabX() : layout.closedTabX();
        }

        private void toggle() {
            if (!layout.panelAvailable()) {
                return;
            }
            open = !open;
            rememberOpenState(open);
        }
    }

    private static final class NexusTabButton extends AbstractButton {
        private final ScreenState owner;

        private NexusTabButton(ScreenState owner) {
            super(0, 0, TAB_WIDTH, TAB_HEIGHT, Component.literal("Progresi\u00F3n del Nexus"));
            this.owner = owner;
        }

        @Override
        public void onPress() {
            owner.toggle();
        }

        @Override
        protected void renderWidget(GuiGraphics graphics, int mouseX, int mouseY, float partialTick) {
            // Rendered in ScreenEvent.Render.Post so the attached panel stays above the inventory background.
        }

        private void drawManual(GuiGraphics graphics, EraDefinition era, boolean panelOpen) {
            graphics.enableScissor(getX(), getY(), getX() + width, getY() + height);
            graphics.pose().pushPose();
            graphics.pose().translate(0.0F, 0.0F, 100.0F);
            ProgressionHudRenderer.drawLithicButton(
                graphics,
                getX(),
                getY(),
                width,
                height,
                era.color(),
                panelOpen
            );
            ProgressionHudRenderer.renderEraIcon(graphics, era, getX() + 2, getY() + 3);
            graphics.pose().popPose();
            graphics.disableScissor();
        }

        @Override
        protected void updateWidgetNarration(NarrationElementOutput output) {
            defaultButtonNarrationText(output);
        }
    }

    private static final class QuestButton extends AbstractButton {
        private QuestButton() {
            super(0, 0, QUEST_SIZE, QUEST_SIZE, Component.literal("Abrir Progresi\u00F3n Global"));
        }

        @Override
        public void onPress() {
            // Disabled until a stable FTB Quests chapter API or command is configured.
        }

        @Override
        protected void renderWidget(GuiGraphics graphics, int mouseX, int mouseY, float partialTick) {
            // Drawn manually after the panel.
        }

        private void drawManual(GuiGraphics graphics, EraDefinition era) {
            graphics.enableScissor(getX(), getY(), getX() + width, getY() + height);
            graphics.pose().pushPose();
            graphics.pose().translate(0.0F, 0.0F, 100.0F);
            ProgressionHudRenderer.drawLithicButton(
                graphics,
                getX(),
                getY(),
                width,
                height,
                era.color(),
                false
            );
            graphics.renderItem(new ItemStack(Items.BOOK), getX() + 1, getY() + 1);
            graphics.pose().popPose();
            graphics.disableScissor();
        }

        @Override
        protected void updateWidgetNarration(NarrationElementOutput output) {
            defaultButtonNarrationText(output);
        }
    }
}
