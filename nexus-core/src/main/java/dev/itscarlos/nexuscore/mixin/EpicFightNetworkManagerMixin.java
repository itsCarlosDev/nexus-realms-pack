package dev.itscarlos.nexuscore.mixin;

import dev.itscarlos.nexuscore.network.EpicFightRegistryBridge;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(targets = "yesman.epicfight.network.EpicFightNetworkManager", remap = false)
public abstract class EpicFightNetworkManagerMixin {

    @Inject(
        method = "sendToServer",
        at = @At("HEAD"),
        cancellable = true,
        remap = false
    )
    private static void nexuscore$bridgeLargeAnimationRegistry(
        Object message,
        CallbackInfo callbackInfo
    ) {
        if (EpicFightRegistryBridge.interceptClientMessage(message)) {
            callbackInfo.cancel();
        }
    }
}
