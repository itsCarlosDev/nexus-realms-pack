package dev.itscarlos.nexuscore.mixin;

import dev.itscarlos.nexuscore.market.AutomobilityMarketPolicy;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.phys.Vec3;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(
    targets = "io.github.foundationgames.automobility.automobile.attachment.rear.BasePlowRearAttachment",
    remap = false
)
public abstract class AutomobilityBasePlowMixin {
    @Inject(
        method = "plow",
        at = @At("HEAD"),
        cancellable = true,
        remap = false
    )
    private void nexuscore$protectMarketPlow(
        Vec3 origin,
        ServerLevel level,
        CallbackInfo callbackInfo
    ) {
        if (AutomobilityMarketPolicy.shouldCancelModification(
            this,
            level,
            origin,
            -0.25D
        )) {
            callbackInfo.cancel();
        }
    }
}
