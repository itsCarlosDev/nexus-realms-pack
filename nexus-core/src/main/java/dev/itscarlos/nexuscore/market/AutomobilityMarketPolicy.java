package dev.itscarlos.nexuscore.market;

import dev.itscarlos.nexuscore.NexusCore;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Predicate;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.phys.Vec3;

/**
 * Narrow compatibility policy for Automobility attachments that call
 * ServerLevel#setBlock or ServerLevel#destroyBlock directly.
 */
public final class AutomobilityMarketPolicy {
    private static final Map<Class<?>, Optional<Method>> AUTOMOBILE_ACCESSORS =
        new ConcurrentHashMap<>();

    private AutomobilityMarketPolicy() {
    }

    public static boolean shouldCancelModification(
        Object attachment,
        ServerLevel level,
        Vec3 origin,
        double yOffset
    ) {
        if (!touchesProtectedFootprint(
            origin,
            yOffset,
            pos -> MarketProtection.isInsideProtectedMarket(level, pos)
        )) {
            return false;
        }

        return !MarketProtection.hasAdminBypass(
            getControllingPassenger(attachment)
        );
    }

    static boolean touchesProtectedFootprint(
        Vec3 origin,
        double yOffset,
        Predicate<BlockPos> isProtected
    ) {
        int minX = (int) Math.floor(origin.x - 0.5D);
        int maxX = (int) Math.floor(origin.x + 0.5D);
        int y = (int) Math.floor(origin.y + yOffset);
        int minZ = (int) Math.floor(origin.z - 0.5D);
        int maxZ = (int) Math.floor(origin.z + 0.5D);

        for (int x = minX; x <= maxX; x++) {
            for (int z = minZ; z <= maxZ; z++) {
                if (isProtected.test(new BlockPos(x, y, z))) {
                    return true;
                }
            }
        }

        return false;
    }

    private static Entity getControllingPassenger(Object attachment) {
        if (attachment == null) {
            return null;
        }

        try {
            Optional<Method> accessor = AUTOMOBILE_ACCESSORS.computeIfAbsent(
                attachment.getClass(),
                AutomobilityMarketPolicy::findAutomobileAccessor
            );

            if (accessor.isEmpty()) {
                return null;
            }

            Object automobile = accessor.get().invoke(attachment);

            if (automobile instanceof Entity entity) {
                return entity.getControllingPassenger();
            }
        } catch (IllegalAccessException | InvocationTargetException error) {
            NexusCore.LOGGER.warn(
                "Unable to inspect Automobility vehicle controller; "
                    + "protected-market modification remains blocked",
                error
            );
        }

        return null;
    }

    private static Optional<Method> findAutomobileAccessor(
        Class<?> attachmentClass
    ) {
        try {
            return Optional.of(attachmentClass.getMethod("automobile"));
        } catch (NoSuchMethodException error) {
            NexusCore.LOGGER.warn(
                "Automobility attachment has no public automobile() "
                    + "accessor; protected-market modification remains "
                    + "blocked: {}",
                attachmentClass.getName()
            );
            return Optional.empty();
        }
    }
}
