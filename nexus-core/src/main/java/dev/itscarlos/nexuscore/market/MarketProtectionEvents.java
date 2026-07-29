package dev.itscarlos.nexuscore.market;

import dev.itscarlos.nexuscore.NexusCore;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.DamageTypeTags;
import net.minecraft.tags.FluidTags;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LightningBolt;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.BaseFireBlock;
import net.minecraft.world.level.block.piston.PistonStructureResolver;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraftforge.common.util.BlockSnapshot;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.EntityJoinLevelEvent;
import net.minecraftforge.event.entity.EntityMobGriefingEvent;
import net.minecraftforge.event.entity.EntityStruckByLightningEvent;
import net.minecraftforge.event.entity.living.LivingAttackEvent;
import net.minecraftforge.event.entity.living.LivingDestroyBlockEvent;
import net.minecraftforge.event.entity.living.MobSpawnEvent;
import net.minecraftforge.event.entity.player.FillBucketEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.event.level.BlockEvent;
import net.minecraftforge.event.level.ExplosionEvent;
import net.minecraftforge.event.level.PistonEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.Event;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fluids.FluidUtil;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class MarketProtectionEvents {
    private static final Component PROTECTED_MESSAGE =
        Component.literal("Esta zona está protegida por el Nexus.");

    private static final Component ENTER_MESSAGE =
        Component.literal("Bienvenido al mercado, el Nexus protege esta zona.");

    private static final Component EXIT_MESSAGE =
        Component.literal("Has abandonado la protección del Nexus.");

    /*
     * Las entidades generadas por nexus_horde_director.js reciben una
     * etiqueta como:
     *
     * nexus_horde_550e8400e29b41d4a716446655440000
     */
    private static final String HORDE_TAG_PREFIX = "nexus_horde_";

    /*
     * También se cancelan rayos que caigan ligeramente fuera de la frontera,
     * porque el fuego del rayo puede generarse alrededor de su posición.
     */
    private static final int LIGHTNING_PROTECTION_MARGIN = 2;

    private static final long MESSAGE_COOLDOWN_TICKS = 40L;
    private static final int BOUNDARY_CHECK_INTERVAL_TICKS = 10;

    private static final Map<UUID, Long> LAST_MESSAGE_TICK = new HashMap<>();
    private static final Map<UUID, Boolean> PLAYER_INSIDE_MARKET =
        new HashMap<>();

    private MarketProtectionEvents() {
    }

    /*
     * ==============================================================
     * SPAWN DE ENTIDADES
     * ==============================================================
     */

    /**
     * Bloquea los spawns hostiles normales dentro del mercado.
     *
     * Conserva criaturas no hostiles y las excepciones EVENT, COMMAND y
     * SPAWN_EGG. Las entidades pertenecientes a una horda Nexus también están
     * permitidas.
     */
    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onMobSpawnCheck(MobSpawnEvent.PositionCheck event) {
        if (!(event.getLevel() instanceof ServerLevel level)) {
            return;
        }

        BlockPos spawnPos = BlockPos.containing(
            event.getX(),
            event.getY(),
            event.getZ()
        );

        if (MarketSpawnPolicy.blocks(
                event.getEntity().getType().getCategory(),
                event.getSpawnType()
            )
            && MarketProtection.isInsideProtectedMarket(level, spawnPos)
            && !isNexusHordeEntity(event.getEntity())) {
            event.setResult(Event.Result.DENY);
        }
    }

    /**
     * Impide que un rayo caiga dentro o inmediatamente al lado del mercado.
     */
    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onEntityJoinLevel(EntityJoinLevelEvent event) {
        if (!(event.getLevel() instanceof ServerLevel level)) {
            return;
        }

        Entity entity = event.getEntity();

        if (entity instanceof LightningBolt) {
            if (isInsideOrNearProtectedMarket(
                level,
                entity.blockPosition(),
                LIGHTNING_PROTECTION_MARGIN
            )) {
                event.setCanceled(true);
            }

            return;
        }
    }

    /*
     * ==============================================================
     * RAYOS, FUEGO Y DAÑO AMBIENTAL
     * ==============================================================
     */

    /**
     * Protección adicional por si un rayo situado fuera de la frontera
     * alcanza una entidad situada dentro.
     */
    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onEntityStruckByLightning(
        EntityStruckByLightningEvent event
    ) {
        Entity target = event.getEntity();

        if (!(target.level() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(
                level,
                target.blockPosition()
            )) {
            return;
        }

        event.setCanceled(true);
    }

    /**
     * Elimina fuego normal y fuego de almas dentro del mercado o en el
     * bloque inmediatamente exterior a su frontera.
     *
     * Ese bloque exterior funciona como barrera para que el fuego no pueda
     * propagarse hacia los edificios protegidos.
     */
    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onNeighborNotify(
        BlockEvent.NeighborNotifyEvent event
    ) {
        if (!(event.getLevel() instanceof ServerLevel level)) {
            return;
        }

        extinguishFireIfThreatensMarket(level, event.getPos());

        for (Direction direction : event.getNotifiedSides()) {
            extinguishFireIfThreatensMarket(
                level,
                event.getPos().relative(direction)
            );
        }
    }

    /**
     * Evita daño de fuego o explosión a jugadores, NPC y otras entidades
     * que estén dentro de la zona segura.
     */
    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onLivingAttack(LivingAttackEvent event) {
        LivingEntity entity = event.getEntity();

        if (!(entity.level() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(
                level,
                entity.blockPosition()
            )) {
            return;
        }

        if (event.getSource().is(DamageTypeTags.IS_FIRE)
            || event.getSource().is(DamageTypeTags.IS_EXPLOSION)) {
            event.setCanceled(true);
        }
    }

    /*
     * ==============================================================
     * ROTURA Y MODIFICACIÓN DE BLOQUES
     * ==============================================================
     */

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onLeftClickBlock(
        PlayerInteractEvent.LeftClickBlock event
    ) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(
                level,
                event.getPos()
            )
            || MarketProtection.hasAdminBypass(event.getEntity())) {
            return;
        }

        event.setCanceled(true);
        notifyPlayer(event.getEntity());
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onBreak(BlockEvent.BreakEvent event) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(
                level,
                event.getPos()
            )
            || MarketProtection.hasAdminBypass(event.getPlayer())) {
            return;
        }

        event.setCanceled(true);
        notifyPlayer(event.getPlayer());
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onPlace(BlockEvent.EntityPlaceEvent event) {
        if (!(event.getLevel() instanceof ServerLevel level)) {
            return;
        }

        Entity placer = event.getEntity();

        if ((placer != null && MarketProtection.hasAdminBypass(placer))
            || !hasProtectedPlacement(level, event)) {
            return;
        }

        event.setCanceled(true);
        notifyEntity(placer);
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onToolModification(
        BlockEvent.BlockToolModificationEvent event
    ) {
        Player player = event.getPlayer();

        if (event.isSimulated()
            || !(event.getLevel() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(
                level,
                event.getPos()
            )
            || (player != null
                && MarketProtection.hasAdminBypass(player))) {
            return;
        }

        event.setCanceled(true);
        notifyPlayer(player);
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onFarmlandTrample(
        BlockEvent.FarmlandTrampleEvent event
    ) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(
                level,
                event.getPos()
            )
            || MarketProtection.hasAdminBypass(event.getEntity())) {
            return;
        }

        event.setCanceled(true);
    }

    /**
     * Bloquea destrucción directa causada por mobs.
     *
     * Esto cubre entidades que utilicen LivingDestroyBlockEvent en vez de
     * una explosión o un evento normal de rotura.
     */
    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onLivingDestroyBlock(
        LivingDestroyBlockEvent event
    ) {
        LivingEntity entity = event.getEntity();

        if (!(entity.level() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(
                level,
                event.getPos()
            )) {
            return;
        }

        event.setCanceled(true);
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onPortalSpawn(BlockEvent.PortalSpawnEvent event) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(
                level,
                event.getPos()
            )) {
            return;
        }

        event.setCanceled(true);
    }

    /*
     * ==============================================================
     * PISTONES
     * ==============================================================
     */

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onPistonMove(PistonEvent.Pre event) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || !pistonMovementTouchesMarket(level, event)) {
            return;
        }

        event.setCanceled(true);
    }

    /*
     * ==============================================================
     * FLUIDOS Y CUBOS
     * ==============================================================
     */

    /**
     * Evita:
     * - lava iniciando fuego;
     * - agua y lava creando piedra;
     * - creación de adoquín u obsidiana;
     * - transformaciones de bloques provocadas por fluidos.
     */
    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onFluidPlacedBlock(
        BlockEvent.FluidPlaceBlockEvent event
    ) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(
                level,
                event.getPos()
            )) {
            return;
        }

        event.setCanceled(true);
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onBucketFill(FillBucketEvent event) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || !(event.getEntity() instanceof ServerPlayer player)
            || MarketProtection.hasAdminBypass(player)
            || !(event.getTarget() instanceof BlockHitResult hitResult)) {
            return;
        }

        BlockPos fluidPos = hitResult.getBlockPos();

        if (!MarketProtection.isInsideProtectedMarket(level, fluidPos)
            || (
                !level.getFluidState(fluidPos).is(FluidTags.WATER)
                    && !level.getFluidState(fluidPos).is(FluidTags.LAVA)
            )) {
            return;
        }

        event.setCanceled(true);
        notifyPlayer(player);
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onBucketPlace(
        PlayerInteractEvent.RightClickBlock event
    ) {
        if (!(event.getLevel() instanceof ServerLevel level)
            || !(event.getEntity() instanceof ServerPlayer player)
            || MarketProtection.hasAdminBypass(player)
            || !containsWaterOrLava(event.getItemStack())) {
            return;
        }

        BlockPos clickedPos = event.getPos();
        BlockPos adjacentPos = clickedPos.relative(
            event.getHitVec().getDirection()
        );

        if (!MarketProtection.isInsideProtectedMarket(level, clickedPos)
            && !MarketProtection.isInsideProtectedMarket(
                level,
                adjacentPos
            )) {
            return;
        }

        event.setCancellationResult(InteractionResult.FAIL);
        event.setCanceled(true);
        notifyPlayer(player);
    }

    /*
     * ==============================================================
     * EXPLOSIONES Y MOB GRIEFING
     * ==============================================================
     */

    /**
     * Las explosiones que ocurran fuera pueden seguir existiendo, pero no
     * podrán afectar bloques ni entidades situadas dentro del mercado.
     */
    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onExplosion(ExplosionEvent.Detonate event) {
        if (!(event.getLevel() instanceof ServerLevel level)) {
            return;
        }

        event.getAffectedBlocks().removeIf(
            pos -> MarketProtection.isInsideProtectedMarket(level, pos)
        );

        event.getAffectedEntities().removeIf(
            entity -> MarketProtection.isInsideProtectedMarket(
                level,
                entity.blockPosition()
            )
        );
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onMobGriefing(EntityMobGriefingEvent event) {
        Entity entity = event.getEntity();

        if (!(entity.level() instanceof ServerLevel level)
            || !MarketProtection.isInsideProtectedMarket(
                level,
                entity.blockPosition()
            )) {
            return;
        }

        event.setResult(Event.Result.DENY);
    }

    /*
     * ==============================================================
     * ENTRADA, SALIDA Y LIMPIEZA
     * ==============================================================
     */

    @SubscribeEvent
    public static void onLogout(PlayerEvent.PlayerLoggedOutEvent event) {
        UUID playerId = event.getEntity().getUUID();

        LAST_MESSAGE_TICK.remove(playerId);
        PLAYER_INSIDE_MARKET.remove(playerId);
    }

    @SubscribeEvent
    public static void onPlayerTick(TickEvent.PlayerTickEvent event) {
        if (event.phase != TickEvent.Phase.END
            || !(event.player instanceof ServerPlayer player)
            || player.tickCount % BOUNDARY_CHECK_INTERVAL_TICKS != 0) {
            return;
        }

        ServerLevel level = player.serverLevel();
        MarketProtectionData data =
            MarketProtectionData.get(level.getServer());

        UUID playerId = player.getUUID();

        if (!data.enabled()
            || !data.isConfigured()
            || data.dimension() == null
            || !level.dimension()
                .location()
                .equals(data.dimension())) {
            PLAYER_INSIDE_MARKET.remove(playerId);
            return;
        }

        boolean inside = MarketProtection.isInsideProtectedMarket(
            level,
            player.blockPosition()
        );

        Boolean wasInside = PLAYER_INSIDE_MARKET.put(playerId, inside);

        if (wasInside == null) {
            if (inside) {
                player.displayClientMessage(ENTER_MESSAGE, true);
            }

            return;
        }

        if (wasInside.booleanValue() == inside) {
            return;
        }

        player.displayClientMessage(
            inside ? ENTER_MESSAGE : EXIT_MESSAGE,
            true
        );
    }

    @SubscribeEvent
    public static void onServerStopping(ServerStoppingEvent event) {
        LAST_MESSAGE_TICK.clear();
        PLAYER_INSIDE_MARKET.clear();
    }

    /*
     * ==============================================================
     * MÉTODOS AUXILIARES
     * ==============================================================
     */

    private static boolean isNexusHordeEntity(Entity entity) {
        for (String tag : entity.getTags()) {
            if (tag.startsWith(HORDE_TAG_PREFIX)) {
                return true;
            }
        }

        return false;
    }

    private static boolean isInsideOrNearProtectedMarket(
        ServerLevel level,
        BlockPos origin,
        int horizontalMargin
    ) {
        for (
            int offsetX = -horizontalMargin;
            offsetX <= horizontalMargin;
            offsetX++
        ) {
            for (
                int offsetZ = -horizontalMargin;
                offsetZ <= horizontalMargin;
                offsetZ++
            ) {
                BlockPos testPos = origin.offset(offsetX, 0, offsetZ);

                if (MarketProtection.isInsideProtectedMarket(
                    level,
                    testPos
                )) {
                    return true;
                }
            }
        }

        return false;
    }

    private static void extinguishFireIfThreatensMarket(
        ServerLevel level,
        BlockPos pos
    ) {
        if (!(level.getBlockState(pos).getBlock()
            instanceof BaseFireBlock)) {
            return;
        }

        if (MarketProtection.isInsideProtectedMarket(level, pos)
            || isAdjacentToProtectedMarket(level, pos)) {
            level.removeBlock(pos, false);
        }
    }

    private static boolean isAdjacentToProtectedMarket(
        ServerLevel level,
        BlockPos pos
    ) {
        for (Direction direction : Direction.values()) {
            if (MarketProtection.isInsideProtectedMarket(
                level,
                pos.relative(direction)
            )) {
                return true;
            }
        }

        return false;
    }

    private static boolean hasProtectedPlacement(
        ServerLevel level,
        BlockEvent.EntityPlaceEvent event
    ) {
        if (event instanceof BlockEvent.EntityMultiPlaceEvent multiPlace) {
            for (
                BlockSnapshot snapshot
                    : multiPlace.getReplacedBlockSnapshots()
            ) {
                if (MarketProtection.isInsideProtectedMarket(
                    level,
                    snapshot.getPos()
                )) {
                    return true;
                }
            }

            return false;
        }

        return MarketProtection.isInsideProtectedMarket(
            level,
            event.getPos()
        );
    }

    private static boolean pistonMovementTouchesMarket(
        ServerLevel level,
        PistonEvent.Pre event
    ) {
        if (MarketProtection.isInsideProtectedMarket(
                level,
                event.getPos()
            )
            || MarketProtection.isInsideProtectedMarket(
                level,
                event.getFaceOffsetPos()
            )) {
            return true;
        }

        PistonStructureResolver resolver = event.getStructureHelper();

        if (resolver == null || !resolver.resolve()) {
            return false;
        }

        Direction movementDirection = resolver.getPushDirection();

        for (BlockPos pos : resolver.getToPush()) {
            if (MarketProtection.isInsideProtectedMarket(level, pos)
                || MarketProtection.isInsideProtectedMarket(
                    level,
                    pos.relative(movementDirection)
                )) {
                return true;
            }
        }

        for (BlockPos pos : resolver.getToDestroy()) {
            if (MarketProtection.isInsideProtectedMarket(level, pos)) {
                return true;
            }
        }

        return false;
    }

    private static boolean containsWaterOrLava(ItemStack stack) {
        return FluidUtil.getFluidContained(stack)
            .map(
                fluidStack ->
                    fluidStack.getFluid().is(FluidTags.WATER)
                        || fluidStack
                            .getFluid()
                            .is(FluidTags.LAVA)
            )
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

        long currentTick = serverPlayer
            .serverLevel()
            .getServer()
            .getTickCount();

        UUID playerId = serverPlayer.getUUID();
        Long lastTick = LAST_MESSAGE_TICK.get(playerId);

        if (lastTick != null
            && currentTick >= lastTick
            && currentTick - lastTick < MESSAGE_COOLDOWN_TICKS) {
            return;
        }

        LAST_MESSAGE_TICK.put(playerId, currentTick);
        serverPlayer.displayClientMessage(PROTECTED_MESSAGE, true);
    }
}
