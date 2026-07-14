package dev.itscarlos.nexuscore.client;

import dev.itscarlos.nexuscore.network.ProgressionSyncPacket;
import dev.itscarlos.nexuscore.progression.ProgressionState;
import net.minecraft.client.Minecraft;
import net.minecraft.client.resources.sounds.SimpleSoundInstance;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.Util;

public final class ClientProgressionState {
    private static final long UNLOCK_DISPLAY_MILLIS = 6000L;
    private static ProgressionState state = ProgressionState.unavailable();
    private static long unlockStartedAt = -1L;

    private ClientProgressionState() {
    }

    public static void accept(ProgressionSyncPacket packet) {
        state = packet.state();
        if (packet.showUnlock()) {
            unlockStartedAt = Util.getMillis();
            Minecraft minecraft = Minecraft.getInstance();
            if (minecraft.getSoundManager() != null) {
                minecraft.getSoundManager().play(
                    SimpleSoundInstance.forUI(SoundEvents.UI_TOAST_CHALLENGE_COMPLETE, 1.0F)
                );
            }
        }
    }

    public static ProgressionState get() {
        return state;
    }

    public static void reset() {
        state = ProgressionState.unavailable();
        unlockStartedAt = -1L;
    }

    public static float unlockProgress() {
        if (unlockStartedAt < 0L) {
            return -1.0F;
        }

        long elapsed = Util.getMillis() - unlockStartedAt;
        if (elapsed >= UNLOCK_DISPLAY_MILLIS) {
            unlockStartedAt = -1L;
            return -1.0F;
        }
        return elapsed / (float) UNLOCK_DISPLAY_MILLIS;
    }
}
