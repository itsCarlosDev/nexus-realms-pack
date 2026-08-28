package dev.itscarlos.nexuscore.market;

import dev.itscarlos.nexuscore.NexusCore;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.saveddata.SavedData;

public final class MarketNpcBindingsData extends SavedData {
    private static final String DATA_NAME = "nexuscore_market_npc_bindings";
    private static final String KEY_BINDINGS = "Bindings";
    private static final String KEY_LOGICAL_ID = "LogicalId";
    private static final String KEY_UUID = "UUID";
    private static final String KEY_DIMENSION = "Dimension";

    private final Map<String, Binding> bindings = new LinkedHashMap<>();

    MarketNpcBindingsData() {
    }

    public static MarketNpcBindingsData get(MinecraftServer server) {
        return server.overworld().getDataStorage().computeIfAbsent(
            MarketNpcBindingsData::load,
            MarketNpcBindingsData::new,
            DATA_NAME
        );
    }

    static MarketNpcBindingsData load(CompoundTag tag) {
        MarketNpcBindingsData data = new MarketNpcBindingsData();
        ListTag list = tag.getList(KEY_BINDINGS, CompoundTag.TAG_COMPOUND);
        for (int index = 0; index < list.size(); index++) {
            CompoundTag entry = list.getCompound(index);
            String logicalId = entry.getString(KEY_LOGICAL_ID);
            ResourceLocation dimension = ResourceLocation.tryParse(entry.getString(KEY_DIMENSION));
            if (MarketNpcRegistry.find(logicalId).isEmpty() || !entry.hasUUID(KEY_UUID) || dimension == null) {
                NexusCore.LOGGER.warn("Ignoring invalid persisted Market NPC binding for logical ID {}", logicalId);
                continue;
            }
            data.bindings.putIfAbsent(logicalId, new Binding(entry.getUUID(KEY_UUID), dimension));
        }
        return data;
    }

    @Override
    public CompoundTag save(CompoundTag tag) {
        ListTag list = new ListTag();
        for (MarketNpcDefinition definition : MarketNpcRegistry.definitions()) {
            Binding binding = bindings.get(definition.logicalId());
            if (binding == null) {
                continue;
            }
            CompoundTag entry = new CompoundTag();
            entry.putString(KEY_LOGICAL_ID, definition.logicalId());
            entry.putUUID(KEY_UUID, binding.uuid());
            entry.putString(KEY_DIMENSION, binding.dimension().toString());
            list.add(entry);
        }
        tag.put(KEY_BINDINGS, list);
        return tag;
    }

    public Optional<Binding> binding(String logicalId) {
        return Optional.ofNullable(bindings.get(logicalId));
    }

    public Optional<String> logicalIdFor(UUID uuid) {
        return bindings.entrySet().stream()
            .filter(entry -> entry.getValue().uuid().equals(uuid))
            .map(Map.Entry::getKey)
            .findFirst();
    }

    public void bind(String logicalId, UUID uuid, ResourceLocation dimension) {
        if (MarketNpcRegistry.find(logicalId).isEmpty()) {
            throw new IllegalArgumentException("Unknown Market NPC logical ID: " + logicalId);
        }
        if (uuid == null || dimension == null) {
            throw new IllegalArgumentException("Market NPC UUID and dimension are required");
        }
        bindings.put(logicalId, new Binding(uuid, dimension));
        setDirty();
    }

    public boolean unbind(String logicalId) {
        if (MarketNpcRegistry.find(logicalId).isEmpty()) {
            throw new IllegalArgumentException("Unknown Market NPC logical ID: " + logicalId);
        }
        if (bindings.remove(logicalId) == null) {
            return false;
        }
        setDirty();
        return true;
    }

    public record Binding(UUID uuid, ResourceLocation dimension) {
    }
}
