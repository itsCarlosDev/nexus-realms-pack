package dev.itscarlos.nexuscore;

public final class ClassChangePolicyCheck {
    private ClassChangePolicyCheck() {
    }

    public static void main(String[] args) {
        long now = 2_000_000_000_000L;

        require(
            ClassChangePolicy.checkCooldown(false, false, 0L, 0L, now).valid(),
            "Absent cooldown must be valid"
        );
        require(
            !ClassChangePolicy.checkCooldown(true, false, now, 0L, now).valid(),
            "Incomplete cooldown pair must be corrupt"
        );
        require(
            ClassChangePolicy.checkCooldown(
                true,
                true,
                now - 1_000L,
                now + ClassChangePolicy.COOLDOWN_MILLIS - 1_000L,
                now
            ).active(),
            "A coherent future deadline must remain active"
        );
        require(
            !ClassChangePolicy.checkCooldown(
                true,
                true,
                now + ClassChangePolicy.CLOCK_TOLERANCE_MILLIS + 1L,
                now + ClassChangePolicy.COOLDOWN_MILLIS,
                now
            ).valid(),
            "A future start outside tolerance must be corrupt"
        );
        require(
            !ClassChangePolicy.canAffordLevels(40)
                && ClassChangePolicy.canAffordLevels(41),
            "The exact cost boundary must be 41 levels"
        );
        require(
            ClassChangePolicy.requiresUnequip(
                NexusClass.MAGE,
                NexusClass.WARRIOR
            ),
            "Mage equipment must be removed when changing to Warrior"
        );
        require(
            !ClassChangePolicy.requiresUnequip(
                NexusClass.MAGE,
                NexusClass.MAGE
            ),
            "Equipment matching the target class must remain equipped"
        );
        require(
            !ClassChangePolicy.requiresUnequip(
                NexusClass.NONE,
                NexusClass.GUNSLINGER
            ),
            "Unrestricted equipment must remain equipped"
        );
        require(
            ClassChangePolicy.isExactLevelCharge(
                50,
                9,
                5_000,
                5_000,
                0.5F,
                0.5F
            ),
            "An exact 41-level charge must preserve total XP and progress"
        );
        require(
            !ClassChangePolicy.isExactLevelCharge(
                50,
                9,
                5_000,
                4_999,
                0.5F,
                0.5F
            ),
            "A modified total XP value must fail verification"
        );
        require(
            !ClassChangePolicy.requiresForwardRecovery("SANITIZING", "ROLLBACK")
                && ClassChangePolicy.requiresForwardRecovery(
                    "OLD_STATE_REVOKED",
                    "ROLLBACK"
                )
                && ClassChangePolicy.requiresForwardRecovery(
                    "RECOVERY_REQUIRED",
                    "FORWARD"
                ),
            "OLD_STATE_REVOKED must be the forward recovery boundary"
        );
        require(
            ClassChangePolicy.MAX_RECOVERY_ATTEMPTS == 3,
            "Recovery retries must remain bounded at three"
        );

        System.out.println("Class change policy checks passed: 12/12");
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
