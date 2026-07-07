package dev.itscarlos.nexuscore;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.event.entity.living.LivingAttackEvent;
import net.minecraftforge.event.entity.living.LivingEquipmentChangeEvent;
import net.minecraftforge.event.entity.living.LivingHurtEvent;
import net.minecraftforge.event.entity.player.AttackEntityEvent;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.eventbus.api.Event;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = NexusCore.MOD_ID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class GenericClassRestrictions {
    private static final long WARNING_COOLDOWN_MS = 4000L;
    private static final Map<String, Long> LAST_WARNING_AT = new HashMap<>();

    private GenericClassRestrictions() {
    }

    @SubscribeEvent
    public static void onRightClickItem(PlayerInteractEvent.RightClickItem event) {
        if (event.getEntity() instanceof ServerPlayer player && blockRestrictedUse(player, event.getItemStack(), event, "right_click_item")) {
            event.setCancellationResult(InteractionResult.FAIL);
        }
    }

    @SubscribeEvent
    public static void onRightClickBlock(PlayerInteractEvent.RightClickBlock event) {
        if (event.getEntity() instanceof ServerPlayer player && blockRestrictedUse(player, event.getItemStack(), event, "right_click_block")) {
            event.setCancellationResult(InteractionResult.FAIL);
        }
    }

    @SubscribeEvent
    public static void onEntityInteract(PlayerInteractEvent.EntityInteract event) {
        if (event.getEntity() instanceof ServerPlayer player && blockRestrictedUse(player, event.getItemStack(), event, "entity_interact")) {
            event.setCancellationResult(InteractionResult.FAIL);
        }
    }

    @SubscribeEvent
    public static void onAttackEntity(AttackEntityEvent event) {
        if (!(event.getEntity() instanceof ServerPlayer player)) {
            return;
        }

        ItemStack mainHand = player.getMainHandItem();

        if (ClassRules.isRestricted(player, mainHand)) {
            event.setCanceled(true);
            warnRestricted(player, ClassRules.requiredClassForItem(mainHand), "attack_restricted_item");
            return;
        }

        if (shouldBlockUnarmedMelee(player)) {
            event.setCanceled(true);
            warn(player, "unarmed_melee", "No puedes hacer daño cuerpo a cuerpo sin arma con esta clase.");
        }
    }

    @SubscribeEvent
    public static void onLivingAttack(LivingAttackEvent event) {
        if (shouldCancelDamage(event.getSource())) {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void onLivingHurt(LivingHurtEvent event) {
        if (shouldCancelDamage(event.getSource())) {
            event.setCanceled(true);
            event.setAmount(0.0F);
        }
    }

    @SubscribeEvent
    public static void onLivingEquipmentChange(LivingEquipmentChangeEvent event) {
        if (!(event.getEntity() instanceof ServerPlayer player)) {
            return;
        }

        ItemStack equipped = event.getTo();

        if (ClassRules.isRestricted(player, equipped)) {
            warnRestricted(player, ClassRules.requiredClassForItem(equipped), "equip_restricted_item");
        }
    }

    private static boolean blockRestrictedUse(ServerPlayer player, ItemStack stack, Event event, String reason) {
        if (!ClassRules.isRestricted(player, stack)) {
            return false;
        }

        event.setCanceled(true);
        warnRestricted(player, ClassRules.requiredClassForItem(stack), reason);
        return true;
    }

    private static boolean shouldCancelDamage(DamageSource source) {
        Entity sourceEntity = source.getEntity();

        if (!(sourceEntity instanceof ServerPlayer attacker)) {
            return false;
        }

        ItemStack mainHand = attacker.getMainHandItem();

        if (ClassRules.isRestricted(attacker, mainHand)) {
            warnRestricted(attacker, ClassRules.requiredClassForItem(mainHand), "damage_restricted_item");
            return true;
        }

        if (TaczCompat.isRestrictedTaczDamage(attacker, source)) {
            warnRestricted(attacker, NexusClass.GUNSLINGER, "damage_tacz");
            return true;
        }

        if (mainHand.isEmpty() && shouldBlockUnarmedMelee(attacker) && EpicFightCompat.isDirectPlayerMelee(source, attacker)) {
            warn(attacker, "unarmed_melee", "No puedes hacer daño cuerpo a cuerpo sin arma con esta clase.");
            return true;
        }

        return EpicFightCompat.isRestrictedWarriorItem(attacker, mainHand);
    }

    private static boolean shouldBlockUnarmedMelee(ServerPlayer player) {
        return ClassData.isNonWarrior(player) && player.getMainHandItem().isEmpty();
    }

    private static void warnRestricted(ServerPlayer player, NexusClass requiredClass, String reason) {
        warn(player, reason + "_" + requiredClass.id(), messageFor(requiredClass));
    }

    private static String messageFor(NexusClass requiredClass) {
        return switch (requiredClass) {
            case WARRIOR -> "Solo el Guerrero puede usar equipo marcial avanzado.";
            case MAGE -> "Solo el Mago puede canalizar magia.";
            case GUNSLINGER -> "Solo el Pistolero puede usar armas de fuego.";
            case NONE -> "Este item no esta restringido.";
        };
    }

    private static void warn(ServerPlayer player, String reason, String message) {
        UUID uuid = player.getUUID();
        String key = uuid + ":" + reason;
        long now = System.currentTimeMillis();
        long lastWarningAt = LAST_WARNING_AT.getOrDefault(key, 0L);

        if (now - lastWarningAt < WARNING_COOLDOWN_MS) {
            return;
        }

        LAST_WARNING_AT.put(key, now);
        player.displayClientMessage(Component.literal(message), true);
    }
}
