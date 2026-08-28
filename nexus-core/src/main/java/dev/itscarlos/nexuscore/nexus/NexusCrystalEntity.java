package dev.itscarlos.nexuscore.nexus;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.protocol.Packet;
import net.minecraft.network.protocol.game.ClientGamePacketListener;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.network.NetworkHooks;

public final class NexusCrystalEntity extends Entity {
    public NexusCrystalEntity(EntityType<? extends NexusCrystalEntity> entityType, Level level) {
        super(entityType, level);
        this.noPhysics = true;
        this.setNoGravity(true);
        this.setInvulnerable(true);
    }

    @Override
    protected void defineSynchedData() {
    }

    @Override
    protected void readAdditionalSaveData(CompoundTag tag) {
    }

    @Override
    protected void addAdditionalSaveData(CompoundTag tag) {
    }

    @Override
    public void tick() {
        super.tick();

        this.noPhysics = true;
        this.setNoGravity(true);
        this.setDeltaMovement(Vec3.ZERO);

        if (!this.level().isClientSide && this.level() instanceof ServerLevel serverLevel) {
            float bob = NexusCrystalVisuals.bob(this.tickCount);
            double effectY = this.getY() + NexusCrystalVisuals.CENTER_Y + bob;

            if (this.tickCount % 12 == 0) {
                serverLevel.sendParticles(
                    ParticleTypes.REVERSE_PORTAL,
                    this.getX(),
                    effectY,
                    this.getZ(),
                    2,
                    0.24D,
                    0.42D,
                    0.24D,
                    0.01D
                );
            }

            if (this.tickCount % 40 == 0) {
                serverLevel.sendParticles(
                    ParticleTypes.END_ROD,
                    this.getX(),
                    effectY,
                    this.getZ(),
                    1,
                    0.10D,
                    0.20D,
                    0.10D,
                    0.005D
                );
            }
        }
    }

    @Override
    public boolean isPickable() {
        return false;
    }

    @Override
    public boolean isPushable() {
        return false;
    }

    @Override
    public boolean isAttackable() {
        return false;
    }

    @Override
    public boolean hurt(DamageSource source, float amount) {
        return false;
    }

    @Override
    public Packet<ClientGamePacketListener> getAddEntityPacket() {
        return NetworkHooks.getEntitySpawningPacket(this);
    }
}
