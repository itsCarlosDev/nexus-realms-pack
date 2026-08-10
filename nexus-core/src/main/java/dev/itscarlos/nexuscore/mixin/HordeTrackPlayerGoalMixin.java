package dev.itscarlos.nexuscore.mixin;

import dev.itscarlos.nexuscore.horde.HordeTargeting;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.Mob;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Mutable;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Distributes The Hordes' tracking goal across valid registered participants.
 * A mob keeps its deterministic target until that target becomes invalid.
 */
@Pseudo
@Mixin(
    targets = "net.smileycorp.hordes.common.ai.HordeTrackPlayerGoal",
    remap = false
)
public abstract class HordeTrackPlayerGoalMixin {
    @Shadow(remap = false)
    @Final
    protected Mob entity;

    @Shadow(remap = false)
    @Final
    @Mutable
    protected Entity target;

    @Inject(method = "m_8036_", at = @At("HEAD"), remap = false)
    private void nexuscore$refreshBeforeStart(
        CallbackInfoReturnable<Boolean> callbackInfo
    ) {
        nexuscore$refreshTarget();
    }

    @Inject(
        method = "m_8037_",
        at = @At("HEAD"),
        cancellable = true,
        remap = false
    )
    private void nexuscore$refreshBeforeTick(CallbackInfo callbackInfo) {
        if (!nexuscore$refreshTarget()) {
            callbackInfo.cancel();
        }
    }

    private boolean nexuscore$refreshTarget() {
        String rawIds = entity.getPersistentData().getString(
            HordeTargeting.PARTICIPANTS_KEY
        );
        if (rawIds.isBlank()) {
            return target != null;
        }

        MinecraftServer server = entity.getServer();
        if (server == null) {
            return target != null;
        }

        List<ServerPlayer> candidates = new ArrayList<>();
        for (String value : rawIds.split(",")) {
            try {
                ServerPlayer player = server
                    .getPlayerList()
                    .getPlayer(UUID.fromString(value.trim()));

                if (
                    player != null &&
                    player.isAlive() &&
                    !player.isSpectator() &&
                    player.level() == entity.level()
                ) {
                    candidates.add(player);
                }
            } catch (IllegalArgumentException ignored) {
                // The calendar parser is authoritative and already filters IDs.
            }
        }

        if (candidates.isEmpty()) {
            target = null;
            entity.getPersistentData().remove(
                HordeTargeting.ASSIGNED_TARGET_KEY
            );
            return false;
        }

        candidates.sort(
            Comparator.comparing(player -> player.getUUID().toString())
        );

        String assignedId = entity.getPersistentData().getString(
            HordeTargeting.ASSIGNED_TARGET_KEY
        );

        for (ServerPlayer candidate : candidates) {
            if (
                candidate.getUUID().toString().equals(assignedId) &&
                target == candidate
            ) {
                return true;
            }
        }

        ServerPlayer selected = candidates.get(
            Math.floorMod(entity.getUUID().hashCode(), candidates.size())
        );

        target = selected;
        entity.getPersistentData().putString(
            HordeTargeting.ASSIGNED_TARGET_KEY,
            selected.getUUID().toString()
        );
        return true;
    }
}
