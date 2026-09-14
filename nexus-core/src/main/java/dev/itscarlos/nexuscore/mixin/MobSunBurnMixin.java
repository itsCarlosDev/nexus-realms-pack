package dev.itscarlos.nexuscore.mixin;

import dev.itscarlos.nexuscore.horde.HordeTargeting;
import net.minecraft.world.entity.Mob;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Prevents only vanilla sun-burn checks for explicitly marked Nexus mobs. */
@Mixin(Mob.class)
public abstract class MobSunBurnMixin {
    @Inject(
        method = "isSunBurnTick",
        at = @At("HEAD"),
        cancellable = true
    )
    private void nexuscore$skipSunBurnForHordeMob(
        CallbackInfoReturnable<Boolean> callbackInfo
    ) {
        Mob mob = (Mob) (Object) this;
        if (HordeTargeting.isNexusHordeMob(mob)) {
            callbackInfo.setReturnValue(false);
        }
    }
}
