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
 * Keeps Epic Fight exclusive to the Warrior class.
 *
 * Epic Tweaks may request Battle Mode automatically when the held item is
 * considered a combat item. Gunslingers and Mages must still be able to use
 * vanilla swords, but those swords must remain in vanilla combat mode.
 */
@Pseudo
@Mixin(
    targets =
        "yesman.epicfight.world.capabilities.entitypatch.player.PlayerPatch",
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
         * has reached the client. This prevents an incorrect restriction
         * during login and dimension transitions.
         */
        if (!ClientClassState.isSynchronizedFromServer()) {
            return;
        }

        if (ClientClassState.get() == NexusClass.WARRIOR) {
            return;
        }

        /*
         * A Mage, Gunslinger or synchronized player without a class must not
         * enter Epic Fight mode. Force vanilla mode in case Battle Mode was
         * already active, then cancel the attempted transition.
         */
        this.toVanillaMode(synchronize);
        callbackInfo.cancel();
    }
}
