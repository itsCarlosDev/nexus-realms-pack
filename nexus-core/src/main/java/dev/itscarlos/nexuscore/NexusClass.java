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

    /**
     * Parses the authoritative persistent class field. Unlike {@link #fromId},
     * this deliberately rejects UI aliases and specialization identifiers.
     */
    public static NexusClass fromPersistentId(String value) {
        if (value == null) {
            return NONE;
        }

        return switch (value.trim()) {
            case "warrior" -> WARRIOR;
            case "mage" -> MAGE;
            case "gunslinger" -> GUNSLINGER;
            default -> NONE;
        };
    }
}
