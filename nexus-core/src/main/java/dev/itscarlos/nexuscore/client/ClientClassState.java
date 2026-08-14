package dev.itscarlos.nexuscore.client;

import dev.itscarlos.nexuscore.NexusClass;
import dev.itscarlos.nexuscore.NexusSpecialization;

/**
 * Client-side copy of the authoritative server-side Nexus class and
 * Mage specialization.
 */
public final class ClientClassState {

    private static NexusClass currentClass =
        NexusClass.NONE;

    private static NexusSpecialization currentSpecialization =
        NexusSpecialization.NONE;

    private static boolean synchronizedFromServer;

    private ClientClassState() {
    }

    public static NexusClass get() {
        return currentClass;
    }

    public static NexusSpecialization getSpecialization() {
        return currentSpecialization;
    }

    public static boolean isSynchronizedFromServer() {
        return synchronizedFromServer;
    }

    public static void accept(
        NexusClass nexusClass,
        NexusSpecialization specialization
    ) {
        currentClass =
            nexusClass == null
                ? NexusClass.NONE
                : nexusClass;

        currentSpecialization =
            currentClass == NexusClass.MAGE &&
            specialization == NexusSpecialization.ARCANIST
                ? specialization
                : NexusSpecialization.NONE;

        synchronizedFromServer = true;
        ClientConnectionEvents.scheduleProfileApply();
    }

    public static void reset() {
        currentClass = NexusClass.NONE;
        currentSpecialization =
            NexusSpecialization.NONE;
        synchronizedFromServer = false;
        ClientConnectionEvents.cancelProfileApply();
    }
}
