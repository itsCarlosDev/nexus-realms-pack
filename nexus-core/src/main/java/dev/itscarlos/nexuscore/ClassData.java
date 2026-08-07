package dev.itscarlos.nexuscore;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerPlayer;

import java.lang.reflect.Method;

public final class ClassData {

    private static final String KUBEJS_PERSISTENT_DATA_INTERFACE =
        "dev.latvian.mods.kubejs.core.WithPersistentData";

    private static Method kubeJsPersistentDataAccessor;
    private static boolean kubeJsAccessorResolved;
    private static boolean kubeJsAccessWarningLogged;

    private ClassData() {
    }

    public static NexusClass getPlayerClass(ServerPlayer player) {
        String persistentValue = getPersistentRoleValue(
            player,
            "nexus_class"
        );
        NexusClass persistentClass =
            NexusClass.fromPersistentId(persistentValue);

        if (persistentClass != NexusClass.NONE) {
            return persistentClass;
        }

        /*
         * A non-empty invalid value is authoritative corruption. Do not mask
         * it with a stale scoreboard tag; /nexus_repairclass must reconcile it.
         */
        if (!persistentValue.isBlank()) {
            return NexusClass.NONE;
        }

        if (player.getTags().contains("nexus_class_warrior")) {
            return NexusClass.WARRIOR;
        }

        if (player.getTags().contains("nexus_class_mage")) {
            return NexusClass.MAGE;
        }

        if (player.getTags().contains("nexus_class_gunslinger")) {
            return NexusClass.GUNSLINGER;
        }

        return NexusClass.NONE;
    }

    static String getPersistentRoleValue(
        ServerPlayer player,
        String key
    ) {
        String forgeValue =
            player.getPersistentData().getString(key);

        if (!forgeValue.isBlank()) {
            return forgeValue;
        }

        CompoundTag kubeJsData =
            getKubeJsPersistentData(player);

        return kubeJsData == null
            ? ""
            : kubeJsData.getString(key);
    }

    static boolean hasActiveClassChangeJournal(
        ServerPlayer player
    ) {
        String phase = getPersistentRoleValue(
            player,
            "nexus_class_change_phase"
        );

        return !phase.isBlank()
            && !"IDLE".equals(phase)
            && !"COMPLETED".equals(phase);
    }

    private static CompoundTag getKubeJsPersistentData(
        ServerPlayer player
    ) {
        Method accessor =
            resolveKubeJsPersistentDataAccessor(
                player
            );

        if (accessor == null) {
            return null;
        }

        try {
            Object value = accessor.invoke(player);

            return value instanceof CompoundTag compoundTag
                ? compoundTag
                : null;
        } catch (ReflectiveOperationException exception) {
            logKubeJsAccessWarning(exception);
            return null;
        }
    }

    private static synchronized Method
        resolveKubeJsPersistentDataAccessor(
            ServerPlayer player
        ) {
        if (kubeJsAccessorResolved) {
            return kubeJsPersistentDataAccessor;
        }

        kubeJsAccessorResolved = true;

        try {
            Class<?> persistentDataInterface =
                Class.forName(
                    KUBEJS_PERSISTENT_DATA_INTERFACE,
                    false,
                    player.getClass().getClassLoader()
                );

            if (
                persistentDataInterface.isInstance(player)
            ) {
                kubeJsPersistentDataAccessor =
                    persistentDataInterface.getMethod(
                        "kjs$getPersistentData"
                    );
            }
        } catch (
            ClassNotFoundException |
            NoSuchMethodException exception
        ) {
            logKubeJsAccessWarning(exception);
        }

        return kubeJsPersistentDataAccessor;
    }

    private static void logKubeJsAccessWarning(
        ReflectiveOperationException exception
    ) {
        if (kubeJsAccessWarningLogged) {
            return;
        }

        kubeJsAccessWarningLogged = true;
        NexusCore.LOGGER.warn(
            "Unable to read KubeJS persistent class data; "
                + "falling back to Forge data and class tags.",
            exception
        );
    }

    public static boolean hasClass(ServerPlayer player, NexusClass requiredClass) {
        if (requiredClass == NexusClass.NONE) {
            return true;
        }

        return getPlayerClass(player) == requiredClass;
    }

    public static boolean isNonWarrior(ServerPlayer player) {
        NexusClass playerClass = getPlayerClass(player);
        return playerClass != NexusClass.NONE && playerClass != NexusClass.WARRIOR;
    }
}
