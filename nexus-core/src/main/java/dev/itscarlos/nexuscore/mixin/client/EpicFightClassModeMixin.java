package dev.itscarlos.nexuscore.mixin.client;

import dev.itscarlos.nexuscore.NexusClass;
import dev.itscarlos.nexuscore.client.ClientClassState;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Keeps Epic Fight exclusive to the local Warrior player.
 *
 * Epic Tweaks may request Battle Mode automatically when the held item is
 * considered a combat item. Gunslingers and Mages must still be able to use
 * vanilla swords, but those swords must remain in vanilla combat mode.
 *
 * This mixin intentionally targets LocalPlayerPatch rather than PlayerPatch:
 * remote players must still be allowed to enter Epic Fight mode so their
 * animations are rendered correctly on non-Warrior clients.
 */
@Pseudo
@Mixin(
    targets =
        "yesman.epicfight.client.world.capabilites.entitypatch.player.LocalPlayerPatch",
    remap = false,
    priority = 1500
)
public abstract class EpicFightClassModeMixin {

    @Shadow(remap = false)
    public abstract void toVanillaMode(
        boolean synchronize
    );

    @Inject(
        method = "toEpicFightMode(Z)V",
        at = @At("HEAD"),
        cancellable = true,
        remap = false
    )
    private void nexuscore$keepNonWarriorsInVanillaMode(
        boolean synchronize,
        CallbackInfo callbackInfo
    ) {
        /*
         * Do not make a class decision before the authoritative server state
         * has reached the client.
         */
        if (!ClientClassState.isSynchronizedFromServer()) {
            return;
        }

        /*
         * Warriors may use Epic Fight normally.
         */
        if (ClientClassState.get() == NexusClass.WARRIOR) {
            return;
        }

        /*
         * Only the LOCAL Mage/Gunslinger is forced to vanilla mode.
         * Remote Warrior players are not affected by this mixin.
         */
        this.toVanillaMode(synchronize);
        callbackInfo.cancel();
    }
}