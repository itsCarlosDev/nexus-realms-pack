package dev.itscarlos.nexuscore.nexus;

import com.mojang.brigadier.CommandDispatcher;
import dev.itscarlos.nexuscore.NexusCore;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Display;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.event.RegisterCommandsEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = NexusCore.MOD_ID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class NexusCrystalCommands {
    private static final int ADMIN_PERMISSION_LEVEL = 2;

    private NexusCrystalCommands() {
    }

    @SubscribeEvent
    public static void registerCommands(RegisterCommandsEvent event) {
        register(event.getDispatcher());
    }

    private static void register(CommandDispatcher<CommandSourceStack> dispatcher) {
        dispatcher.register(
            Commands.literal("nexus_crystal")
                .requires(source -> source.hasPermission(ADMIN_PERMISSION_LEVEL))
                .then(Commands.literal("spawn").executes(context -> spawn(context.getSource())))
                .then(Commands.literal("migrate").executes(context -> migrate(context.getSource())))
                .then(Commands.literal("remove").executes(context -> remove(context.getSource())))
                .then(Commands.literal("movehere").executes(context -> moveHere(context.getSource())))
                .then(Commands.literal("status").executes(context -> status(context.getSource())))
                .then(Commands.literal("purge").executes(context -> purge(context.getSource())))
        );
    }

    private static int spawn(CommandSourceStack source) {
        ServerLevel level = source.getLevel();
        Vec3 commandPos = source.getPosition();
        Vec3 basePos = new Vec3(
            commandPos.x,
            commandPos.y + NexusCrystalVisuals.SPAWN_BASE_OFFSET_Y,
            commandPos.z
        );

        removeV7Near(level, basePos, NexusCrystalVisuals.LOCAL_CLEANUP_RADIUS);
        removeLegacyNear(
            level,
            new Vec3(basePos.x, basePos.y + NexusCrystalVisuals.CENTER_Y, basePos.z),
            NexusCrystalVisuals.LOCAL_CLEANUP_RADIUS
        );

        NexusCrystalEntity crystal = createAt(level, basePos);
        if (crystal == null) {
            source.sendFailure(Component.literal("[Nexus] No se pudo crear nexuscore:nexus_crystal."));
            return 0;
        }

        source.sendSuccess(
            () -> Component.literal(
                "[Nexus] Cristal V7 creado. Una entidad Nexus Core; shell cutout + nucleo fullbright."
            ),
            true
        );
        return 1;
    }

    private static int migrate(CommandSourceStack source) {
        ServerLevel level = source.getLevel();
        Vec3 sourcePos = source.getPosition();

        Optional<Display.ItemDisplay> legacyOptional =
            nearestLegacy(level, sourcePos, NexusCrystalVisuals.COMMAND_SEARCH_RADIUS);

        if (legacyOptional.isEmpty()) {
            Optional<NexusCrystalEntity> existing =
                nearestV7(level, sourcePos, NexusCrystalVisuals.COMMAND_SEARCH_RADIUS);

            if (existing.isPresent()) {
                NexusCrystalEntity crystal = existing.get();
                source.sendSuccess(
                    () -> Component.literal(
                        "[Nexus] El Nexo ya es V7 en ["
                            + format(crystal.getX()) + ", "
                            + format(crystal.getY()) + ", "
                            + format(crystal.getZ()) + "]."
                    ),
                    false
                );
                return 1;
            }

            source.sendFailure(
                Component.literal(
                    "[Nexus] No se encontro ni el item_display antiguo ni un Cristal V7 a "
                        + (int) NexusCrystalVisuals.COMMAND_SEARCH_RADIUS
                        + " bloques."
                )
            );
            return 0;
        }

        Display.ItemDisplay legacy = legacyOptional.get();
        Vec3 legacyCenter = legacy.position();
        Vec3 newBase = new Vec3(
            legacyCenter.x,
            legacyCenter.y - NexusCrystalVisuals.LEGACY_DISPLAY_TO_BASE_Y,
            legacyCenter.z
        );

        removeV7Near(level, newBase, NexusCrystalVisuals.LOCAL_CLEANUP_RADIUS);
        int removedLegacy = removeLegacyNear(
            level,
            legacyCenter,
            NexusCrystalVisuals.LOCAL_CLEANUP_RADIUS
        );

        NexusCrystalEntity crystal = createAt(level, newBase);
        if (crystal == null) {
            source.sendFailure(
                Component.literal(
                    "[Nexus] La migracion retiro el display antiguo pero no pudo crear la entidad V7."
                )
            );
            return 0;
        }

        source.sendSuccess(
            () -> Component.literal(
                "[Nexus] Migracion V7 completada: "
                    + removedLegacy
                    + " display(s) antiguos eliminados y 1 nexuscore:nexus_crystal creado."
            ),
            true
        );
        source.sendSuccess(
            () -> Component.literal(
                "[Nexus] Centro visual conservado en ["
                    + format(legacyCenter.x) + ", "
                    + format(legacyCenter.y) + ", "
                    + format(legacyCenter.z) + "]."
            ),
            false
        );
        return 1;
    }

    private static int remove(CommandSourceStack source) {
        ServerLevel level = source.getLevel();
        Vec3 sourcePos = source.getPosition();

        int removedV7 = removeV7Near(
            level,
            sourcePos,
            NexusCrystalVisuals.COMMAND_SEARCH_RADIUS
        );
        int removedLegacy = removeLegacyNear(
            level,
            sourcePos,
            NexusCrystalVisuals.COMMAND_SEARCH_RADIUS
        );

        int total = removedV7 + removedLegacy;
        source.sendSuccess(
            () -> Component.literal(
                "[Nexus] Eliminados: " + removedV7 + " V7 + " + removedLegacy + " displays legacy."
            ),
            true
        );
        return total;
    }

    private static int moveHere(CommandSourceStack source) {
        ServerLevel level = source.getLevel();
        Vec3 sourcePos = source.getPosition();

        Optional<NexusCrystalEntity> existing =
            nearestV7(level, sourcePos, NexusCrystalVisuals.COMMAND_SEARCH_RADIUS);

        if (existing.isEmpty()) {
            source.sendFailure(
                Component.literal(
                    "[Nexus] No hay Cristal V7 cerca. Usa /nexus_crystal migrate o /nexus_crystal spawn."
                )
            );
            return 0;
        }

        NexusCrystalEntity crystal = existing.get();
        crystal.setPos(
            sourcePos.x,
            sourcePos.y + NexusCrystalVisuals.SPAWN_BASE_OFFSET_Y,
            sourcePos.z
        );
        crystal.setDeltaMovement(Vec3.ZERO);

        source.sendSuccess(
            () -> Component.literal(
                "[Nexus] Cristal V7 movido; centro visual conservado a +2.6 sobre el ejecutor."
            ),
            true
        );
        return 1;
    }

    private static int status(CommandSourceStack source) {
        ServerLevel level = source.getLevel();
        Vec3 sourcePos = source.getPosition();

        List<NexusCrystalEntity> v7 = level.getEntitiesOfClass(
            NexusCrystalEntity.class,
            boxAround(sourcePos, NexusCrystalVisuals.COMMAND_SEARCH_RADIUS)
        );
        List<Display.ItemDisplay> legacy = legacyNear(
            level,
            sourcePos,
            NexusCrystalVisuals.COMMAND_SEARCH_RADIUS
        );

        source.sendSuccess(
            () -> Component.literal(
                "[Nexus] Estado cristal: V7=" + v7.size() + " | legacy item_display=" + legacy.size()
            ),
            false
        );

        nearestV7(level, sourcePos, NexusCrystalVisuals.COMMAND_SEARCH_RADIUS).ifPresent(crystal ->
            source.sendSuccess(
                () -> Component.literal(
                    "[Nexus] V7 mas cercano base=["
                        + format(crystal.getX()) + ", "
                        + format(crystal.getY()) + ", "
                        + format(crystal.getZ()) + "]"
                ),
                false
            )
        );

        return v7.isEmpty() ? 0 : 1;
    }

    private static int purge(CommandSourceStack source) {
        ServerLevel level = source.getLevel();
        Vec3 sourcePos = source.getPosition();
        double radius = 16.0D;

        int v7 = removeV7Near(level, sourcePos, radius);
        int legacy = removeLegacyNear(level, sourcePos, radius);

        source.sendSuccess(
            () -> Component.literal(
                "[Nexus] Purga segura 16 bloques: " + v7 + " V7 + " + legacy + " displays Nexus."
            ),
            true
        );
        return v7 + legacy;
    }

    private static NexusCrystalEntity createAt(ServerLevel level, Vec3 basePos) {
        NexusCrystalEntity crystal = NexusEntities.NEXUS_CRYSTAL.get().create(level);
        if (crystal == null) {
            return null;
        }

        crystal.setPos(basePos.x, basePos.y, basePos.z);
        crystal.setDeltaMovement(Vec3.ZERO);
        level.addFreshEntity(crystal);
        return crystal;
    }

    private static Optional<NexusCrystalEntity> nearestV7(
        ServerLevel level,
        Vec3 center,
        double radius
    ) {
        return level.getEntitiesOfClass(
                NexusCrystalEntity.class,
                boxAround(center, radius)
            )
            .stream()
            .min(Comparator.comparingDouble(entity ->
                entity.distanceToSqr(center.x, center.y, center.z)
            ));
    }

    private static Optional<Display.ItemDisplay> nearestLegacy(
        ServerLevel level,
        Vec3 center,
        double radius
    ) {
        return legacyNear(level, center, radius)
            .stream()
            .min(Comparator.comparingDouble(entity ->
                entity.distanceToSqr(center.x, center.y, center.z)
            ));
    }

    private static List<Display.ItemDisplay> legacyNear(
        ServerLevel level,
        Vec3 center,
        double radius
    ) {
        return level.getEntitiesOfClass(
            Display.ItemDisplay.class,
            boxAround(center, radius),
            NexusCrystalCommands::isLegacyNexusDisplay
        );
    }

    private static boolean isLegacyNexusDisplay(Display.ItemDisplay display) {
        return display.getTags().contains("nexus_crystal")
            || display.getTags().contains("nexus_crystal_display")
            || display.getTags().contains("nexus_crystal_core")
            || display.getTags().contains("nexus_crystal_aura");
    }

    private static int removeV7Near(ServerLevel level, Vec3 center, double radius) {
        List<NexusCrystalEntity> entities = level.getEntitiesOfClass(
            NexusCrystalEntity.class,
            boxAround(center, radius)
        );
        entities.forEach(NexusCrystalEntity::discard);
        return entities.size();
    }

    private static int removeLegacyNear(ServerLevel level, Vec3 center, double radius) {
        List<Display.ItemDisplay> entities = legacyNear(level, center, radius);
        entities.forEach(Display.ItemDisplay::discard);
        return entities.size();
    }

    private static AABB boxAround(Vec3 center, double radius) {
        return new AABB(
            center.x - radius,
            center.y - radius,
            center.z - radius,
            center.x + radius,
            center.y + radius,
            center.z + radius
        );
    }

    private static String format(double value) {
        return String.format(java.util.Locale.ROOT, "%.3f", value);
    }
}
