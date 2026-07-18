package dev.itscarlos.nexuscore.market;

final class MarketRegion {
    private MarketRegion() {
    }

    static boolean contains(
        boolean enabled,
        boolean sameDimension,
        int centerX,
        int centerZ,
        int radius,
        int blockX,
        int blockZ
    ) {
        if (!enabled || !sameDimension || radius < 1) {
            return false;
        }

        long deltaX = (long) blockX - centerX;
        long deltaZ = (long) blockZ - centerZ;
        long radiusSquared = (long) radius * radius;
        return deltaX * deltaX + deltaZ * deltaZ <= radiusSquared;
    }
}
