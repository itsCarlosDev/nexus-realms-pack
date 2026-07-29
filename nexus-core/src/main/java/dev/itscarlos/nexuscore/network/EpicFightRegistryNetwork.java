package dev.itscarlos.nexuscore.network;

import dev.itscarlos.nexuscore.NexusCore;
import net.minecraft.resources.ResourceLocation;
import net.minecraftforge.network.NetworkDirection;
import net.minecraftforge.network.NetworkRegistry;
import net.minecraftforge.network.simple.SimpleChannel;

public final class EpicFightRegistryNetwork {

    public static final String PROTOCOL = "1";
    public static final String BUILD_ID = "epicfight-registry-bridge-v1";

    private static final SimpleChannel CHANNEL =
        NetworkRegistry.ChannelBuilder
            .named(
                new ResourceLocation(
                    NexusCore.MOD_ID,
                    "epicfight_registry"
                )
            )
            .networkProtocolVersion(() -> PROTOCOL)
            .clientAcceptedVersions(PROTOCOL::equals)
            .serverAcceptedVersions(PROTOCOL::equals)
            .simpleChannel();

    private static boolean registered;

    private EpicFightRegistryNetwork() {
    }

    public static synchronized void register() {
        if (registered) {
            return;
        }

        CHANNEL.messageBuilder(
                EpicFightRegistryChunkPacket.class,
                0,
                NetworkDirection.PLAY_TO_SERVER
            )
            .encoder(EpicFightRegistryChunkPacket::encode)
            .decoder(EpicFightRegistryChunkPacket::decode)
            .consumerMainThread(EpicFightRegistryChunkPacket::handle)
            .add();

        registered = true;
    }

    public static void send(EpicFightRegistryChunkPacket packet) {
        CHANNEL.sendToServer(packet);
    }
}
