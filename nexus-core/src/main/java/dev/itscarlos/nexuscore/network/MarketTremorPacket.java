package dev.itscarlos.nexuscore.network;

import dev.itscarlos.nexuscore.client.ClientMarketTremorState;
import java.util.function.Supplier;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.fml.DistExecutor;
import net.minecraftforge.network.NetworkEvent;

public record MarketTremorPacket(
    int durationTicks,
    float intensity,
    long seed
) {
    public static void encode(MarketTremorPacket packet, FriendlyByteBuf buffer) {
        buffer.writeVarInt(packet.durationTicks());
        buffer.writeFloat(packet.intensity());
        buffer.writeLong(packet.seed());
    }

    public static MarketTremorPacket decode(FriendlyByteBuf buffer) {
        return new MarketTremorPacket(
            buffer.readVarInt(),
            buffer.readFloat(),
            buffer.readLong()
        );
    }

    public static void handle(
        MarketTremorPacket packet,
        Supplier<NetworkEvent.Context> contextSupplier
    ) {
        NetworkEvent.Context context = contextSupplier.get();
        context.enqueueWork(() -> DistExecutor.unsafeRunWhenOn(
            Dist.CLIENT,
            () -> () -> ClientMarketTremorState.start(packet)
        ));
        context.setPacketHandled(true);
    }
}