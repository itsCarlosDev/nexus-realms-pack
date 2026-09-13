package dev.itscarlos.nexuscore.horde;

import dev.itscarlos.nexuscore.NexusCore;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.GoalSelector;
import net.minecraft.world.entity.ai.goal.WrappedGoal;
import net.minecraftforge.common.capabilities.Capability;

import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

    private static final String HORDE_SAVED_DATA_CLASS =
        "net.smileycorp.hordes.hordeevent.capability.HordeSavedData";

    private static final String HORDES_CAPABILITIES_CLASS =
        "net.smileycorp.hordes.common.capability.HordesCapabilities";

    private static final String HORDE_SPAWN_CLASS =
        "net.smileycorp.hordes.hordeevent.capability.HordeSpawn";

    private static final String HORDE_TRACK_GOAL_CLASS =
        "net.smileycorp.hordes.common.ai.HordeTrackPlayerGoal";

    private static final UUID FOLLOW_RANGE_MODIFIER = UUID.fromString(
        "51cfe045-4248-409e-be37-556d67de4b97"
    );

    private static Class<?> hordeEventClass;
    private static Field dayField;

    private static Method spawnWaveMethod;
    private static Method getSpawnTableMethod;
    private static Method setSpawnTableMethod;
    private static Method isActiveMethod;
    private static Method stopEventMethod;

    private static Object tableLoader;
    private static Method getTableMethod;
    private static Method tableGetNameMethod;
    private static Method savedDataGetDataMethod;
    private static Method savedDataGetEventMethod;
    private static Field hordeSpawnCapabilityField;
    private static Method hordeSpawnSetPlayerUuidMethod;

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

            isActiveMethod =
                hordeEventClass.getMethod(
                    "isActive",
                    ServerPlayer.class
                );

            stopEventMethod =
                hordeEventClass.getMethod(
                    "stopEvent",
                    ServerPlayer.class,
                    boolean.class
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

            Class<?> savedDataClass =
                Class.forName(HORDE_SAVED_DATA_CLASS);

            savedDataGetDataMethod =
                savedDataClass.getMethod(
                    "getData",
                    ServerLevel.class
                );

            savedDataGetEventMethod =
                savedDataClass.getMethod(
                    "getEvent",
                    ServerPlayer.class
                );

            Class<?> capabilitiesClass =
                Class.forName(HORDES_CAPABILITIES_CLASS);

            hordeSpawnCapabilityField =
                capabilitiesClass.getField("HORDESPAWN");

            Class<?> hordeSpawnClass =
                Class.forName(HORDE_SPAWN_CLASS);

            hordeSpawnSetPlayerUuidMethod =
                hordeSpawnClass.getMethod(
                    "setPlayerUUID",
                    String.class
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

    /**
     * Stops the native event owned by this exact player after restart.
     * The Hordes stores its saved data in the Overworld.
     */
    public static boolean stopActiveEvent(
        ServerPlayer player
    ) {
        requireAvailable();

        if (player == null || player.getServer() == null) {
            return false;
        }

        Object savedData = invoke(
            savedDataGetDataMethod,
            null,
            player.getServer().overworld()
        );

        Object horde = invoke(
            savedDataGetEventMethod,
            savedData,
            player
        );

        if (horde == null) {
            return false;
        }

        Object active = invoke(
            isActiveMethod,
            horde,
            player
        );

        if (!(active instanceof Boolean) || !((Boolean) active)) {
            return false;
        }

        invoke(
            stopEventMethod,
            horde,
            player,
            true
        );

        return true;
    }

    /**
     * Compensates for The Hordes 1.6.3f stopEvent clearing its entity set
     * before its native cleanup loop. Only call for a marked Nexus mob.
     */
    public static void cleanupNativeMob(
        Mob mob,
        String expectedSession
    ) {
        requireAvailable();

        String session = expectedSession == null
            ? ""
            : expectedSession.trim();

        if (
            mob == null
            || session.isEmpty()
            || !HordeTargeting.isNexusHordeMob(mob)
            || !session.equals(
                mob.getPersistentData().getString(
                    HordeTargeting.SESSION_KEY
                )
            )
        ) {
            return;
        }

        try {
            removeHordeTrackGoals(mob);
        } catch (RuntimeException error) {
            NexusCore.LOGGER.error(
                "Unable to remove native Horde goals from Nexus mob {} (session={}).",
                mob.getUUID(),
                session,
                error
            );
        }

        try {
            Object capabilityObject =
                hordeSpawnCapabilityField.get(null);

            if (capabilityObject instanceof Capability<?> capability) {
                mob.getCapability(capability).ifPresent(
                    hordeSpawn -> invoke(
                        hordeSpawnSetPlayerUuidMethod,
                        hordeSpawn,
                        ""
                    )
                );
            }
        } catch (IllegalAccessException | RuntimeException error) {
            NexusCore.LOGGER.error(
                "Unable to clear HordeSpawn ownership from Nexus mob {} (session={}).",
                mob.getUUID(),
                session,
                error
            );
        }

        AttributeInstance followRange =
            mob.getAttribute(Attributes.FOLLOW_RANGE);

        if (followRange != null) {
            followRange.removeModifier(FOLLOW_RANGE_MODIFIER);
        }
    }

    private static void removeHordeTrackGoals(Mob mob) {
        List<Field> selectorFields = new ArrayList<>();

        for (Field field : Mob.class.getDeclaredFields()) {
            if (GoalSelector.class.isAssignableFrom(field.getType())) {
                field.setAccessible(true);
                selectorFields.add(field);
            }
        }

        for (Field field : selectorFields) {
            final GoalSelector selector;

            try {
                selector = (GoalSelector) field.get(mob);
            } catch (IllegalAccessException error) {
                throw new IllegalStateException(
                    "Unable to inspect Horde mob goals.",
                    error
                );
            }

            if (selector == null) {
                continue;
            }

            WrappedGoal[] goals = selector
                .getAvailableGoals()
                .toArray(WrappedGoal[]::new);

            for (WrappedGoal wrapped : goals) {
                if (
                    wrapped != null
                    && wrapped.getGoal() != null
                    && HORDE_TRACK_GOAL_CLASS.equals(
                        wrapped.getGoal().getClass().getName()
                    )
                ) {
                    selector.removeGoal(wrapped.getGoal());
                }
            }
        }
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
