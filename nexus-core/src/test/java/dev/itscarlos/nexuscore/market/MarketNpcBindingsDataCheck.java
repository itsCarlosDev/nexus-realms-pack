package dev.itscarlos.nexuscore.market;

import java.util.UUID;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.ResourceLocation;

public final class MarketNpcBindingsDataCheck {
    private MarketNpcBindingsDataCheck() {
    }

    public static void main(String[] args) {
        UUID foremanUuid = UUID.fromString("11111111-2222-3333-4444-555555555555");
        UUID piglinUuid = UUID.fromString("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
        ResourceLocation overworld = new ResourceLocation("minecraft", "overworld");
        ResourceLocation nether = new ResourceLocation("minecraft", "the_nether");

        MarketNpcBindingsData original = new MarketNpcBindingsData();
        original.bind("market_foreman", foremanUuid, overworld);
        original.bind("nether_expeditionary", piglinUuid, nether);

        CompoundTag serialized = original.save(new CompoundTag());
        MarketNpcBindingsData restored = MarketNpcBindingsData.load(serialized);
        require(
            restored.binding("market_foreman").orElseThrow().uuid().equals(foremanUuid),
            "market_foreman UUID did not survive serialization"
        );
        require(
            restored.binding("market_foreman").orElseThrow().dimension().equals(overworld),
            "market_foreman dimension did not survive serialization"
        );
        require(
            restored.binding("nether_expeditionary").orElseThrow().uuid().equals(piglinUuid),
            "nether_expeditionary UUID did not survive serialization"
        );
        require(
            restored.logicalIdFor(piglinUuid).orElseThrow().equals("nether_expeditionary"),
            "reverse UUID lookup failed"
        );
        require(restored.binding("unknown_market_npc").isEmpty(), "unknown ID unexpectedly has a binding");

        boolean unknownRejected = false;
        try {
            restored.bind("unknown_market_npc", UUID.randomUUID(), overworld);
        } catch (IllegalArgumentException expected) {
            unknownRejected = true;
        }
        require(unknownRejected, "unknown logical ID was accepted by SavedData");
        System.out.println("Market NPC SavedData checks passed: bindings persist and unknown IDs are rejected");
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
