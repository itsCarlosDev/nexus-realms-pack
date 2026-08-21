package dev.itscarlos.nexuscore;

import com.mojang.logging.LogUtils;
import dev.itscarlos.nexuscore.client.ProgressionClientConfig;
import dev.itscarlos.nexuscore.diagnostics.ShutdownHangDiagnostic;
import dev.itscarlos.nexuscore.network.EpicFightRegistryNetwork;
import dev.itscarlos.nexuscore.network.ProgressionNetwork;
import dev.itscarlos.nexuscore.progression.EraRegistry;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.fml.loading.FMLEnvironment;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.ModLoadingContext;
import net.minecraftforge.fml.config.ModConfig;
import org.slf4j.Logger;

@Mod(NexusCore.MOD_ID)
public final class NexusCore {
    public static final String MOD_ID = "nexuscore";
    public static final String BUILD_ID =
        "0.6.29";
    public static final Logger LOGGER = LogUtils.getLogger();

    public NexusCore() {
        if (FMLEnvironment.dist == Dist.DEDICATED_SERVER) {
            ShutdownHangDiagnostic.initialize();
        }
        EraRegistry.load();
        ProgressionNetwork.register();
        EpicFightRegistryNetwork.register();
        ModLoadingContext.get().registerConfig(ModConfig.Type.CLIENT, ProgressionClientConfig.SPEC);
        LOGGER.info(
            "Nexus Core loaded: build={}, progressionProtocol=7, epicFightRegistryProtocol={}, bridge={}",
            BUILD_ID,
            EpicFightRegistryNetwork.PROTOCOL,
            EpicFightRegistryNetwork.BUILD_ID
        );
    }
}
