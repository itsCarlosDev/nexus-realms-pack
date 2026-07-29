package dev.itscarlos.nexuscore.market;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.Level;
import net.minecraftforge.common.util.FakePlayer;

public final class MarketProtection {
    public static final int ADMIN_PERMISSION_LEVEL = 2;

    private MarketProtection() {
    }

    public static boolean isInsideProtectedMarket(Level level, BlockPos pos) {
        if (!(level instanceof ServerLevel serverLevel)) {
            return false;
        }

        return MarketProtectionData.get(serverLevel.getServer()).isInside(serverLevel, pos);
    }

    public static boolean hasAdminBypass(Entity entity) {
        return entity instanceof ServerPlayer player
            && !(player instanceof FakePlayer)
            && player.createCommandSourceStack().hasPermission(ADMIN_PERMISSION_LEVEL);
    }
}
