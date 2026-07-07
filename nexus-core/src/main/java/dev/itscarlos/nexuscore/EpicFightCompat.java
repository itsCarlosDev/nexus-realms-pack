package dev.itscarlos.nexuscore;

import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.item.ItemStack;

public final class EpicFightCompat {
    private EpicFightCompat() {
    }

    public static boolean isRestrictedWarriorItem(ServerPlayer player, ItemStack stack) {
        return ClassRules.requiredClassForItem(stack) == NexusClass.WARRIOR && ClassRules.isRestricted(player, stack);
    }

    public static boolean isDirectPlayerMelee(DamageSource source, ServerPlayer attacker) {
        if (source == null || attacker == null) {
            return false;
        }

        Entity directEntity = source.getDirectEntity();

        if (directEntity != null && directEntity != attacker) {
            return false;
        }

        ResourceLocation damageTypeId = TaczCompat.damageTypeId(source);

        if (damageTypeId == null) {
            return true;
        }

        String namespace = damageTypeId.getNamespace();
        String path = damageTypeId.getPath();

        if ("tacz".equals(namespace) || path.contains("arrow") || path.contains("projectile") || path.contains("magic") || path.contains("spell") || path.contains("bullet")) {
            return false;
        }

        return path.contains("player_attack") || path.contains("mob_attack") || directEntity == attacker;
    }
}
