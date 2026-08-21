package dev.itscarlos.nexuscore.mixin;

import dev.itscarlos.nexuscore.market.MarketTemperaturePolicy;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.player.Player;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Clamps Tough As Nails' server-side temperature update while the player is in
 * the enabled Nexus Market region. HEAD prevents extreme effects during TAN's
 * tick; TAIL prevents the environment calculation from leaving a cold/hot value.
 */
@Pseudo
@Mixin(targets = "toughasnails.temperature.TemperatureHandler", remap = false)
public abstract class ToughAsNailsMarketTemperatureMixin {
    @Inject(method = "onPlayerTick", at = @At("HEAD"), remap = false)
    private static void nexuscore$neutralizeMarketTemperatureBeforeTanTick(
        Player player,
        CallbackInfo callbackInfo
    ) {
        if (player instanceof ServerPlayer serverPlayer) {
            MarketTemperaturePolicy.neutralizeIfInsideMarket(serverPlayer);
        }
    }

    @Inject(method = "onPlayerTick", at = @At("TAIL"), remap = false)
    private static void nexuscore$neutralizeMarketTemperatureAfterTanTick(
        Player player,
        CallbackInfo callbackInfo
    ) {
        if (player instanceof ServerPlayer serverPlayer) {
            MarketTemperaturePolicy.neutralizeIfInsideMarket(serverPlayer);
        }
    }
}