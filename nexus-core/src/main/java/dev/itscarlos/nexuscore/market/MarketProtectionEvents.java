package dev.itscarlos.nexuscore.market;

import dev.itscarlos.nexuscore.NexusCore;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.FluidTags;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraftforge.common.util.BlockSnapshot;
import net.minecraftforge.event.entity.player.FillBucketEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.event.level.BlockEvent;
import net.minecraftforge.event.level.ExplosionEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fluids.FluidUtil;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = NexusCore.MOD_ID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class MarketProtectionEvents {
    private static final Component PROTECTED_MESSAGE = Component.literal("Esta zona está protegida por el Nexus.");
    private static final long MESSAGE_COOLDOWN_TICKS = 40L;
    private static final Map<UUID, Long> LAST_MESSAGE_TICK = new HashMap<>();

    private MarketProtectionEvents() {
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onBreak(BlockEvent.BreakEvent event) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(level, event.getPos())
            || MarketProtection.hasAdminBypass(event.getPlayer())) {
            return;
        }

        event.setCanceled(true);
        notifyPlayer(event.getPlayer());
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onPlace(BlockEvent.EntityPlaceEvent event) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || MarketProtection.hasAdminBypass(event.getEntity())
            || !hasProtectedPlacement(level, event)) {
            return;
        }

        event.setCanceled(true);
        notifyEntity(event.getEntity());
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onToolModification(BlockEvent.BlockToolModificationEvent event) {
        Player player = event.getPlayer();
        if (event.isSimulated()
            || !(event.getLevel() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(level, event.getPos())
            || (player != null && MarketProtection.hasAdminBypass(player))) {
            return;
        }

        event.setCanceled(true);
        notifyPlayer(player);
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onFarmlandTrample(BlockEvent.FarmlandTrampleEvent event) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(level, event.getPos())
            || MarketProtection.hasAdminBypass(event.getEntity())) {
            return;
        }

        event.setCanceled(true);
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onFluidPlacedBlock(BlockEvent.FluidPlaceBlockEvent event) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(level, event.getPos())) {
            return;
        }

        event.setNewState(event.getOriginalState());
        event.setCanceled(true);
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onExplosion(ExplosionEvent.Detonate event) {
        if (!(event.getLevel() instanceof ServerLevel level)) {
            return;
        }

        event.getAffectedBlocks().removeIf(pos -> MarketProtection.isInsideProtectedMarket(level, pos));
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onBucketUse(FillBucketEvent event) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || !(event.getEntity() instanceof ServerPlayer player)
            || MarketProtection.hasAdminBypass(player)
            || !(event.getTarget() instanceof BlockHitResult hitResult)) {
            return;
        }

        ItemStack stack = event.getEmptyBucket();
        BlockPos clickedPos = hitResult.getBlockPos();
        BlockPos adjacentPos = clickedPos.relative(hitResult.getDirection());
        if (!containsWaterOrLava(stack)
            || (
                !MarketProtection.isInsideProtectedMarket(level, clickedPos)
                    && !MarketProtection.isInsideProtectedMarket(level, adjacentPos)
            )) {
            return;
        }

        event.setCanceled(true);
        notifyPlayer(player);
    }

    @SubscribeEvent
    public static void onLogout(PlayerEvent.PlayerLoggedOutEvent event) {
        LAST_MESSAGE_TICK.remove(event.getEntity().getUUID());
    }

    @SubscribeEvent
    public static void onServerStopping(ServerStoppingEvent event) {
        LAST_MESSAGE_TICK.clear();
    }

    private static boolean hasProtectedPlacement(ServerLevel level, BlockEvent.EntityPlaceEvent event) {
        if (event instanceof BlockEvent.EntityMultiPlaceEvent multiPlaceEvent) {
            for (BlockSnapshot snapshot : multiPlaceEvent.getReplacedBlockSnapshots()) {
                if (MarketProtection.isInsideProtectedMarket(level, snapshot.getPos())) {
                    return true;
                }
            }
            return false;
        }

        return MarketProtection.isInsideProtectedMarket(level, event.getPos());
    }

    private static boolean containsWaterOrLava(ItemStack stack) {
        return FluidUtil.getFluidContained(stack)
            .map(fluidStack -> fluidStack.getFluid().is(FluidTags.WATER)
                || fluidStack.getFluid().is(FluidTags.LAVA))
            .orElse(false);
    }

    private static void notifyEntity(Entity entity) {
        if (entity instanceof Player player) {
            notifyPlayer(player);
        }
    }

    private static void notifyPlayer(Player player) {
        if (!(player instanceof ServerPlayer serverPlayer)) {
            return;
        }

        long currentTick = serverPlayer.serverLevel().getGameTime();
        Long lastTick = LAST_MESSAGE_TICK.get(serverPlayer.getUUID());
        if (lastTick != null && currentTick >= lastTick && currentTick - lastTick < MESSAGE_COOLDOWN_TICKS) {
            return;
        }

        LAST_MESSAGE_TICK.put(serverPlayer.getUUID(), currentTick);
        serverPlayer.sendSystemMessage(PROTECTED_MESSAGE);
    }
}
