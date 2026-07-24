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

    private ClientClassState() {
    }

    public static NexusClass get() {
        return currentClass;
    }

    public static NexusSpecialization getSpecialization() {
        return currentSpecialization;
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
            specialization != null
                ? specialization
                : NexusSpecialization.NONE;

        KeybindProfileManager.applyCurrentClass();
    }

    public static void reset() {
        currentClass = NexusClass.NONE;
        currentSpecialization =
            NexusSpecialization.NONE;

        KeybindProfileManager.reset();
    }
}