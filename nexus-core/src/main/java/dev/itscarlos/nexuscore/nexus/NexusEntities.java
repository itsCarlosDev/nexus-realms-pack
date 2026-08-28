package dev.itscarlos.nexuscore.nexus;

import dev.itscarlos.nexuscore.NexusCore;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class NexusEntities {
    public static final DeferredRegister<EntityType<?>> ENTITY_TYPES =
        DeferredRegister.create(ForgeRegistries.ENTITY_TYPES, NexusCore.MOD_ID);

    public static final RegistryObject<EntityType<NexusCrystalEntity>> NEXUS_CRYSTAL =
        ENTITY_TYPES.register(
            "nexus_crystal",
            () -> EntityType.Builder
                .<NexusCrystalEntity>of(NexusCrystalEntity::new, MobCategory.MISC)
                .sized(1.40F, 2.50F)
                .clientTrackingRange(32)
                .updateInterval(20)
                .build(NexusCore.MOD_ID + ":nexus_crystal")
        );

    private NexusEntities() {
    }

    public static void register(IEventBus modEventBus) {
        ENTITY_TYPES.register(modEventBus);
    }
}
