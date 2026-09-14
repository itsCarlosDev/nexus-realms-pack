package dev.itscarlos.nexuscore.progression;

public record ProgressionState(
    int era,
    int nextHordeDay,
    boolean hordeActive,
    int participantCount,
    int pendingEra,
    int milestoneCompleted,
    int eligibleOnlinePlayers,
    int requiredOnlinePlayers
) {
    public static ProgressionState unavailable() {
        return new ProgressionState(-1, -1, false, 0, -1, 0, 0, 3);
    }

    public boolean available() {
        return era >= 0;
    }
}
