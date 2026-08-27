package dev.itscarlos.nexuscore.client;

import dev.itscarlos.nexuscore.NexusCore;
import net.minecraft.resources.ResourceLocation;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ModelEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    bus = Mod.EventBusSubscriber.Bus.MOD,
    value = Dist.CLIENT
)
public final class NexusCrystalClientModels {
    public static final ResourceLocation V8_SHELL_MODEL =
        new ResourceLocation(NexusCore.MOD_ID, "block/nexus_crystal_v8");

    private NexusCrystalClientModels() {
    }

    @SubscribeEvent
    public static void registerAdditionalModels(
        ModelEvent.RegisterAdditional event
    ) {
        event.register(V8_SHELL_MODEL);
    }
}
