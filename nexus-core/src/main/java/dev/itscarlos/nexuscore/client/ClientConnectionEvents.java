package dev.itscarlos.nexuscore.client;

import dev.itscarlos.nexuscore.NexusCore;
import net.minecraft.client.Minecraft;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ClientPlayerNetworkEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    value = Dist.CLIENT,
    bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class ClientConnectionEvents {

    private static final int PROFILE_APPLY_DELAY_TICKS = 2;
    private static final int PROFILE_SYNC_WAIT_TICKS = 100;

    private static boolean profileApplyPending;
    private static int profileApplyDelay;
    private static int profileSyncWait;

    private ClientConnectionEvents() {
    }

    @SubscribeEvent
    public static void onLogin(
        ClientPlayerNetworkEvent.LoggingIn event
    ) {
        /*
         * Do not clear ClientClassState here. A class packet can be queued
         * immediately around this event; clearing it would lose the only
         * authoritative value until the role changes again. Logout owns the
         * reset. Login only starts a bounded wait for the server sync.
         */
        scheduleProfileApply();
    }

    @SubscribeEvent
    public static void onLogout(
        ClientPlayerNetworkEvent.LoggingOut event
    ) {
        ClientProgressionState.reset();
        ClientClassState.reset();
    }

    @SubscribeEvent
    public static void onClientTick(
        TickEvent.ClientTickEvent event
    ) {
        if (
            event.phase != TickEvent.Phase.END ||
            !profileApplyPending
        ) {
            return;
        }

        if (profileSyncWait-- <= 0) {
            cancelProfileApply();
            return;
        }

        Minecraft minecraft = Minecraft.getInstance();

        if (
            !ClientClassState.isSynchronizedFromServer() ||
            minecraft.player == null ||
            minecraft.options == null ||
            minecraft.options.keyMappings.length == 0
        ) {
            return;
        }

        if (profileApplyDelay > 0) {
            profileApplyDelay--;
            return;
        }

        profileApplyPending = false;
        KeybindProfileManager.applyCurrentClass();
    }

    static void scheduleProfileApply() {
        profileApplyPending = true;
        profileApplyDelay = PROFILE_APPLY_DELAY_TICKS;
        profileSyncWait = PROFILE_SYNC_WAIT_TICKS;
    }

    static void cancelProfileApply() {
        profileApplyPending = false;
        profileApplyDelay = 0;
        profileSyncWait = 0;
    }
}
