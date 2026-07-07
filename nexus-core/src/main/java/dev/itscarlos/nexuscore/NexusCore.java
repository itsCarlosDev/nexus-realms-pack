package dev.itscarlos.nexuscore;

import com.mojang.logging.LogUtils;
import net.minecraftforge.fml.common.Mod;
import org.slf4j.Logger;

@Mod(NexusCore.MOD_ID)
public final class NexusCore {
    public static final String MOD_ID = "nexuscore";
    public static final Logger LOGGER = LogUtils.getLogger();

    public NexusCore() {
        LOGGER.info("Nexus Core class enforcer loaded.");
    }
}
