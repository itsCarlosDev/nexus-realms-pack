package dev.itscarlos.nexuscore.mixin;

import dev.itscarlos.nexuscore.camera.CameraIntegrationPolicy;
import java.util.UUID;
import net.minecraft.server.level.ServerPlayer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Pseudo
@Mixin(
    targets = "de.maxhenkel.camera.net.PacketManager",
    remap = false
)
public abstract class CameraPacketManagerMixin {
    @Inject(
        method = "addBytes",
        at = @At("HEAD"),
        cancellable = true,
        remap = false
    )
    private void nexuscore$validateUploadFragment(
        ServerPlayer player,
        UUID imageId,
        int offset,
        int totalLength,
        byte[] fragment,
        CallbackInfo callbackInfo
    ) {
        if (player == null || imageId == null
            || !CameraIntegrationPolicy.isValidUploadFragment(
                totalLength,
                offset,
                fragment
            )) {
            callbackInfo.cancel();
        }
    }
}
