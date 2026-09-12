package dev.itscarlos.nexuscore.horde;

import dev.itscarlos.nexuscore.NexusCore;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;

import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

/**
 * Native compatibility bridge between Nexus Horde Director and
 * The Hordes 1.20.1.
 *
 * KubeJS/Rhino deliberately restricts reflective access to java.lang.Class.
 * Reflection that is required for the private HordeEvent.day field therefore
 * lives here, inside Nexus Core.
 *
 * No compile-time dependency on The Hordes is introduced.
 */
public final class HordeNativeBridge {

    private static final String HORDE_EVENT_CLASS =
        "net.smileycorp.hordes.hordeevent.capability.HordeEvent";

    private static final String HORDE_TABLE_CLASS =
        "net.smileycorp.hordes.hordeevent.HordeSpawnTable";

    private static final String HORDE_TABLE_LOADER_CLASS =
        "net.smileycorp.hordes.hordeevent.data.HordeTableLoader";

    private static Class<?> hordeEventClass;
    private static Field dayField;

    private static Method spawnWaveMethod;
    private static Method getSpawnTableMethod;
    private static Method setSpawnTableMethod;

    private static Object tableLoader;
    private static Method getTableMethod;
    private static Method tableGetNameMethod;

    private static Throwable initializationError;
    private static boolean initialized;

    private HordeNativeBridge() {
    }

    private static synchronized void initialize() {
        if (initialized) {
            return;
        }

        initialized = true;

        try {
            hordeEventClass =
                Class.forName(HORDE_EVENT_CLASS);

            Class<?> hordeTableClass =
                Class.forName(HORDE_TABLE_CLASS);

            Class<?> hordeTableLoaderClass =
                Class.forName(HORDE_TABLE_LOADER_CLASS);

            dayField =
                hordeEventClass.getDeclaredField("day");

            if (dayField.getType() != int.class) {
                throw new IllegalStateException(
                    "HordeEvent.day is not int."
                );
            }

            dayField.setAccessible(true);

            spawnWaveMethod =
                hordeEventClass.getMethod(
                    "spawnWave",
                    ServerPlayer.class,
                    int.class
                );

            getSpawnTableMethod =
                hordeEventClass.getMethod(
                    "getSpawnTable"
                );

            setSpawnTableMethod =
                hordeEventClass.getMethod(
                    "setSpawntable",
                    hordeTableClass
                );

            tableLoader =
                hordeTableLoaderClass
                    .getField("INSTANCE")
                    .get(null);

            getTableMethod =
                hordeTableLoaderClass.getMethod(
                    "getTable",
                    ResourceLocation.class
                );

            tableGetNameMethod =
                hordeTableClass.getMethod(
                    "getName"
                );

            NexusCore.LOGGER.info(
                "Nexus Horde native bridge initialized for The Hordes."
            );
        } catch (Throwable error) {
            initializationError = error;

            NexusCore.LOGGER.error(
                "Failed to initialize Nexus Horde native bridge.",
                error
            );
        }
    }

    public static boolean isAvailable() {
        initialize();
        return initializationError == null;
    }

    public static String getInitializationError() {
        initialize();

        return initializationError == null
            ? ""
            : initializationError.toString();
    }

    public static void spawnWave(
        Object horde,
        ServerPlayer player,
        int count,
        int threatDay,
        boolean overrideThreatDay
    ) {
        requireAvailable();
        requireHorde(horde);

        if (player == null) {
            throw new IllegalArgumentException(
                "player cannot be null"
            );
        }

        if (count <= 0) {
            throw new IllegalArgumentException(
                "count must be greater than zero"
            );
        }

        withThreatDay(
            horde,
            threatDay,
            overrideThreatDay,
            () -> invoke(
                spawnWaveMethod,
                horde,
                player,
                count
            )
        );
    }

    public static void spawnFinisher(
        Object horde,
        ServerPlayer player,
        String tableId,
        int threatDay,
        boolean overrideThreatDay
    ) {
        requireAvailable();
        requireHorde(horde);

        if (player == null) {
            throw new IllegalArgumentException(
                "player cannot be null"
            );
        }

        if (
            tableId == null ||
            tableId.trim().isEmpty()
        ) {
            throw new IllegalArgumentException(
                "tableId cannot be empty"
            );
        }

        ResourceLocation requestedTable =
            new ResourceLocation(
                tableId.trim()
            );

        Object finisherTable =
            invoke(
                getTableMethod,
                tableLoader,
                requestedTable
            );

        if (finisherTable == null) {
            throw new IllegalStateException(
                "Finisher table not found: " +
                requestedTable
            );
        }

        Object actualName =
            invoke(
                tableGetNameMethod,
                finisherTable
            );

        if (
            !(actualName instanceof ResourceLocation) ||
            !requestedTable.equals(actualName)
        ) {
            throw new IllegalStateException(
                "Requested finisher table " +
                requestedTable +
                " resolved to " +
                String.valueOf(actualName)
            );
        }

        Object previousTable =
            invoke(
                getSpawnTableMethod,
                horde
            );

        withThreatDay(
            horde,
            threatDay,
            overrideThreatDay,
            () -> {
                invoke(
                    setSpawnTableMethod,
                    horde,
                    finisherTable
                );

                try {
                    invoke(
                        spawnWaveMethod,
                        horde,
                        player,
                        1
                    );
                } finally {
                    invoke(
                        setSpawnTableMethod,
                        horde,
                        previousTable
                    );
                }
            }
        );
    }

    private static void withThreatDay(
        Object horde,
        int threatDay,
        boolean overrideThreatDay,
        Runnable action
    ) {
        if (!overrideThreatDay) {
            action.run();
            return;
        }

        final int previousDay;

        try {
            previousDay =
                dayField.getInt(horde);

            dayField.setInt(
                horde,
                Math.max(0, threatDay)
            );
        } catch (IllegalAccessException error) {
            throw new IllegalStateException(
                "Unable to apply HordeEvent.day override.",
                error
            );
        }

        Throwable actionFailure = null;

        try {
            action.run();
        } catch (RuntimeException | Error error) {
            actionFailure = error;
            throw error;
        } finally {
            try {
                dayField.setInt(
                    horde,
                    previousDay
                );
            } catch (IllegalAccessException restoreError) {
                IllegalStateException wrapped =
                    new IllegalStateException(
                        "Unable to restore HordeEvent.day.",
                        restoreError
                    );

                if (actionFailure != null) {
                    actionFailure.addSuppressed(
                        wrapped
                    );
                } else {
                    throw wrapped;
                }
            }
        }
    }

    private static void requireAvailable() {
        initialize();

        if (initializationError != null) {
            throw new IllegalStateException(
                "Nexus Horde native bridge unavailable.",
                initializationError
            );
        }
    }

    private static void requireHorde(
        Object horde
    ) {
        if (
            horde == null ||
            !hordeEventClass.isInstance(horde)
        ) {
            throw new IllegalArgumentException(
                "Object is not a HordeEvent."
            );
        }
    }

    private static Object invoke(
        Method method,
        Object target,
        Object... args
    ) {
        try {
            return method.invoke(
                target,
                args
            );
        } catch (InvocationTargetException error) {
            Throwable cause =
                error.getCause();

            if (cause instanceof RuntimeException runtime) {
                throw runtime;
            }

            if (cause instanceof Error fatal) {
                throw fatal;
            }

            throw new IllegalStateException(
                "Native Horde invocation failed.",
                cause
            );
        } catch (ReflectiveOperationException error) {
            throw new IllegalStateException(
                "Native Horde reflection failed.",
                error
            );
        }
    }
}
