package dev.itscarlos.nexuscore.market;

import dev.itscarlos.nexuscore.NexusCore;
import dev.itscarlos.nexuscore.network.ProgressionNetwork;
import dev.itscarlos.nexuscore.progression.KubeJsServerData;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.server.ServerStartedEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class MarketTremorEvents {
    private static final int TICKS_PER_SECOND = 20;
    private static final int CHECK_INTERVAL_TICKS = TICKS_PER_SECOND;
    private static final int NEWCOMER_GRACE_TICKS = TICKS_PER_SECOND * 60;
    private static final int EMPTY_RETRY_TICKS = TICKS_PER_SECOND * 60;

    private static final Map<UUID, Integer> INSIDE_TICKS = new HashMap<>();

    private static int checkAccumulator;
    private static int ticksUntilNextTremor = -1;

    private MarketTremorEvents() {
    }

    @SubscribeEvent
    public static void onServerStarted(ServerStartedEvent event) {
        INSIDE_TICKS.clear();
        checkAccumulator = 0;

        int era = KubeJsServerData
            .readProgression(event.getServer())
            .era();

        ticksUntilNextTremor = randomIntervalTicks(era);
    }

    @SubscribeEvent
    public static void onServerStopping(ServerStoppingEvent event) {
        INSIDE_TICKS.clear();
        checkAccumulator = 0;
        ticksUntilNextTremor = -1;
    }

    @SubscribeEvent
    public static void onServerTick(TickEvent.ServerTickEvent event) {
        if (event.phase != TickEvent.Phase.END) {
            return;
        }

        if (++checkAccumulator < CHECK_INTERVAL_TICKS) {
            return;
        }

        checkAccumulator = 0;

        MinecraftServer server = event.getServer();
        List<ServerPlayer> insidePlayers = new ArrayList<>();
        Set<UUID> currentlyInside = new HashSet<>();

        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            if (!MarketProtection.isInsideProtectedMarket(
                player.serverLevel(),
                player.blockPosition()
            )) {
                INSIDE_TICKS.remove(player.getUUID());
                continue;
            }

            UUID id = player.getUUID();
            currentlyInside.add(id);
            insidePlayers.add(player);

            INSIDE_TICKS.merge(
                id,
                CHECK_INTERVAL_TICKS,
                (oldTicks, addedTicks) -> Math.min(
                    Integer.MAX_VALUE,
                    oldTicks + addedTicks
                )
            );
        }

        INSIDE_TICKS.keySet().retainAll(currentlyInside);

        if (ticksUntilNextTremor < 0) {
            int era = KubeJsServerData
                .readProgression(server)
                .era();
            ticksUntilNextTremor = randomIntervalTicks(era);
        }

        ticksUntilNextTremor -= CHECK_INTERVAL_TICKS;

        if (ticksUntilNextTremor > 0) {
            return;
        }

        List<ServerPlayer> eligible = insidePlayers
            .stream()
            .filter(player ->
                INSIDE_TICKS.getOrDefault(player.getUUID(), 0)
                    >= NEWCOMER_GRACE_TICKS
            )
            .toList();

        if (eligible.isEmpty()) {
            ticksUntilNextTremor = EMPTY_RETRY_TICKS;
            return;
        }

        int era = KubeJsServerData
            .readProgression(server)
            .era();

        TremorProfile profile = profileForEra(era);
        ThreadLocalRandom random = ThreadLocalRandom.current();
        long seed = random.nextLong();
        boolean showMessage =
            random.nextDouble() < profile.messageChance();

        for (ServerPlayer player : eligible) {
            ProgressionNetwork.sendMarketTremor(
                player,
                profile.durationTicks(),
                profile.intensity(),
                seed
            );

            player.playNotifySound(
                SoundEvents.WARDEN_HEARTBEAT,
                SoundSource.AMBIENT,
                0.72F,
                0.58F
            );

            player.playNotifySound(
                SoundEvents.AMETHYST_BLOCK_CHIME,
                SoundSource.AMBIENT,
                0.32F,
                0.72F
            );

            if (showMessage) {
                player.displayClientMessage(
                    tremorMessage(era),
                    true
                );
            }
        }

        NexusCore.LOGGER.info(
            "Nexus Market tremor: era={}, players={}, durationTicks={}, intensity={}",
            era,
            eligible.size(),
            profile.durationTicks(),
            profile.intensity()
        );

        ticksUntilNextTremor = randomIntervalTicks(era);
    }

    private static int randomIntervalTicks(int era) {
        TremorProfile profile = profileForEra(era);
        int minutes = ThreadLocalRandom.current().nextInt(
            profile.minMinutes(),
            profile.maxMinutes() + 1
        );

        return minutes * 60 * TICKS_PER_SECOND;
    }

    private static TremorProfile profileForEra(int era) {
        if (era <= 1) {
            return new TremorProfile(22, 35, 50, 0.42F, 0.20D);
        }

        if (era == 2) {
            return new TremorProfile(18, 30, 60, 0.50F, 0.25D);
        }

        if (era == 3) {
            return new TremorProfile(15, 25, 70, 0.58F, 0.30D);
        }

        return new TremorProfile(12, 22, 80, 0.65F, 0.35D);
    }

    private static Component tremorMessage(int era) {
        String text;

        if (era >= 4) {
            text = "El Nexo vuelve a estremecerse...";
        } else if (era >= 2) {
            text = "Un pulso recorre el Nexo...";
        } else {
            text = "Algo vibra bajo el mercado...";
        }

        return Component.literal(text).withStyle(
            ChatFormatting.DARK_PURPLE,
            ChatFormatting.ITALIC
        );
    }

    private record TremorProfile(
        int minMinutes,
        int maxMinutes,
        int durationTicks,
        float intensity,
        double messageChance
    ) {
    }
}