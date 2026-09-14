package dev.itscarlos.nexuscore.horde;

import dev.itscarlos.nexuscore.NexusCore;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.player.Player;
import net.minecraftforge.event.entity.EntityJoinLevelEvent;
import net.minecraftforge.event.entity.living.LivingChangeTargetEvent;
import net.minecraftforge.event.entity.living.MobSpawnEvent;
import net.minecraftforge.eventbus.api.Event;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

/** Session-scoped targeting and cleanup for Nexus Horde mobs. */
@Mod.EventBusSubscriber(modid = NexusCore.MOD_ID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class HordeTargeting {
    public static final String HORDE_MOB_KEY = "nexusHordeMob";
    public static final String SESSION_KEY = "nexusHordeSession";
    public static final String PARTICIPANTS_KEY = "nexusHordeParticipantUUIDs";
    public static final String ASSIGNED_TARGET_KEY = "nexusHordeAssignedTargetUUID";
    public static final String ASSIGNMENT_SLOT_KEY = "nexusHordeAssignmentSlot";
    public static final String CENTER_DIMENSION_KEY = "nexusHordeCenterDimension";
    public static final String CENTER_X_KEY = "nexusHordeCenterX";
    public static final String CENTER_Y_KEY = "nexusHordeCenterY";
    public static final String CENTER_Z_KEY = "nexusHordeCenterZ";
    public static final String RADIUS_SQR_KEY = "nexusHordeRadiusSqr";
    private static final String LOCATOR_GLOW_KEY = "nexusHordeLocatorGlow";
    private static final Set<String> ACTIVE_SESSIONS = ConcurrentHashMap.newKeySet();
    private static final String PLAYER_REVIVE_SERVER =
        "team.creative.playerrevive.server.PlayerReviveServer";
    private static Method playerReviveIsBleeding;
    private static boolean playerReviveResolved;

    private HordeTargeting() {
    }

    public static void registerSession(String sessionId) {
        if (sessionId != null && !sessionId.isBlank()) ACTIVE_SESSIONS.add(sessionId);
    }

    public static void unregisterSession(String sessionId) {
        if (sessionId != null) ACTIVE_SESSIONS.remove(sessionId);
    }

    public static boolean isSessionActive(String sessionId) {
        return sessionId != null && ACTIVE_SESSIONS.contains(sessionId);
    }

    public static void configure(
        Mob mob,
        String sessionId,
        String participantIds,
        String centerDimension,
        double centerX,
        double centerY,
        double centerZ,
        double radiusSqr,
        int assignmentSlot
    ) {
        if (mob == null) return;
        String session = sessionId == null ? "" : sessionId.trim();
        String ids = participantIds == null ? "" : participantIds.trim();
        String dimension = centerDimension == null ? "" : centerDimension.trim();
        if (session.isEmpty() || ids.isEmpty() || dimension.isEmpty()) {
            clear(mob);
            return;
        }

        mob.getPersistentData().putBoolean(HORDE_MOB_KEY, true);
        mob.getPersistentData().putString(SESSION_KEY, session);
        mob.getPersistentData().putString(PARTICIPANTS_KEY, ids);
        mob.getPersistentData().putString(CENTER_DIMENSION_KEY, dimension);
        mob.getPersistentData().putDouble(CENTER_X_KEY, centerX);
        mob.getPersistentData().putDouble(CENTER_Y_KEY, centerY);
        mob.getPersistentData().putDouble(CENTER_Z_KEY, centerZ);
        mob.getPersistentData().putDouble(RADIUS_SQR_KEY, Math.max(0.0D, radiusSqr));
        mob.getPersistentData().putInt(ASSIGNMENT_SLOT_KEY, assignmentSlot);
        mob.getPersistentData().remove(ASSIGNED_TARGET_KEY);
    }

    public static boolean isNexusHordeMob(Mob mob) {
        return mob != null && mob.getPersistentData().getBoolean(HORDE_MOB_KEY);
    }

    public static String entityTypeId(Entity entity) {
        if (entity == null) return "unknown";
        ResourceLocation id = BuiltInRegistries.ENTITY_TYPE.getKey(entity.getType());
        return id == null ? "unknown" : id.toString();
    }

    public static String damageDetails(DamageSource source) {
        if (source == null) return "damage=unknown";
        String typeKey = source.typeHolder().unwrapKey()
            .map(key -> key.location().toString()).orElse("unregistered");
        Entity causing = source.getEntity();
        Entity direct = source.getDirectEntity();
        return "damage=" + source.getMsgId()
            + " damageType=" + typeKey
            + " causingType=" + entityTypeId(causing)
            + " causingUuid=" + entityUuid(causing)
            + " directType=" + entityTypeId(direct)
            + " directUuid=" + entityUuid(direct);
    }

    private static String entityUuid(Entity entity) {
        return entity == null ? "none" : entity.getUUID().toString();
    }

    public static ServerPlayer resolveAssignedTarget(Mob mob) {
        if (!isNexusHordeMob(mob)) return null;
        String session = mob.getPersistentData().getString(SESSION_KEY);
        if (!isSessionActive(session)) return null;
        String rawIds = mob.getPersistentData().getString(PARTICIPANTS_KEY);
        if (rawIds.isBlank()) {
            mob.getPersistentData().remove(ASSIGNED_TARGET_KEY);
            return null;
        }
        MinecraftServer server = mob.getServer();
        if (server == null) return null;

        String assignedId = mob.getPersistentData().getString(ASSIGNED_TARGET_KEY);
        ServerPlayer assigned = findValidParticipant(mob, server, rawIds, assignedId);
        if (assigned != null) return assigned;

        List<ServerPlayer> candidates = new ArrayList<>();
        for (String value : rawIds.split(",")) {
            ServerPlayer candidate = findValidPlayer(mob, server, value.trim());
            if (candidate != null) candidates.add(candidate);
        }
        if (candidates.isEmpty()) {
            mob.getPersistentData().remove(ASSIGNED_TARGET_KEY);
            return null;
        }
        candidates.sort(Comparator.comparing(player -> player.getUUID().toString()));
        int slot = mob.getPersistentData().getInt(ASSIGNMENT_SLOT_KEY);
        ServerPlayer selected = candidates.get(Math.floorMod(slot, candidates.size()));
        mob.getPersistentData().putString(ASSIGNED_TARGET_KEY, selected.getUUID().toString());
        return selected;
    }

    @SubscribeEvent(priority = EventPriority.LOWEST)
    public static void onLivingChangeTarget(LivingChangeTargetEvent event) {
        if (!(event.getEntity() instanceof Mob mob) || !isNexusHordeMob(mob)) return;
        if (event.getNewTarget() == null) return;
        ServerPlayer assigned = resolveAssignedTarget(mob);
        if (assigned != null) {
            if (event.getNewTarget() != assigned) event.setNewTarget(assigned);
            return;
        }
        if (event.getTargetType() == LivingChangeTargetEvent.LivingTargetType.MOB_TARGET) {
            event.setNewTarget(null);
        } else {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void onEntityJoin(EntityJoinLevelEvent event) {
        if (!(event.getEntity() instanceof Mob mob) || !isNexusHordeMob(mob)) return;
        String session = mob.getPersistentData().getString(SESSION_KEY);
        if (isSessionActive(session)) return;
        try {
            HordeNativeBridge.cleanupNativeMob(mob, session);
        } catch (RuntimeException error) {
            NexusCore.LOGGER.error(
                "Native cleanup failed for stale Nexus Horde mob {}.",
                mob.getUUID(),
                error
            );
        }
        clear(mob);
        NexusCore.LOGGER.warn(
            "Cleaned stale Nexus Horde metadata from {} (session={}).",
            mob.getUUID(), session.isBlank() ? "missing" : session
        );
    }

    @SubscribeEvent
    public static void onAllowDespawn(MobSpawnEvent.AllowDespawn event) {
        Mob mob = event.getEntity();
        if (isNexusHordeMob(mob)
            && isSessionActive(mob.getPersistentData().getString(SESSION_KEY))) {
            event.setResult(Event.Result.DENY);
        }
    }

    public static boolean reconcileTarget(Mob mob) {
        if (!isNexusHordeMob(mob) || mob.getTarget() == null) return false;
        ServerPlayer assigned = resolveAssignedTarget(mob);
        if (mob.getTarget() != assigned) {
            mob.setTarget(assigned);
            return true;
        }
        return false;
    }

    public static void setLocatorGlowing(Mob mob, boolean visible) {
        if (!isNexusHordeMob(mob)) return;
        if (visible) {
            if (!mob.getPersistentData().getBoolean(LOCATOR_GLOW_KEY) && !mob.hasGlowingTag()) {
                mob.setGlowingTag(true);
                mob.getPersistentData().putBoolean(LOCATOR_GLOW_KEY, true);
            }
            return;
        }
        if (mob.getPersistentData().getBoolean(LOCATOR_GLOW_KEY)) {
            mob.setGlowingTag(false);
            mob.getPersistentData().remove(LOCATOR_GLOW_KEY);
        }
    }

    private static ServerPlayer findValidParticipant(
        Mob mob, MinecraftServer server, String rawIds, String playerId
    ) {
        if (playerId.isBlank() || !containsParticipant(rawIds, playerId)) return null;
        return findValidPlayer(mob, server, playerId);
    }

    private static boolean containsParticipant(String rawIds, String playerId) {
        int fromIndex = 0;
        while (fromIndex < rawIds.length()) {
            int match = rawIds.indexOf(playerId, fromIndex);
            if (match < 0) return false;
            int matchEnd = match + playerId.length();
            boolean startsAtBoundary = match == 0 || rawIds.charAt(match - 1) == ',';
            boolean endsAtBoundary = matchEnd == rawIds.length() || rawIds.charAt(matchEnd) == ',';
            if (startsAtBoundary && endsAtBoundary) return true;
            fromIndex = match + 1;
        }
        return false;
    }

    private static ServerPlayer findValidPlayer(
        Mob mob, MinecraftServer server, String playerId
    ) {
        try {
            ServerPlayer player = server.getPlayerList().getPlayer(UUID.fromString(playerId));
            if (player == null || !player.isAlive() || player.isCreative()
                || player.isSpectator() || isPlayerReviveDowned(player)) return null;
            String centerDimension = mob.getPersistentData().getString(CENTER_DIMENSION_KEY);
            if (!player.level().dimension().location().toString().equals(centerDimension)) return null;
            double dx = player.getX() - mob.getPersistentData().getDouble(CENTER_X_KEY);
            double dy = player.getY() - mob.getPersistentData().getDouble(CENTER_Y_KEY);
            double dz = player.getZ() - mob.getPersistentData().getDouble(CENTER_Z_KEY);
            double radiusSqr = mob.getPersistentData().getDouble(RADIUS_SQR_KEY);
            return dx * dx + dy * dy + dz * dz <= radiusSqr ? player : null;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    public static boolean isPlayerReviveDowned(ServerPlayer player) {
        if (player == null) return false;
        resolvePlayerRevive();
        if (playerReviveIsBleeding == null) return false;
        try {
            return Boolean.TRUE.equals(playerReviveIsBleeding.invoke(null, player));
        } catch (IllegalAccessException | InvocationTargetException | LinkageError error) {
            NexusCore.LOGGER.debug("PlayerRevive probe failed for {}.", player.getUUID(), error);
            playerReviveIsBleeding = null;
            return false;
        }
    }

    private static synchronized void resolvePlayerRevive() {
        if (playerReviveResolved) return;
        playerReviveResolved = true;
        try {
            Class<?> api = Class.forName(PLAYER_REVIVE_SERVER);
            playerReviveIsBleeding = api.getMethod("isBleeding", Player.class);
            NexusCore.LOGGER.info("Nexus Horde targeting enabled optional PlayerRevive support.");
        } catch (ClassNotFoundException | NoSuchMethodException | LinkageError | SecurityException unavailable) {
            playerReviveIsBleeding = null;
            NexusCore.LOGGER.info("Nexus Horde targeting running without PlayerRevive support.");
        }
    }

    public static void clear(Mob mob) {
        if (mob == null) return;
        String session = mob.getPersistentData().getString(SESSION_KEY);
        if (!session.isBlank()) {
            mob.removeTag(
                "nexus_horde_" + session.replaceAll(
                    "[^a-zA-Z0-9_]",
                    ""
                )
            );
        }
        setLocatorGlowing(mob, false);
        mob.getPersistentData().remove(HORDE_MOB_KEY);
        mob.getPersistentData().remove(SESSION_KEY);
        mob.getPersistentData().remove(PARTICIPANTS_KEY);
        mob.getPersistentData().remove(ASSIGNED_TARGET_KEY);
        mob.getPersistentData().remove(ASSIGNMENT_SLOT_KEY);
        mob.getPersistentData().remove(CENTER_DIMENSION_KEY);
        mob.getPersistentData().remove(CENTER_X_KEY);
        mob.getPersistentData().remove(CENTER_Y_KEY);
        mob.getPersistentData().remove(CENTER_Z_KEY);
        mob.getPersistentData().remove(RADIUS_SQR_KEY);
    }
}
