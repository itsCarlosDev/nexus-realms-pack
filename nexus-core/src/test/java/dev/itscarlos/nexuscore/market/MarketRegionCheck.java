package dev.itscarlos.nexuscore.market;

public final class MarketRegionCheck {
    private static final int CENTER_X = 100;
    private static final int CENTER_Z = -50;
    private static final int RADIUS = 20;

    private MarketRegionCheck() {
    }

    public static void main(String[] args) {
        requireInside("center", true, true, CENTER_X, CENTER_Z);
        requireInside("radius - 1", true, true, CENTER_X + RADIUS - 1, CENTER_Z);
        requireInside("radius exact", true, true, CENTER_X + RADIUS, CENTER_Z);
        requireOutside("radius + 1", true, true, CENTER_X + RADIUS + 1, CENTER_Z);
        requireOutside("different dimension", true, false, CENTER_X, CENTER_Z);
        requireOutside("disabled", false, true, CENTER_X, CENTER_Z);
        System.out.println("Market protection region checks passed: 6/6");
    }

    private static void requireInside(
        String label,
        boolean enabled,
        boolean sameDimension,
        int blockX,
        int blockZ
    ) {
        if (!MarketRegion.contains(
            enabled,
            sameDimension,
            CENTER_X,
            CENTER_Z,
            RADIUS,
            blockX,
            blockZ
        )) {
            throw new AssertionError(label + " should be inside");
        }
    }

    private static void requireOutside(
        String label,
        boolean enabled,
        boolean sameDimension,
        int blockX,
        int blockZ
    ) {
        if (MarketRegion.contains(
            enabled,
            sameDimension,
            CENTER_X,
            CENTER_Z,
            RADIUS,
            blockX,
            blockZ
        )) {
            throw new AssertionError(label + " should be outside");
        }
    }
}
