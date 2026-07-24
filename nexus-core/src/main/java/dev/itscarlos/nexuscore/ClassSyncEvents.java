package dev.itscarlos.nexuscore;

import dev.itscarlos.nexuscore.network.ProgressionNetwork;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Keeps the authoritative Nexus class and Mage specialization synchronized
 * to each client.
 *
 * KubeJS remains the authority that writes nexus_specialization and reconciles
 * History Stages. Nexus Core only mirrors that state to the client.
 */
@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class ClassSyncEvents {

    private static final Map<UUID, SyncedRole> LAST_SENT =
        new HashMap<>();

    private ClassSyncEvents() {
    }

    @SubscribeEvent
    public static void onPlayerLoggedIn(
        PlayerEvent.PlayerLoggedInEvent event
    ) {
        if (event.getEntity() instanceof ServerPlayer player) {
            sync(player, true);
        }
    }

    @SubscribeEvent
    public static void onPlayerRespawn(
        PlayerEvent.PlayerRespawnEvent event
    ) {
        if (event.getEntity() instanceof ServerPlayer player) {
            sync(player, true);
        }
    }

    @SubscribeEvent
    public static void onPlayerChangedDimension(
        PlayerEvent.PlayerChangedDimensionEvent event
    ) {
        if (event.getEntity() instanceof ServerPlayer player) {
            sync(player, true);
        }
    }

    @SubscribeEvent
    public static void onPlayerLoggedOut(
        PlayerEvent.PlayerLoggedOutEvent event
    ) {
        if (event.getEntity() instanceof ServerPlayer player) {
            LAST_SENT.remove(
                player.getUUID()
            );
        }
    }

    @SubscribeEvent
    public static void onPlayerTick(
        TickEvent.PlayerTickEvent event
    ) {
        if (event.phase != TickEvent.Phase.END) {
            return;
        }

        if (!(event.player instanceof ServerPlayer player)) {
            return;
        }

        /*
         * KubeJS can change class/specialization independently of Nexus Core.
         * Check once per second and only send when the authoritative role
         * actually changes.
         */
        if (player.tickCount % 20 != 0) {
            return;
        }

        sync(player, false);
    }

    private static void sync(
        ServerPlayer player,
        boolean force
    ) {
        NexusClass currentClass =
            ClassData.getPlayerClass(player);

        NexusSpecialization currentSpecialization =
            getPlayerSpecialization(
                player,
                currentClass
            );

        SyncedRole currentRole =
            new SyncedRole(
                currentClass,
                currentSpecialization
            );

        SyncedRole previousRole =
            LAST_SENT.get(
                player.getUUID()
            );

        if (
            !force &&
            currentRole.equals(previousRole)
        ) {
            return;
        }

        ProgressionNetwork.syncClass(
            player,
            currentClass,
            currentSpecialization
        );

        LAST_SENT.put(
            player.getUUID(),
            currentRole
        );
    }

    private static NexusSpecialization getPlayerSpecialization(
        ServerPlayer player,
        NexusClass nexusClass
    ) {
        if (nexusClass != NexusClass.MAGE) {
            return NexusSpecialization.NONE;
        }

        return NexusSpecialization.fromId(
            player
                .getPersistentData()
                .getString(
                    "nexus_specialization"
                )
        );
    }

    private record SyncedRole(
        NexusClass nexusClass,
        NexusSpecialization specialization
    ) {
    }
}