package dev.itscarlos.nexuscore.nexus;

import dev.itscarlos.nexuscore.NexusCore;
import dev.itscarlos.nexuscore.network.ProgressionNetwork;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class NexusCrystalProximityEvents {

    /*
     * Comprobamos dos veces por segundo.
     *
     * No hace falta comprobarlo cada tick:
     * 10 ticks = 0.5 segundos.
     */
    private static final int CHECK_INTERVAL_TICKS = 10;

    /*
     * Radio al que se activa el evento.
     */
    private static final double ENTER_RADIUS = 30.0D;

    /*
     * El jugador tiene que alejarse más que esto
     * para poder activar de nuevo el evento.
     *
     * Esto evita:
     *
     * 11.9 bloques -> activar
     * 12.1 bloques -> salir
     * 11.9 bloques -> activar otra vez
     */
    private static final double EXIT_RADIUS = 40.0D;

    private static final double ENTER_RADIUS_SQR =
        ENTER_RADIUS * ENTER_RADIUS;

    private static final double EXIT_RADIUS_SQR =
        EXIT_RADIUS * EXIT_RADIUS;

    /*
     * 60 ticks = 3 segundos.
     *
     * ClientMarketTremorState ya limita y controla
     * correctamente duración e intensidad.
     */
    private static final int TREMOR_DURATION_TICKS = 60;

    /*
     * Intensidad moderada.
     *
     * Lo bastante fuerte para que se note que el
     * jugador acaba de entrar en la influencia del Nexo,
     * pero sin convertirse en un efecto molesto.
     */
    private static final float TREMOR_INTENSITY = 0.55F;

    /*
     * Jugadores que ya han activado el evento y
     * todavía no se han alejado suficientemente.
     */
    private static final Set<UUID> LATCHED_PLAYERS =
        new HashSet<>();

    private static int checkAccumulator;

    private NexusCrystalProximityEvents() {
    }

    @SubscribeEvent
    public static void onServerTick(
        TickEvent.ServerTickEvent event
    ) {
        if (event.phase != TickEvent.Phase.END) {
            return;
        }

        if (++checkAccumulator < CHECK_INTERVAL_TICKS) {
            return;
        }

        checkAccumulator = 0;

        for (
            ServerPlayer player :
            event.getServer().getPlayerList().getPlayers()
        ) {
            checkPlayer(player);
        }
    }

    private static void checkPlayer(ServerPlayer player) {
        UUID playerId = player.getUUID();

        if (!player.isAlive() || player.isSpectator()) {
            LATCHED_PLAYERS.remove(playerId);
            return;
        }

        /*
         * Solo buscamos entidades alrededor del jugador.
         *
         * No recorremos todos los cristales del mundo.
         *
         * La caja es algo mayor que el radio de salida
         * y después calculamos la distancia esférica real.
         */
        List<NexusCrystalEntity> nearbyCrystals =
            player.serverLevel().getEntitiesOfClass(
                NexusCrystalEntity.class,
                player.getBoundingBox().inflate(EXIT_RADIUS),
                crystal -> crystal.isAlive()
            );

        boolean insideEnterRadius = false;
        boolean insideExitRadius = false;

        for (NexusCrystalEntity crystal : nearbyCrystals) {
            double distanceSqr =
                player.distanceToSqr(crystal);

            if (distanceSqr <= EXIT_RADIUS_SQR) {
                insideExitRadius = true;
            }

            if (distanceSqr <= ENTER_RADIUS_SQR) {
                insideEnterRadius = true;
                break;
            }
        }

        /*
         * Si ya estamos fuera de los 18 bloques,
         * rearmamos el evento.
         */
        if (!insideExitRadius) {
            LATCHED_PLAYERS.remove(playerId);
            return;
        }

        /*
         * Todavía estamos entre 12 y 18 bloques.
         *
         * Si el jugador viene de fuera, esperamos
         * hasta que realmente entre en <12.
         */
        if (!insideEnterRadius) {
            return;
        }

        /*
         * Set.add() devuelve true únicamente cuando
         * el jugador todavía no estaba registrado.
         *
         * Por tanto el evento se ejecuta UNA SOLA VEZ
         * mientras permanezca cerca del Nexo.
         */
        if (!LATCHED_PLAYERS.add(playerId)) {
            return;
        }

        triggerNexusProximityEvent(player);
    }

    private static void triggerNexusProximityEvent(
        ServerPlayer player
    ) {
        long seed =
            ThreadLocalRandom.current().nextLong();

        /*
         * Reutilizamos exactamente el packet de temblor
         * que ya utiliza MarketTremorEvents.
         */
        ProgressionNetwork.sendMarketTremor(
            player,
            TREMOR_DURATION_TICKS,
            TREMOR_INTENSITY,
            seed
        );

        /*
         * Pulso grave.
         */
        player.playNotifySound(
            SoundEvents.WARDEN_HEARTBEAT,
            SoundSource.AMBIENT,
            0.80F,
            0.55F
        );

        /*
         * Resonancia del cristal.
         */
        player.playNotifySound(
            SoundEvents.AMETHYST_BLOCK_CHIME,
            SoundSource.AMBIENT,
            0.42F,
            0.68F
        );

        /*
         * Mensaje en Action Bar.
         *
         * Permanece visible durante unos segundos
         * sin ocupar el chat.
         */
        player.displayClientMessage(
            Component
                .literal(
                    "La corrupción se está extendiendo..."
                )
                .withStyle(
                    ChatFormatting.DARK_PURPLE,
                    ChatFormatting.ITALIC
                ),
            true
        );

        NexusCore.LOGGER.info(
            "Nexus proximity tremor triggered for {}",
            player.getGameProfile().getName()
        );
    }

    /*
     * Evitamos dejar al jugador marcado después
     * de desconectarse.
     */
    @SubscribeEvent
    public static void onPlayerLoggedOut(
        PlayerEvent.PlayerLoggedOutEvent event
    ) {
        LATCHED_PLAYERS.remove(
            event.getEntity().getUUID()
        );
    }

    /*
     * Al cambiar de dimensión se rearma.
     *
     * Así una posible segunda instancia del Nexo
     * en otra dimensión también podría funcionar.
     */
    @SubscribeEvent
    public static void onPlayerChangedDimension(
        PlayerEvent.PlayerChangedDimensionEvent event
    ) {
        LATCHED_PLAYERS.remove(
            event.getEntity().getUUID()
        );
    }

    @SubscribeEvent
    public static void onServerStopping(
        ServerStoppingEvent event
    ) {
        LATCHED_PLAYERS.clear();
        checkAccumulator = 0;
    }
}