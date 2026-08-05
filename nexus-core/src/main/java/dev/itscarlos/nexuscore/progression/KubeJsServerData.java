package dev.itscarlos.nexuscore.progression;

import dev.itscarlos.nexuscore.NexusCore;
import java.lang.reflect.Method;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.MinecraftServer;

public final class KubeJsServerData {
    private static final String PERSISTENT_DATA_INTERFACE =
        "dev.latvian.mods.kubejs.core.WithPersistentData";
    private static final String ACCESSOR = "kjs$getPersistentData";
    private static final long CAMPAIGN_DAY_MILLIS = 86_400_000L;
    private static final int CAMPAIGN_LENGTH_DAYS = 30;
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
        int worldDay = server.overworld() == null
            ? -1
            : (int) Math.floorDiv(server.overworld().getDayTime(), 24000L);
        boolean campaignStarted = data.contains("nexusCampaignStarted")
            ? data.getBoolean("nexusCampaignStarted")
            : data.contains("nexusCampaignEpochMillis") && data.getLong("nexusCampaignEpochMillis") > 0L;
        int campaignDay = campaignStarted ? readCampaignDay(data) : -1;
        return new ProgressionState(
            era,
            worldDay,
            campaignStarted,
            campaignDay,
            CAMPAIGN_LENGTH_DAYS,
            data.getBoolean("nexusCampaignPaused"),
            data.contains("nexusEraUnlockDay") ? data.getInt("nexusEraUnlockDay") : -1,
            data.contains("nexusNextHordeDay") ? data.getInt("nexusNextHordeDay") : -1,
            data.getBoolean("nexusHordeActive"),
            Math.max(0, data.getInt("nexusHordeParticipantCount")),
            data.contains("nexusPendingEra") ? data.getInt("nexusPendingEra") : -1,
            data.contains("nexusPendingEraRequestedDay") ? data.getInt("nexusPendingEraRequestedDay") : -1,
            Math.max(0, data.getInt("nexusEraMilestoneCompleted"))
        );
    }

    private static int readCampaignDay(CompoundTag data) {
        if (!data.contains("nexusCampaignEpochMillis")) {
            return 1;
        }

        long effectiveNow = data.getBoolean("nexusCampaignPaused")
            ? data.getLong("nexusCampaignPausedAtMillis")
            : System.currentTimeMillis();
        long epoch = data.getLong("nexusCampaignEpochMillis");
        long pausedTotal = Math.max(0L, data.getLong("nexusCampaignPausedTotalMillis"));
        long elapsed = Math.max(0L, effectiveNow - epoch - pausedTotal);
        long day = Math.floorDiv(elapsed, CAMPAIGN_DAY_MILLIS) + 1L;
        return (int) Math.max(1L, Math.min(CAMPAIGN_LENGTH_DAYS, day));
    }
}
