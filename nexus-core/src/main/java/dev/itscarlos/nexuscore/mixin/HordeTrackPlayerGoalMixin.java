package dev.itscarlos.nexuscore.mixin;

import dev.itscarlos.nexuscore.horde.HordeTargeting;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.Mob;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Mutable;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Distributes The Hordes' tracking goal across valid registered participants.
 * A mob keeps its deterministic target until that target becomes invalid.
 */
@Pseudo
@Mixin(
    targets = "net.smileycorp.hordes.common.ai.HordeTrackPlayerGoal",
    remap = false
)
public abstract class HordeTrackPlayerGoalMixin {
    @Shadow(remap = false)
    @Final
    protected Mob entity;

    @Shadow(remap = false)
    @Final
    @Mutable
    protected Entity target;

    @Inject(method = "m_8036_", at = @At("HEAD"), remap = false)
    private void nexuscore$refreshBeforeStart(
        CallbackInfoReturnable<Boolean> callbackInfo
    ) {
        nexuscore$refreshTarget();
    }

    @Inject(
        method = "m_8037_",
        at = @At("HEAD"),
        cancellable = true,
        remap = false
    )
    private void nexuscore$refreshBeforeTick(CallbackInfo callbackInfo) {
        if (!nexuscore$refreshTarget()) {
            callbackInfo.cancel();
        }
    }

    private boolean nexuscore$refreshTarget() {
        ServerPlayer assigned =
            HordeTargeting.resolveAssignedTarget(entity);
        if (assigned == null) {
            target = null;
            return false;
        }

        target = assigned;
        return true;
    }
}
