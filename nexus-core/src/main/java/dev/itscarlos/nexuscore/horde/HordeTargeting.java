package dev.itscarlos.nexuscore.horde;

import dev.itscarlos.nexuscore.NexusCore;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Mob;
import net.minecraftforge.event.entity.living.LivingChangeTargetEvent;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

/**
 * Marks native Horde mobs with the authoritative Nexus participant set.
 * The soft mixin on HordeTrackPlayerGoal consumes this data without adding a
 * compile-time dependency on The Hordes.
 */
@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class HordeTargeting {
    public static final String HORDE_MOB_KEY = "nexusHordeMob";
    public static final String PARTICIPANTS_KEY =
        "nexusHordeParticipantUUIDs";
    public static final String ASSIGNED_TARGET_KEY =
        "nexusHordeAssignedTargetUUID";

    private HordeTargeting() {
    }

    public static void configure(Mob mob, String participantIds) {
        if (mob == null) {
            return;
        }

        String ids = participantIds == null
            ? ""
            : participantIds.trim();

        if (ids.isEmpty()) {
            clear(mob);
            return;
        }

        mob.getPersistentData().putBoolean(HORDE_MOB_KEY, true);
        mob.getPersistentData().putString(PARTICIPANTS_KEY, ids);
        mob.getPersistentData().remove(ASSIGNED_TARGET_KEY);
    }

    public static boolean isNexusHordeMob(Mob mob) {
        return mob != null
            && mob.getPersistentData().getBoolean(HORDE_MOB_KEY);
    }

    public static ServerPlayer resolveAssignedTarget(Mob mob) {
        if (!isNexusHordeMob(mob)) {
            return null;
        }

        String rawIds = mob.getPersistentData().getString(PARTICIPANTS_KEY);
        if (rawIds.isBlank()) {
            mob.getPersistentData().remove(ASSIGNED_TARGET_KEY);
            return null;
        }

        MinecraftServer server = mob.getServer();
        if (server == null) {
            return null;
        }

        String assignedId = mob.getPersistentData().getString(
            ASSIGNED_TARGET_KEY
        );
        ServerPlayer assigned = findValidParticipant(
            mob,
            server,
            rawIds,
            assignedId
        );
        if (assigned != null) {
            return assigned;
        }

        List<ServerPlayer> candidates = new ArrayList<>();
        for (String value : rawIds.split(",")) {
            ServerPlayer candidate = findValidPlayer(
                mob,
                server,
                value.trim()
            );
            if (candidate != null) {
                candidates.add(candidate);
            }
        }

        if (candidates.isEmpty()) {
            mob.getPersistentData().remove(ASSIGNED_TARGET_KEY);
            return null;
        }

        candidates.sort(
            Comparator.comparing(player -> player.getUUID().toString())
        );

        ServerPlayer selected = candidates.get(
            Math.floorMod(mob.getUUID().hashCode(), candidates.size())
        );
        mob.getPersistentData().putString(
            ASSIGNED_TARGET_KEY,
            selected.getUUID().toString()
        );
        return selected;
    }

    @SubscribeEvent(priority = EventPriority.LOWEST)
    public static void onLivingChangeTarget(
        LivingChangeTargetEvent event
    ) {
        if (
            event.getTargetType() !=
                LivingChangeTargetEvent.LivingTargetType.MOB_TARGET
            || !(event.getEntity() instanceof Mob mob)
            || !(event.getNewTarget() instanceof ServerPlayer)
            || !isNexusHordeMob(mob)
        ) {
            return;
        }

        ServerPlayer assigned = resolveAssignedTarget(mob);
        if (event.getNewTarget() != assigned) {
            event.setNewTarget(assigned);
        }
    }

    private static ServerPlayer findValidParticipant(
        Mob mob,
        MinecraftServer server,
        String rawIds,
        String playerId
    ) {
        if (playerId.isBlank() || !containsParticipant(rawIds, playerId)) {
            return null;
        }

        return findValidPlayer(mob, server, playerId);
    }

    private static boolean containsParticipant(
        String rawIds,
        String playerId
    ) {
        int fromIndex = 0;
        while (fromIndex < rawIds.length()) {
            int match = rawIds.indexOf(playerId, fromIndex);
            if (match < 0) {
                return false;
            }

            int matchEnd = match + playerId.length();
            boolean startsAtBoundary = match == 0
                || rawIds.charAt(match - 1) == ',';
            boolean endsAtBoundary = matchEnd == rawIds.length()
                || rawIds.charAt(matchEnd) == ',';
            if (startsAtBoundary && endsAtBoundary) {
                return true;
            }

            fromIndex = match + 1;
        }

        return false;
    }

    private static ServerPlayer findValidPlayer(
        Mob mob,
        MinecraftServer server,
        String playerId
    ) {
        try {
            ServerPlayer player = server
                .getPlayerList()
                .getPlayer(UUID.fromString(playerId));

            return player != null
                && player.isAlive()
                && !player.isSpectator()
                && player.level() == mob.level()
                ? player
                : null;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    public static void clear(Mob mob) {
        if (mob == null) {
            return;
        }

        mob.getPersistentData().remove(HORDE_MOB_KEY);
        mob.getPersistentData().remove(PARTICIPANTS_KEY);
        mob.getPersistentData().remove(ASSIGNED_TARGET_KEY);
    }
}
