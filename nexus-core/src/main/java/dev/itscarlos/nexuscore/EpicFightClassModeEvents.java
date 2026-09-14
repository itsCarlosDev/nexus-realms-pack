package dev.itscarlos.nexuscore;

import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import yesman.epicfight.api.forgeevent.BattleModeSustainableEvent;
import yesman.epicfight.api.forgeevent.ChangePlayerModeEvent;
import yesman.epicfight.world.capabilities.entitypatch.player.PlayerPatch;

/**
 * Enforces the authoritative Nexus class policy for Epic Fight Battle Mode.
 */
@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class EpicFightClassModeEvents {

    private EpicFightClassModeEvents() {
    }

    @SubscribeEvent
    public static void onChangePlayerMode(
        ChangePlayerModeEvent event
    ) {
        if (
            event.getPlayerMode()
                != PlayerPatch.PlayerMode.EPICFIGHT
        ) {
            return;
        }

        if (
            event.getPlayerPatch().getOriginal()
                instanceof ServerPlayer player
            && ClassData.getPlayerClass(player)
                != NexusClass.WARRIOR
        ) {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void onBattleModeSustainable(
        BattleModeSustainableEvent event
    ) {
        if (
            event.getPlayerPatch().getOriginal()
                instanceof ServerPlayer player
            && ClassData.getPlayerClass(player)
                != NexusClass.WARRIOR
        ) {
            event.setCanceled(true);
        }
    }
}
