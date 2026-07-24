package dev.itscarlos.nexuscore.network;

import dev.itscarlos.nexuscore.NexusClass;
import dev.itscarlos.nexuscore.NexusSpecialization;
import dev.itscarlos.nexuscore.client.ClientClassState;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.fml.DistExecutor;
import net.minecraftforge.network.NetworkEvent;

import java.util.function.Supplier;

/**
 * Synchronizes the authoritative Nexus class and Mage specialization
 * from server to client.
 */
public record ClassSyncPacket(
    NexusClass nexusClass,
    NexusSpecialization specialization
) {

    public static void encode(
        ClassSyncPacket packet,
        FriendlyByteBuf buffer
    ) {
        buffer.writeUtf(
            packet.nexusClass().id()
        );

        buffer.writeUtf(
            packet.specialization().id()
        );
    }

    public static ClassSyncPacket decode(
        FriendlyByteBuf buffer
    ) {
        return new ClassSyncPacket(
            NexusClass.fromId(
                buffer.readUtf(32)
            ),
            NexusSpecialization.fromId(
                buffer.readUtf(32)
            )
        );
    }

    public static void handle(
        ClassSyncPacket packet,
        Supplier<NetworkEvent.Context> contextSupplier
    ) {
        NetworkEvent.Context context =
            contextSupplier.get();

        context.enqueueWork(() ->
            DistExecutor.unsafeRunWhenOn(
                Dist.CLIENT,
                () -> () ->
                    ClientClassState.accept(
                        packet.nexusClass(),
                        packet.specialization()
                    )
            )
        );

        context.setPacketHandled(true);
    }
}