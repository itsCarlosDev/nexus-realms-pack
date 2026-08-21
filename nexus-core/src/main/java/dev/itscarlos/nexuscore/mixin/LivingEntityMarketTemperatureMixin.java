package dev.itscarlos.nexuscore.mixin;

import dev.itscarlos.nexuscore.market.MarketTemperaturePolicy;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Runs before Tough As Nails' LivingEntity freezing hook so a player who enters
 * the Market already ICY cannot gain another frozen/damage tick on that tick.
 */
@Mixin(LivingEntity.class)
public abstract class LivingEntityMarketTemperatureMixin {
    @Inject(method = "aiStep", at = @At("HEAD"))
    private void nexuscore$neutralizeMarketTemperatureBeforeFreeze(CallbackInfo callbackInfo) {
        if ((Object) this instanceof ServerPlayer player) {
            MarketTemperaturePolicy.neutralizeIfInsideMarket(player);
        }
    }
}