package dev.itscarlos.nexuscore;

import java.util.Set;

public final class ClassChangePolicy {
    public static final int EXPERIENCE_LEVEL_COST = 41;
    public static final long COOLDOWN_MILLIS = 12L * 60L * 60L * 1_000L;
    public static final long CLOCK_TOLERANCE_MILLIS = 60_000L;
    public static final int MAX_RECOVERY_ATTEMPTS = 3;

    private static final Set<String> FORWARD_PHASES = Set.of(
        "OLD_STATE_REVOKED",
        "NEW_STATE_APPLIED",
        "KIT_APPLIED",
        "VERIFYING",
        "COMMITTING",
        "COMPLETED"
    );

    private ClassChangePolicy() {
    }

    public static CooldownCheck checkCooldown(
        boolean hasLast,
        boolean hasNext,
        long last,
        long next,
        long now
    ) {
        if (!hasLast && !hasNext) {
            return new CooldownCheck(true, false, 0L, "absent");
        }
        if (hasLast != hasNext) {
            return new CooldownCheck(false, false, 0L, "pair_incomplete");
        }
        if (
            last < 0L
            || next < last
            || last > now + CLOCK_TOLERANCE_MILLIS
            || next > last + COOLDOWN_MILLIS + CLOCK_TOLERANCE_MILLIS
        ) {
            return new CooldownCheck(false, false, 0L, "timestamps_corrupt");
        }

        long remaining = Math.max(0L, next - now);
        return new CooldownCheck(true, remaining > 0L, remaining, "ok");
    }

    public static boolean canAffordLevels(int experienceLevel) {
        return experienceLevel >= EXPERIENCE_LEVEL_COST;
    }

    public static boolean requiresUnequip(
        NexusClass requiredClass,
        NexusClass targetClass
    ) {
        return requiredClass != NexusClass.NONE
            && requiredClass != targetClass;
    }

    public static boolean isExactLevelCharge(
        int beforeLevel,
        int afterLevel,
        int beforeTotal,
        int afterTotal,
        float beforeProgress,
        float afterProgress
    ) {
        return beforeLevel >= EXPERIENCE_LEVEL_COST
            && afterLevel == beforeLevel - EXPERIENCE_LEVEL_COST
            && afterLevel >= 0
            && afterTotal == beforeTotal
            && afterTotal >= 0
            && Float.isFinite(beforeProgress)
            && Float.isFinite(afterProgress)
            && beforeProgress >= 0.0F
            && beforeProgress < 1.0F
            && afterProgress >= 0.0F
            && afterProgress < 1.0F
            && Float.compare(afterProgress, beforeProgress) == 0;
    }

    public static boolean requiresForwardRecovery(
        String phase,
        String recoveryMode
    ) {
        return "FORWARD".equals(recoveryMode)
            || FORWARD_PHASES.contains(phase);
    }

    public record CooldownCheck(
        boolean valid,
        boolean active,
        long remainingMillis,
        String reason
    ) {
    }
}
