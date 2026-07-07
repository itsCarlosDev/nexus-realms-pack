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
            case "warrior" -> WARRIOR;
            case "mage" -> MAGE;
            case "gunslinger" -> GUNSLINGER;
            default -> NONE;
        };
    }
}
