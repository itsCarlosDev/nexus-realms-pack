package dev.itscarlos.nexuscore.progression;

import dev.itscarlos.nexuscore.NexusCore;
import java.lang.reflect.Method;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.MinecraftServer;

public final class KubeJsServerData {
    private static final String ACCESSOR = "kjs$getPersistentData";
    private static final Map<Class<?>, Method> ACCESSORS = new ConcurrentHashMap<>();

    private KubeJsServerData() {
    }

    public static CompoundTag get(MinecraftServer server) {
        try {
            Method accessor = ACCESSORS.computeIfAbsent(server.getClass(), type -> {
                try {
                    return type.getMethod(ACCESSOR);
                } catch (ReflectiveOperationException exception) {
                    throw new IllegalStateException(exception);
                }
            });
            Object value = accessor.invoke(server);
            return value instanceof CompoundTag tag ? tag : null;
        } catch (Exception exception) {
            NexusCore.LOGGER.error("Unable to read KubeJS server persistentData.", exception);
            return null;
        }
    }

    public static ProgressionState readProgression(MinecraftServer server) {
        CompoundTag data = get(server);
        if (data == null) {
            return ProgressionState.unavailable();
        }

        int era = Math.max(0, Math.min(4, data.getInt("nexusEra")));
        int worldDay = server.overworld() == null
            ? -1
            : (int) Math.floorDiv(server.overworld().getDayTime(), 24000L);
        return new ProgressionState(
            era,
            worldDay,
            data.contains("nexusEraUnlockDay") ? data.getInt("nexusEraUnlockDay") : -1,
            data.contains("nexusNextHordeDay") ? data.getInt("nexusNextHordeDay") : -1,
            data.getBoolean("nexusHordeActive"),
            Math.max(0, data.getInt("nexusHordeParticipantCount")),
            data.contains("nexusPendingEra") ? data.getInt("nexusPendingEra") : -1,
            data.contains("nexusPendingEraRequestedDay") ? data.getInt("nexusPendingEraRequestedDay") : -1,
            Math.max(0, data.getInt("nexusEraMilestoneCompleted"))
        );
    }
}
