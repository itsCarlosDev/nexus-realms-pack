package dev.itscarlos.nexuscore.network;

import dev.itscarlos.nexuscore.NexusClass;
import dev.itscarlos.nexuscore.NexusCore;
import dev.itscarlos.nexuscore.NexusSpecialization;
import dev.itscarlos.nexuscore.progression.ProgressionState;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.network.NetworkDirection;
import net.minecraftforge.network.NetworkRegistry;
import net.minecraftforge.network.PacketDistributor;
import net.minecraftforge.network.simple.SimpleChannel;

public final class ProgressionNetwork {

    /*
     * Protocol 6 adds Mage specialization data to ClassSyncPacket.
     */
    private static final String PROTOCOL = "6";

    private static final SimpleChannel CHANNEL =
        NetworkRegistry.ChannelBuilder
            .named(
                new ResourceLocation(
                    NexusCore.MOD_ID,
                    "progression"
                )
            )
            .networkProtocolVersion(() -> PROTOCOL)
            .clientAcceptedVersions(PROTOCOL::equals)
            .serverAcceptedVersions(PROTOCOL::equals)
            .simpleChannel();

    private static boolean registered;

    private ProgressionNetwork() {
    }

    public static synchronized void register() {
        if (registered) {
            return;
        }

        CHANNEL.messageBuilder(
                ProgressionSyncPacket.class,
                0,
                NetworkDirection.PLAY_TO_CLIENT
            )
            .encoder(
                ProgressionSyncPacket::encode
            )
            .decoder(
                ProgressionSyncPacket::decode
            )
            .consumerMainThread(
                ProgressionSyncPacket::handle
            )
            .add();

        CHANNEL.messageBuilder(
                ClassSyncPacket.class,
                1,
                NetworkDirection.PLAY_TO_CLIENT
            )
            .encoder(
                ClassSyncPacket::encode
            )
            .decoder(
                ClassSyncPacket::decode
            )
            .consumerMainThread(
                ClassSyncPacket::handle
            )
            .add();

        registered = true;
    }

    public static void sync(
        ServerPlayer player,
        ProgressionState state,
        boolean showUnlock
    ) {
        CHANNEL.send(
            PacketDistributor.PLAYER.with(
                () -> player
            ),
            new ProgressionSyncPacket(
                state,
                showUnlock
            )
        );
    }

    public static void syncClass(
        ServerPlayer player,
        NexusClass nexusClass,
        NexusSpecialization specialization
    ) {
        CHANNEL.send(
            PacketDistributor.PLAYER.with(
                () -> player
            ),
            new ClassSyncPacket(
                nexusClass,
                specialization
            )
        );
    }
}