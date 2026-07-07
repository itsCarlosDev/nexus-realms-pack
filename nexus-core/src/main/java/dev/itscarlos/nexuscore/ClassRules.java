package dev.itscarlos.nexuscore;

import java.util.Map;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.registries.ForgeRegistries;

public final class ClassRules {
    private static final Map<String, NexusClass> RESTRICTED_NAMESPACES = Map.ofEntries(
        Map.entry("simplyswords", NexusClass.WARRIOR),
        Map.entry("epicfight", NexusClass.WARRIOR),
        Map.entry("epicfight_nightfall", NexusClass.WARRIOR),
        Map.entry("efn", NexusClass.WARRIOR),
        Map.entry("nightfall", NexusClass.WARRIOR),
        Map.entry("epicskills", NexusClass.WARRIOR),
        Map.entry("epic_fight_avalon", NexusClass.WARRIOR),
        Map.entry("invincible", NexusClass.WARRIOR),
        Map.entry("irons_spellbooks", NexusClass.MAGE),
        Map.entry("traveloptics", NexusClass.MAGE),
        Map.entry("tacz", NexusClass.GUNSLINGER)
    );

    private ClassRules() {
    }

    public static NexusClass requiredClassForItem(ItemStack stack) {
        ResourceLocation itemId = itemId(stack);

        if (itemId == null) {
            return NexusClass.NONE;
        }

        return RESTRICTED_NAMESPACES.getOrDefault(itemId.getNamespace(), NexusClass.NONE);
    }

    public static boolean canUse(ServerPlayer player, ItemStack stack) {
        NexusClass requiredClass = requiredClassForItem(stack);
        return requiredClass == NexusClass.NONE || ClassData.hasClass(player, requiredClass);
    }

    public static boolean isRestricted(ServerPlayer player, ItemStack stack) {
        return !canUse(player, stack);
    }

    public static ResourceLocation itemId(ItemStack stack) {
        if (stack == null || stack.isEmpty()) {
            return null;
        }

        return ForgeRegistries.ITEMS.getKey(stack.getItem());
    }
}
