package dev.itscarlos.nexuscore.progression;

import dev.itscarlos.nexuscore.NexusCore;
import dev.itscarlos.nexuscore.network.ProgressionNetwork;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.event.server.ServerStartedEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = NexusCore.MOD_ID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class ServerProgressionManager {
    private static final String LAST_NOTIFIED_KEY = "nexusLastNotifiedEra";
    private static final int CHECK_INTERVAL_TICKS = 10;
    private static ProgressionState lastGlobalState;
    private static int ticks;

    private ServerProgressionManager() {
    }

    @SubscribeEvent
    public static void onServerStarted(ServerStartedEvent event) {
        lastGlobalState = KubeJsServerData.readProgression(event.getServer());
        ticks = 0;
    }

    @SubscribeEvent
    public static void onServerStopping(ServerStoppingEvent event) {
        lastGlobalState = null;
        ticks = 0;
    }

    @SubscribeEvent
    public static void onLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            syncPlayer(player, true);
        }
    }

    @SubscribeEvent
    public static void onChangedDimension(PlayerEvent.PlayerChangedDimensionEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            syncPlayer(player, true);
        }
    }

    @SubscribeEvent
    public static void onRespawn(PlayerEvent.PlayerRespawnEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            syncPlayer(player, true);
        }
    }

    @SubscribeEvent
    public static void onPlayerClone(PlayerEvent.Clone event) {
        if (event.getOriginal().getPersistentData().contains(LAST_NOTIFIED_KEY)) {
            event.getEntity().getPersistentData().putInt(
                LAST_NOTIFIED_KEY,
                event.getOriginal().getPersistentData().getInt(LAST_NOTIFIED_KEY)
            );
        }
    }

    @SubscribeEvent
    public static void onServerTick(TickEvent.ServerTickEvent event) {
        if (event.phase != TickEvent.Phase.END || ++ticks % CHECK_INTERVAL_TICKS != 0) {
            return;
        }

        MinecraftServer server = event.getServer();
        ProgressionState current = KubeJsServerData.readProgression(server);

        if (lastGlobalState == null) {
            lastGlobalState = current;
            return;
        }

        if (!current.equals(lastGlobalState)) {
            boolean eraIncreased = current.era() > lastGlobalState.era();
            lastGlobalState = current;
            for (ServerPlayer player : server.getPlayerList().getPlayers()) {
                syncPlayer(player, eraIncreased);
            }
        }
    }

    private static void syncPlayer(ServerPlayer player, boolean allowNotification) {
        ProgressionState state = KubeJsServerData.readProgression(player.getServer());
        int lastNotified = player.getPersistentData().getInt(LAST_NOTIFIED_KEY);
        boolean notify = allowNotification && state.era() > lastNotified;

        if (notify) {
            player.getPersistentData().putInt(LAST_NOTIFIED_KEY, state.era());
            EraDefinition era = EraRegistry.get(state.era());
            player.sendSystemMessage(
                Component.literal("NUEVA ERA DESBLOQUEADA: ")
                    .withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD)
                    .append(Component.literal(era.name()).withStyle(ChatFormatting.WHITE))
            );
        }

        ProgressionNetwork.sync(player, state, notify);
    }
}
