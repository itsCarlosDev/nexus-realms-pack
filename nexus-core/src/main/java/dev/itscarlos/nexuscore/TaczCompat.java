package dev.itscarlos.nexuscore;

import java.util.Set;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.damagesource.DamageSource;

public final class TaczCompat {
    private static final Set<ResourceLocation> TACZ_BULLET_DAMAGE_TYPES = Set.of(
        new ResourceLocation("tacz", "bullet"),
        new ResourceLocation("tacz", "bullet_ignore_armor"),
        new ResourceLocation("tacz", "bullet_void"),
        new ResourceLocation("tacz", "bullet_void_ignore_armor")
    );

    private TaczCompat() {
    }

    public static boolean isTaczBulletDamage(DamageSource source) {
        ResourceLocation damageTypeId = damageTypeId(source);
        return damageTypeId != null && TACZ_BULLET_DAMAGE_TYPES.contains(damageTypeId);
    }

    public static boolean isRestrictedTaczDamage(ServerPlayer attacker, DamageSource source) {
        return isTaczBulletDamage(source) && !ClassData.hasClass(attacker, NexusClass.GUNSLINGER);
    }

    public static ResourceLocation damageTypeId(DamageSource source) {
        if (source == null) {
            return null;
        }

        return source.typeHolder().unwrapKey().map(key -> key.location()).orElse(null);
    }
}
