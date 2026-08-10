package dev.itscarlos.nexuscore.horde;

import net.minecraft.world.entity.Mob;

/**
 * Marks native Horde mobs with the authoritative Nexus participant set.
 * The soft mixin on HordeTrackPlayerGoal consumes this data without adding a
 * compile-time dependency on The Hordes.
 */
public final class HordeTargeting {
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

        mob.getPersistentData().putString(PARTICIPANTS_KEY, ids);
        mob.getPersistentData().remove(ASSIGNED_TARGET_KEY);
    }

    public static void clear(Mob mob) {
        if (mob == null) {
            return;
        }

        mob.getPersistentData().remove(PARTICIPANTS_KEY);
        mob.getPersistentData().remove(ASSIGNED_TARGET_KEY);
    }
}
