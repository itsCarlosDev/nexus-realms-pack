package dev.itscarlos.nexuscore;

import net.minecraft.server.level.ServerPlayer;

public final class ClassData {
    private ClassData() {
    }

    public static NexusClass getPlayerClass(ServerPlayer player) {
        NexusClass persistentClass = NexusClass.fromId(player.getPersistentData().getString("nexus_class"));

        if (persistentClass != NexusClass.NONE) {
            return persistentClass;
        }

        if (player.getTags().contains("nexus_class_warrior")) {
            return NexusClass.WARRIOR;
        }

        if (player.getTags().contains("nexus_class_mage")) {
            return NexusClass.MAGE;
        }

        if (player.getTags().contains("nexus_class_gunslinger")) {
            return NexusClass.GUNSLINGER;
        }

        return NexusClass.NONE;
    }

    public static boolean hasClass(ServerPlayer player, NexusClass requiredClass) {
        if (requiredClass == NexusClass.NONE) {
            return true;
        }

        return getPlayerClass(player) == requiredClass;
    }

    public static boolean isNonWarrior(ServerPlayer player) {
        NexusClass playerClass = getPlayerClass(player);
        return playerClass != NexusClass.NONE && playerClass != NexusClass.WARRIOR;
    }
}
