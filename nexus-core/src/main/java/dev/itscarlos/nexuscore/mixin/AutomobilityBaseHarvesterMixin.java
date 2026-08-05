package dev.itscarlos.nexuscore.mixin;

import dev.itscarlos.nexuscore.market.AutomobilityMarketPolicy;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.phys.Vec3;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Pseudo
@Mixin(
    targets = "io.github.foundationgames.automobility.automobile.attachment.front.BaseHarvesterFrontAttachment",
    remap = false
)
public abstract class AutomobilityBaseHarvesterMixin {
    @Inject(
        method = "harvest",
        at = @At("HEAD"),
        cancellable = true,
        remap = false
    )
    private void nexuscore$protectMarketHarvest(
        Vec3 origin,
        ServerLevel level,
        CallbackInfo callbackInfo
    ) {
        if (AutomobilityMarketPolicy.shouldCancelModification(
            this,
            level,
            origin,
            0.25D
        )) {
            callbackInfo.cancel();
        }
    }
}
