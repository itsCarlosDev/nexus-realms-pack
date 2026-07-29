package dev.itscarlos.nexuscore;

public enum NexusClass {
    WARRIOR("warrior"),
    MAGE("mage"),
    GUNSLINGER("gunslinger"),
    NONE("none");

    private final String id;

    NexusClass(String id) {
        this.id = id;
    }

    public String id() {
        return id;
    }

    public static NexusClass fromId(String value) {
        if (value == null) {
            return NONE;
        }

        return switch (value.trim().toLowerCase()) {
            case "warrior", "guerrero" -> WARRIOR;
            case
                "mage",
                "mago",
                "arcanist",
                "arcanista",
                "metallurgist",
                "metalomante" -> MAGE;
            case
                "gunslinger",
                "gunner",
                "pistolero" -> GUNSLINGER;
            default -> NONE;
        };
    }
}
