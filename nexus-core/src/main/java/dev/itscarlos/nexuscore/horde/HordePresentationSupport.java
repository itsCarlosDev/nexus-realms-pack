package dev.itscarlos.nexuscore.horde;

import java.util.UUID;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.level.ServerBossEvent;

/** Updates the global audience of one shared custom bossbar from UUID data. */
public final class HordePresentationSupport {
    private HordePresentationSupport() {
    }

    public static void setBossbarPlayers(
        MinecraftServer server,
        String bossbarId,
        String audienceIds
    ) {
        if (server == null || bossbarId == null) {
            return;
        }

        ResourceLocation id = ResourceLocation.tryParse(bossbarId);
        if (id == null) {
            return;
        }

        ServerBossEvent bossbar =
            server.getCustomBossEvents().get(id);
        if (bossbar == null) {
            return;
        }

        bossbar.removeAllPlayers();
        if (audienceIds == null || audienceIds.isBlank()) {
            return;
        }

        for (String value : audienceIds.split(",")) {
            try {
                ServerPlayer player = server
                    .getPlayerList()
                    .getPlayer(UUID.fromString(value.trim()));

                if (player != null) {
                    bossbar.addPlayer(player);
                }
            } catch (IllegalArgumentException ignored) {
                // Invalid audience UUIDs are ignored without affecting others.
            }
        }
    }
}
