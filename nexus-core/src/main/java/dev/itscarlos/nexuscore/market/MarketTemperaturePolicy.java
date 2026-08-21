package dev.itscarlos.nexuscore.market;

import net.minecraft.server.level.ServerPlayer;
import toughasnails.api.temperature.ITemperature;
import toughasnails.api.temperature.TemperatureHelper;
import toughasnails.api.temperature.TemperatureLevel;

/**
 * Makes the enabled Nexus Market protection region a neutral-temperature safe zone.
 * Thirst and every other Tough As Nails mechanic remain untouched.
 */
public final class MarketTemperaturePolicy {
    private MarketTemperaturePolicy() {
    }

    public static boolean neutralizeIfInsideMarket(ServerPlayer player) {
        if (!MarketProtection.isInsideProtectedMarket(player.level(), player.blockPosition())) {
            return false;
        }

        ITemperature temperature = TemperatureHelper.getTemperatureData(player);
        temperature.setLevel(TemperatureLevel.NEUTRAL);
        temperature.setTargetLevel(TemperatureLevel.NEUTRAL);
        temperature.setHyperthermiaTicks(0);
        temperature.setExtremityDelayTicks(0);

        // Tough As Nails maps ICY temperature to vanilla frozen ticks for players.
        // Clear existing buildup immediately when crossing into the Market.
        player.setTicksFrozen(0);
        return true;
    }
}