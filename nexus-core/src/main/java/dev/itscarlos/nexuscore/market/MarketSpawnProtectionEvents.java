package dev.itscarlos.nexuscore.market;

import dev.itscarlos.nexuscore.NexusCore;
import net.minecraft.world.entity.Mob;
import net.minecraftforge.event.entity.living.MobSpawnEvent;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = NexusCore.MOD_ID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class MarketSpawnProtectionEvents {
    private MarketSpawnProtectionEvents() {
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onFinalizeSpawn(MobSpawnEvent.FinalizeSpawn event) {
        Mob mob = event.getEntity();
        if (MarketSpawnPolicy.blocks(mob.getType().getCategory(), event.getSpawnType())
            && MarketProtection.isInsideProtectedMarket(mob.level(), mob.blockPosition())) {
            event.setSpawnCancelled(true);
        }
    }
}
