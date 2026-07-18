package dev.itscarlos.nexuscore.market;

import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.saveddata.SavedData;
import org.jetbrains.annotations.Nullable;

public final class MarketProtectionData extends SavedData {
    public static final int MIN_RADIUS = 1;
    public static final int MAX_RADIUS = 4096;

    private static final String DATA_NAME = "nexuscore_market_protection";
    private static final String KEY_ENABLED = "Enabled";
    private static final String KEY_DIMENSION = "Dimension";
    private static final String KEY_CENTER_X = "CenterX";
    private static final String KEY_CENTER_Y = "CenterY";
    private static final String KEY_CENTER_Z = "CenterZ";
    private static final String KEY_RADIUS = "Radius";
    private static final String KEY_CENTER_CONFIGURED = "CenterConfigured";
    private static final String KEY_RADIUS_CONFIGURED = "RadiusConfigured";

    private boolean enabled;
    @Nullable
    private ResourceLocation dimension;
    private int centerX;
    private int centerY;
    private int centerZ;
    private int radius;
    private boolean centerConfigured;
    private boolean radiusConfigured;

    private MarketProtectionData() {
    }

    public static MarketProtectionData get(MinecraftServer server) {
        return server.overworld().getDataStorage().computeIfAbsent(
            MarketProtectionData::load,
            MarketProtectionData::new,
            DATA_NAME
        );
    }

    private static MarketProtectionData load(CompoundTag tag) {
        MarketProtectionData data = new MarketProtectionData();
        data.enabled = tag.getBoolean(KEY_ENABLED);
        data.dimension = ResourceLocation.tryParse(tag.getString(KEY_DIMENSION));
        data.centerX = tag.getInt(KEY_CENTER_X);
        data.centerY = tag.getInt(KEY_CENTER_Y);
        data.centerZ = tag.getInt(KEY_CENTER_Z);
        data.radius = tag.getInt(KEY_RADIUS);
        data.centerConfigured = tag.getBoolean(KEY_CENTER_CONFIGURED) && data.dimension != null;
        data.radiusConfigured = tag.getBoolean(KEY_RADIUS_CONFIGURED)
            && data.radius >= MIN_RADIUS
            && data.radius <= MAX_RADIUS;

        if (!data.isConfigured()) {
            data.enabled = false;
        }

        return data;
    }

    @Override
    public CompoundTag save(CompoundTag tag) {
        tag.putBoolean(KEY_ENABLED, enabled);
        tag.putString(KEY_DIMENSION, dimension == null ? "" : dimension.toString());
        tag.putInt(KEY_CENTER_X, centerX);
        tag.putInt(KEY_CENTER_Y, centerY);
        tag.putInt(KEY_CENTER_Z, centerZ);
        tag.putInt(KEY_RADIUS, radius);
        tag.putBoolean(KEY_CENTER_CONFIGURED, centerConfigured);
        tag.putBoolean(KEY_RADIUS_CONFIGURED, radiusConfigured);
        return tag;
    }

    public boolean isInside(Level level, BlockPos pos) {
        boolean sameDimension = dimension != null && level.dimension().location().equals(dimension);
        return MarketRegion.contains(
            enabled && isConfigured(),
            sameDimension,
            centerX,
            centerZ,
            radius,
            pos.getX(),
            pos.getZ()
        );
    }

    public void setCenter(ResourceLocation newDimension, BlockPos pos) {
        dimension = newDimension;
        centerX = pos.getX();
        centerY = pos.getY();
        centerZ = pos.getZ();
        centerConfigured = true;
        setDirty();
    }

    public void setRadius(int newRadius) {
        if (newRadius < MIN_RADIUS || newRadius > MAX_RADIUS) {
            throw new IllegalArgumentException("Market radius must be between " + MIN_RADIUS + " and " + MAX_RADIUS);
        }

        radius = newRadius;
        radiusConfigured = true;
        setDirty();
    }

    public boolean enable() {
        if (!isConfigured()) {
            return false;
        }

        enabled = true;
        setDirty();
        return true;
    }

    public void disable() {
        enabled = false;
        setDirty();
    }

    public boolean isConfigured() {
        return centerConfigured && radiusConfigured && dimension != null;
    }

    public boolean enabled() {
        return enabled;
    }

    public boolean centerConfigured() {
        return centerConfigured;
    }

    public boolean radiusConfigured() {
        return radiusConfigured;
    }

    @Nullable
    public ResourceLocation dimension() {
        return dimension;
    }

    public int centerX() {
        return centerX;
    }

    public int centerY() {
        return centerY;
    }

    public int centerZ() {
        return centerZ;
    }

    public int radius() {
        return radius;
    }
}
