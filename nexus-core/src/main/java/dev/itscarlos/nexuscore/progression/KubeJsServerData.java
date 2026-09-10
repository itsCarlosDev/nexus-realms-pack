package dev.itscarlos.nexuscore.progression;

import dev.itscarlos.nexuscore.NexusCore;
import java.lang.reflect.Method;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.common.util.FakePlayer;

public final class KubeJsServerData {
    private static final String PERSISTENT_DATA_INTERFACE =
        "dev.latvian.mods.kubejs.core.WithPersistentData";
    private static final String ACCESSOR = "kjs$getPersistentData";
    private static int requiredOnlinePlayers = 3;
    private static final Map<Class<?>, Optional<Method>> ACCESSORS = new ConcurrentHashMap<>();
    private static final Set<Class<?>> INVOCATION_WARNINGS = ConcurrentHashMap.newKeySet();

    private KubeJsServerData() {
    }

    public static CompoundTag get(MinecraftServer server) {
        Optional<Method> resolved = ACCESSORS.computeIfAbsent(
            server.getClass(),
            KubeJsServerData::resolveAccessor
        );
        if (resolved.isEmpty()) {
            return null;
        }

        try {
            Object value = resolved.get().invoke(server);
            return value instanceof CompoundTag tag ? tag : null;
        } catch (ReflectiveOperationException exception) {
            if (INVOCATION_WARNINGS.add(server.getClass())) {
                NexusCore.LOGGER.error(
                    "Unable to invoke KubeJS server persistentData accessor; "
                        + "progression data is unavailable for this server instance.",
                    exception
                );
            }
            return null;
        }
    }

    private static Optional<Method> resolveAccessor(Class<?> serverType) {
        try {
            Class<?> persistentDataInterface = Class.forName(
                PERSISTENT_DATA_INTERFACE,
                false,
                serverType.getClassLoader()
            );
            if (!persistentDataInterface.isAssignableFrom(serverType)) {
                NexusCore.LOGGER.warn(
                    "KubeJS persistentData interface is present but was not injected into {}; "
                        + "progression data is unavailable.",
                    serverType.getName()
                );
                return Optional.empty();
            }

            Method accessor = persistentDataInterface.getMethod(ACCESSOR);
            NexusCore.LOGGER.info(
                "KubeJS server persistentData integration active via {}.",
                PERSISTENT_DATA_INTERFACE
            );
            return Optional.of(accessor);
        } catch (ClassNotFoundException exception) {
            NexusCore.LOGGER.warn(
                "KubeJS persistentData interface is unavailable; progression data is unavailable."
            );
            return Optional.empty();
        } catch (NoSuchMethodException exception) {
            NexusCore.LOGGER.warn(
                "KubeJS persistentData interface does not expose {}; progression data is unavailable.",
                ACCESSOR,
                exception
            );
            return Optional.empty();
        }
    }

    public static ProgressionState readProgression(MinecraftServer server) {
        CompoundTag data = get(server);
        if (data == null) {
            return ProgressionState.unavailable();
        }

        int era = Math.max(0, Math.min(4, data.getInt("nexusEra")));
        return new ProgressionState(
            era,
            data.contains("nexusNextHordeDay") ? data.getInt("nexusNextHordeDay") : -1,
            data.getBoolean("nexusHordeActive"),
            Math.max(0, data.getInt("nexusHordeParticipantCount")),
            data.contains("nexusPendingEra") ? data.getInt("nexusPendingEra") : -1,
            Math.max(era, data.getInt("nexusEraMilestoneCompleted")),
            countEligibleOnlinePlayers(server),
            requiredOnlinePlayers()
        );
    }

    // Set by the canonical KubeJS eras.json loader; never persisted in world NBT.
    public static void setRequiredOnlinePlayers(int required) {
        if (required < 1) {
            NexusCore.LOGGER.warn("Invalid progression quorum {}; using 3.", required);
            requiredOnlinePlayers = 3;
        } else {
            requiredOnlinePlayers = required;
        }
    }

    public static int requiredOnlinePlayers() {
        return requiredOnlinePlayers;
    }

    public static int countEligibleOnlinePlayers(MinecraftServer server) {
        int eligible = 0;
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            if (!(player instanceof FakePlayer) && !player.isSpectator()) {
                eligible++;
            }
        }
        return eligible;
    }
}
