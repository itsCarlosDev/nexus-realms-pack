package dev.itscarlos.nexuscore;

import com.mojang.logging.LogUtils;
import dev.itscarlos.nexuscore.client.ProgressionClientConfig;
import dev.itscarlos.nexuscore.network.ProgressionNetwork;
import dev.itscarlos.nexuscore.progression.EraRegistry;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.ModLoadingContext;
import net.minecraftforge.fml.config.ModConfig;
import org.slf4j.Logger;

@Mod(NexusCore.MOD_ID)
public final class NexusCore {
    public static final String MOD_ID = "nexuscore";
    public static final Logger LOGGER = LogUtils.getLogger();

    public NexusCore() {
        EraRegistry.load();
        ProgressionNetwork.register();
        ModLoadingContext.get().registerConfig(ModConfig.Type.CLIENT, ProgressionClientConfig.SPEC);
        LOGGER.info("Nexus Core era progression, UI, and market protection loaded.");
    }
}
