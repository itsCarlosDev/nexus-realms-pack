package dev.itscarlos.nexuscore;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public final class ClassChangePolicyCheck {
    private ClassChangePolicyCheck() {
    }

    public static void main(String[] args) throws Exception {
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

        require(
            ClassChangePolicy.requiresMagicData("mage", "warrior")
                && ClassChangePolicy.requiresMagicData("warrior", "mage")
                && !ClassChangePolicy.requiresMagicData(
                    "warrior",
                    "gunslinger"
                ),
            "MagicData must be required only when Mage is source or target"
        );
        require(
            ClassChangePolicy.requiresGunOperator("gunslinger", "mage")
                && ClassChangePolicy.requiresGunOperator(
                    "mage",
                    "gunslinger"
                )
                && !ClassChangePolicy.requiresGunOperator(
                    "warrior",
                    "mage"
                ),
            "TaCZ must be required only when Gunslinger is source or target"
        );
        require(
            ClassChangePolicy.isStarterKitFailure(
                "Error: kit_delivery_incomplete"
            )
                && ClassChangePolicy.isStarterKitFailure(
                    "specialization_kit_delivery_incomplete"
                )
                && !ClassChangePolicy.isStarterKitFailure(
                    "final_state_incoherent"
                ),
            "Starter-kit failures must be distinguishable from identity failures"
        );

        String script = Files.readString(
            Path.of(
                "..",
                "kubejs",
                "server_scripts",
                "nexus_class_change.js"
            ),
            StandardCharsets.UTF_8
        );
        int finalizeStart = script.indexOf(
            "function nexusFinalizeForward(player)"
        );
        int clearJournal = script.indexOf(
            "nexusClearJournal(player)",
            finalizeStart
        );
        int retryKits = script.indexOf(
            "nexusRetryPendingStarterKits(",
            clearJournal
        );

        require(
            script.contains("nexus_starter_kit_ledger_version")
                && script.contains("nexus_starter_kit_base")
                && script.contains("nexus_starter_kit_specialization"),
            "Base and specialization kits must share a versioned ledger"
        );
        require(
            finalizeStart >= 0
                && clearJournal > finalizeStart
                && retryKits > clearJournal,
            "Critical journal must clear before starter-kit delivery retry"
        );
        require(
            !script.contains("throw new Error(\n      'kit_delivery_incomplete'")
                && !script.contains(
                    "throw new Error(\n      'specialization_kit_delivery_incomplete'"
                ),
            "Starter-kit delivery must not throw into critical recovery"
        );
        require(
            script.contains("function nexusReconcileLegacyStarterKit(")
                && script.contains("legacy_entry_delivery_ambiguous")
                && script.contains("UNRESOLVED"),
            "Legacy kit progress must reconcile conservatively"
        );
        require(
            script.contains("insertStarterStack(")
                && script.contains("EntryConfirmed")
                && script.contains("InFlightIndex"),
            "Starter delivery must use native insertion and explicit progress"
        );

        System.out.println("Class change policy checks passed: 20/20");
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
