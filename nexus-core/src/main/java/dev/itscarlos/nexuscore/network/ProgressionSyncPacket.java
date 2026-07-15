package dev.itscarlos.nexuscore.network;

import dev.itscarlos.nexuscore.client.ClientProgressionState;
import dev.itscarlos.nexuscore.progression.ProgressionState;
import java.util.function.Supplier;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.fml.DistExecutor;
import net.minecraftforge.network.NetworkEvent;

public record ProgressionSyncPacket(ProgressionState state, boolean showUnlock) {
    public static void encode(ProgressionSyncPacket packet, FriendlyByteBuf buffer) {
        ProgressionState state = packet.state();
        buffer.writeVarInt(state.era());
        buffer.writeVarInt(state.worldDay());
        buffer.writeBoolean(state.campaignStarted());
        buffer.writeVarInt(state.campaignDay());
        buffer.writeVarInt(state.campaignLength());
        buffer.writeBoolean(state.campaignPaused());
        buffer.writeVarInt(state.unlockDay());
        buffer.writeVarInt(state.nextHordeDay());
        buffer.writeBoolean(state.hordeActive());
        buffer.writeVarInt(state.participantCount());
        buffer.writeVarInt(state.pendingEra());
        buffer.writeVarInt(state.pendingRequestedDay());
        buffer.writeVarInt(state.milestoneCompleted());
        buffer.writeBoolean(packet.showUnlock());
    }

    public static ProgressionSyncPacket decode(FriendlyByteBuf buffer) {
        return new ProgressionSyncPacket(
            new ProgressionState(
                buffer.readVarInt(),
                buffer.readVarInt(),
                buffer.readBoolean(),
                buffer.readVarInt(),
                buffer.readVarInt(),
                buffer.readBoolean(),
                buffer.readVarInt(),
                buffer.readVarInt(),
                buffer.readBoolean(),
                buffer.readVarInt(),
                buffer.readVarInt(),
                buffer.readVarInt(),
                buffer.readVarInt()
            ),
            buffer.readBoolean()
        );
    }

    public static void handle(ProgressionSyncPacket packet, Supplier<NetworkEvent.Context> contextSupplier) {
        NetworkEvent.Context context = contextSupplier.get();
        context.enqueueWork(() -> DistExecutor.unsafeRunWhenOn(
            Dist.CLIENT,
            () -> () -> ClientProgressionState.accept(packet)
        ));
        context.setPacketHandled(true);
    }
}
