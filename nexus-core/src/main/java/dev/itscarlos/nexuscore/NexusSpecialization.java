package dev.itscarlos.nexuscore;

public enum NexusSpecialization {
    ARCANIST("arcanist"),
    METALLURGIST("metallurgist"),
    NONE("none");

    private final String id;

    NexusSpecialization(String id) {
        this.id = id;
    }

    public String id() {
        return id;
    }

    public static NexusSpecialization fromId(String value) {
        if (value == null) {
            return NONE;
        }

        return switch (value.trim().toLowerCase()) {
            case "arcanist" -> ARCANIST;
            case "metallurgist" -> METALLURGIST;
            default -> NONE;
        };
    }
}