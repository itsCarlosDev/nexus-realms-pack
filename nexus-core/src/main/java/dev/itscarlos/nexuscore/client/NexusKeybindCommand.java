package dev.itscarlos.nexuscore.client;

import com.mojang.brigadier.Command;
import dev.itscarlos.nexuscore.NexusCore;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import net.minecraft.commands.Commands;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RegisterClientCommandsEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

/**
 * Client-only recovery command for reapplying the synchronized class profile.
 */
@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    value = Dist.CLIENT,
    bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class NexusKeybindCommand {

    private NexusKeybindCommand() {
    }

    @SubscribeEvent
    public static void register(RegisterClientCommandsEvent event) {
        event.getDispatcher().register(
            Commands.literal("nexus_keybind_reapply")
                .executes(context -> {
                    ClientConnectionEvents.scheduleProfileApply();

                    Minecraft minecraft = Minecraft.getInstance();

                    if (minecraft.player != null) {
                        minecraft.player.displayClientMessage(
                            Component.literal(
                                "[Nexus] Reaplicación del perfil programada "
                                    + "para dentro de dos ticks."
                            ),
                            false
                        );
                    }

                    return Command.SINGLE_SUCCESS;
                })
        );
    }
}
