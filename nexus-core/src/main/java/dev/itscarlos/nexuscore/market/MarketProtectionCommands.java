package dev.itscarlos.nexuscore.market;

import com.mojang.brigadier.arguments.IntegerArgumentType;
import dev.itscarlos.nexuscore.NexusCore;
import java.util.Locale;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.event.RegisterCommandsEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = NexusCore.MOD_ID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class MarketProtectionCommands {
    private MarketProtectionCommands() {
    }

    @SubscribeEvent
    public static void registerCommands(RegisterCommandsEvent event) {
        event.getDispatcher().register(
            Commands.literal("nexus_market")
                .requires(source -> source.hasPermission(MarketProtection.ADMIN_PERMISSION_LEVEL))
                .then(Commands.literal("set_center").executes(context -> setCenter(context.getSource())))
                .then(
                    Commands.literal("set_radius")
                        .then(
                            Commands.argument(
                                "radius",
                                IntegerArgumentType.integer(
                                    MarketProtectionData.MIN_RADIUS,
                                    MarketProtectionData.MAX_RADIUS
                                )
                            ).executes(context -> setRadius(
                                context.getSource(),
                                IntegerArgumentType.getInteger(context, "radius")
                            ))
                        )
                )
                .then(Commands.literal("enable").executes(context -> enable(context.getSource())))
                .then(Commands.literal("disable").executes(context -> disable(context.getSource())))
                .then(Commands.literal("status").executes(context -> status(context.getSource())))
        );
    }

    private static int setCenter(CommandSourceStack source) {
        BlockPos center = BlockPos.containing(
            source.getPosition().x,
            source.getPosition().y,
            source.getPosition().z
        );
        ResourceLocation dimension = source.getLevel().dimension().location();
        MarketProtectionData data = MarketProtectionData.get(source.getServer());
        data.setCenter(dimension, center);

        source.sendSuccess(
            () -> Component.literal(
                "Centro del Nexus Market guardado en "
                    + dimension
                    + " ["
                    + center.getX()
                    + ", "
                    + center.getY()
                    + ", "
                    + center.getZ()
                    + "]."
            ),
            false
        );
        return 1;
    }

    private static int setRadius(CommandSourceStack source, int radius) {
        MarketProtectionData data = MarketProtectionData.get(source.getServer());
        data.setRadius(radius);
        source.sendSuccess(
            () -> Component.literal("Radio horizontal del Nexus Market guardado: " + radius + " bloques."),
            false
        );
        return radius;
    }

    private static int enable(CommandSourceStack source) {
        MarketProtectionData data = MarketProtectionData.get(source.getServer());
        if (!data.enable()) {
            source.sendFailure(
                Component.literal(
                    "Configuración incompleta. Ejecuta /nexus_market set_center y /nexus_market set_radius <radio>."
                )
            );
            return 0;
        }

        source.sendSuccess(() -> Component.literal("Protección del Nexus Market activada."), true);
        return 1;
    }

    private static int disable(CommandSourceStack source) {
        MarketProtectionData.get(source.getServer()).disable();
        source.sendSuccess(
            () -> Component.literal("Protección del Nexus Market desactivada; la configuración se conserva."),
            true
        );
        return 1;
    }

    private static int status(CommandSourceStack source) {
        MarketProtectionData data = MarketProtectionData.get(source.getServer());
        source.sendSuccess(
            () -> Component.literal("Protección Nexus Market: " + (data.enabled() ? "ACTIVADA" : "DESACTIVADA")),
            false
        );
        source.sendSuccess(
            () -> Component.literal("Configuración completa: " + (data.isConfigured() ? "sí" : "no")),
            false
        );

        if (data.centerConfigured()) {
            source.sendSuccess(
                () -> Component.literal(
                    "Dimensión: "
                        + data.dimension()
                        + " | centro: ["
                        + data.centerX()
                        + ", "
                        + data.centerY()
                        + ", "
                        + data.centerZ()
                        + "]"
                ),
                false
            );
        } else {
            source.sendSuccess(() -> Component.literal("Dimensión y centro: sin configurar"), false);
        }

        source.sendSuccess(
            () -> Component.literal(
                "Radio horizontal: " + (data.radiusConfigured() ? data.radius() + " bloques" : "sin configurar")
            ),
            false
        );

        if (source.getEntity() instanceof ServerPlayer
            && data.centerConfigured()
            && source.getLevel().dimension().location().equals(data.dimension())) {
            double deltaX = source.getPosition().x - (data.centerX() + 0.5D);
            double deltaZ = source.getPosition().z - (data.centerZ() + 0.5D);
            double distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
            source.sendSuccess(
                () -> Component.literal(
                    "Distancia horizontal actual al centro: "
                        + String.format(Locale.ROOT, "%.1f", distance)
                        + " bloques."
                ),
                false
            );
        }

        return data.enabled() ? 1 : 0;
    }
}
