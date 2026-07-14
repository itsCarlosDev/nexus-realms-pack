package dev.itscarlos.nexuscore.progression;

public record ProgressionState(
    int era,
    int worldDay,
    int unlockDay,
    int nextHordeDay,
    boolean hordeActive,
    int participantCount,
    int pendingEra,
    int pendingRequestedDay,
    int milestoneCompleted
) {
    public static ProgressionState unavailable() {
        return new ProgressionState(-1, -1, -1, -1, false, 0, -1, -1, 0);
    }

    public boolean available() {
        return era >= 0;
    }
}
