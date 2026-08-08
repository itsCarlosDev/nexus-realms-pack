package dev.itscarlos.nexuscore.mixin;

import net.minecraft.server.level.ServerPlayer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Prevents History Stages from sending a Curios lock message while Forge is
 * still deserializing player capabilities and the network connection is null.
 * The CurioEquipEvent remains denied, so restriction enforcement is unchanged.
 */
@Pseudo
@Mixin(
    targets = "net.bananemdnsa.historystages.events.CuriosEquipLockHandler",
    remap = false
)
public abstract class HistoryStagesCuriosEquipLockHandlerMixin {

    @Inject(
        method = "showMessage",
        at = @At("HEAD"),
        cancellable = true,
        remap = false
    )
    private static void nexuscore$skipMessageBeforePlayerConnection(
        ServerPlayer player,
        CallbackInfo callbackInfo
    ) {
        if (player.connection == null) {
            callbackInfo.cancel();
        }
    }
}
