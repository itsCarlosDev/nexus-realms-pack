package dev.itscarlos.nexuscore.client;

import dev.itscarlos.nexuscore.NexusCore;
import dev.itscarlos.nexuscore.nexus.NexusEntities;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.EntityRenderersEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    bus = Mod.EventBusSubscriber.Bus.MOD,
    value = Dist.CLIENT
)
public final class NexusCrystalClientEvents {
    private NexusCrystalClientEvents() {
    }

    @SubscribeEvent
    public static void registerRenderers(EntityRenderersEvent.RegisterRenderers event) {
        event.registerEntityRenderer(
            NexusEntities.NEXUS_CRYSTAL.get(),
            NexusCrystalRenderer::new
        );
    }
}
