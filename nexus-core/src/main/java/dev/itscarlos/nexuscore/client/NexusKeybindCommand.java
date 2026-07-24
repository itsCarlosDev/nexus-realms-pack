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
 * Client-only command used to manually reapply the recommended keybind profile.
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
            Commands.literal("nexus_keybinds_apply")
                .executes(context -> {
                    boolean applied =
                        KeybindProfileManager.forceApplyCurrentClass();

                    Minecraft minecraft = Minecraft.getInstance();

                    if (minecraft.player != null) {
                        if (applied) {
                            minecraft.player.displayClientMessage(
                                Component.literal(
                                    "[Nexus] Perfil de controles reaplicado."
                                ),
                                false
                            );
                        } else {
                            minecraft.player.displayClientMessage(
                                Component.literal(
                                    "[Nexus] No se ha detectado una clase activa."
                                ),
                                false
                            );
                        }
                    }

                    return applied
                        ? Command.SINGLE_SUCCESS
                        : 0;
                })
        );
    }
}