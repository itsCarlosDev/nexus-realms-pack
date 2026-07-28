package dev.itscarlos.nexuscore;

import com.mojang.logging.LogUtils;
import net.minecraft.server.level.ServerPlayer;
import org.slf4j.Logger;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.HashSet;
import java.util.Set;

/**
 * Server-safe bridge for HistoryStages.
 *
 * KubeJS/Rhino must not inspect SyncIndividualStagesPacket directly because
 * that class contains client-only Minecraft references in its packet handler.
 */
public final class HistoryStagesCompat {
    private static final Logger LOGGER = LogUtils.getLogger();

    private static final String PACKET_CLASS =
            "net.bananemdnsa.historystages.network.SyncIndividualStagesPacket";

    private static final String HANDLER_CLASS =
            "net.bananemdnsa.historystages.network.PacketHandler";

    private HistoryStagesCompat() {
    }

    public static boolean sendIndividualStages(
            ServerPlayer player,
            Set<String> unlockedStages
    ) {
        if (player == null || unlockedStages == null) {
            return false;
        }

        try {
            ClassLoader loader = HistoryStagesCompat.class.getClassLoader();

            Class<?> packetClass = Class.forName(
                    PACKET_CLASS,
                    true,
                    loader
            );

            Constructor<?> packetConstructor =
                    packetClass.getConstructor(Set.class);

            Object packet = packetConstructor.newInstance(
                    new HashSet<>(unlockedStages)
            );

            Class<?> handlerClass = Class.forName(
                    HANDLER_CLASS,
                    true,
                    loader
            );

            Method sendMethod = handlerClass.getMethod(
                    "sendIndividualStagesToPlayer",
                    packetClass,
                    ServerPlayer.class
            );

            sendMethod.invoke(null, packet, player);
            return true;
        } catch (ReflectiveOperationException | LinkageError exception) {
            LOGGER.error(
                    "[Nexus Core] Failed to synchronize HistoryStages data for {}",
                    player.getGameProfile().getName(),
                    exception
            );
            return false;
        }
    }
}