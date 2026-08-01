package dev.itscarlos.nexuscore.client;

import com.mojang.blaze3d.platform.InputConstants;
import dev.itscarlos.nexuscore.NexusClass;
import dev.itscarlos.nexuscore.NexusSpecialization;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import net.minecraft.client.KeyMapping;
import net.minecraftforge.client.settings.KeyModifier;
import org.lwjgl.glfw.GLFW;

public final class KeybindProfilePolicyCheck {
    private static final String GUARD_MAPPING =
        "key.epicfight.guard";

    private static final String PMMO_GLOSSARY_MAPPING =
        "key.pmmo.openMenu";

    private KeybindProfilePolicyCheck() {
    }

    public static void main(String[] args) throws Exception {
        normalizesRuntimeRoleNames();
        warriorReceivesExpectedProfile();
        mageReceivesExpectedProfile();
        gunslingerReceivesExpectedProfile();
        classChangesReapplyContexts();
        emptyOrUnknownClassActivatesNoClassProfile();
        sameClassDoesNotRequireAnotherSave();
        preservesValidCustomManagedBinding();
        preservesNeutralAndUnmanagedMappings();
        preservesValidCustomTooltipKey();
        migratesLegacyUnknownOnlyOnce();
        keepsTooltipOutsideClassRestrictions();
        leavesNoManagedMappingUnknown();
        toleratesUnregisteredMappings();
        classSyncSchedulesDeferredApplication();
        keepsGuardBindingUnchanged();
        pmmoGlossaryOwnsPlainF9();
        migratesLegacyGunslingerRefitOnlyOnce();

        System.out.println(
            "Keybind profile policy checks passed: 18/18"
        );
    }

    private static void pmmoGlossaryOwnsPlainF9()
        throws Exception {
        String[] profileNames = {
            "COMMON_PROFILE",
            "WARRIOR_PROFILE",
            "ARCANIST_PROFILE",
            "METALLURGIST_PROFILE",
            "GUNSLINGER_PROFILE"
        };

        for (String profileName : profileNames) {
            for (
                Map.Entry<String, Object> entry :
                profile(profileName).entrySet()
            ) {
                if (
                    bindingKey(entry.getValue()).getValue() ==
                        GLFW.GLFW_KEY_F9 &&
                    bindingModifier(entry.getValue()) == KeyModifier.NONE
                ) {
                    require(
                        PMMO_GLOSSARY_MAPPING.equals(entry.getKey()),
                        "Plain F9 must be reserved for PMMO Open Glossary"
                    );
                }
            }
        }

        Object glossaryBinding =
            profile("COMMON_PROFILE").get(PMMO_GLOSSARY_MAPPING);

        require(
            glossaryBinding != null &&
            bindingKey(glossaryBinding).getValue() == GLFW.GLFW_KEY_F9 &&
            bindingModifier(glossaryBinding) == KeyModifier.NONE,
            "PMMO Open Glossary must use plain F9 in COMMON_PROFILE"
        );
    }

    private static void migratesLegacyGunslingerRefitOnlyOnce() {
        KeyMapping refitMapping = mapping(
            "key.tacz.refit.desc",
            GLFW.GLFW_KEY_F9
        );

        require(
            KeybindProfileManager
                .migrateLegacyGunslingerRefitMapping(refitMapping),
            "Legacy TaCZ Refit F9 must migrate to Z"
        );
        require(
            refitMapping.getKey().getValue() == GLFW.GLFW_KEY_Z &&
            refitMapping.getKeyModifier() == KeyModifier.NONE,
            "Migrated TaCZ Refit must use plain Z"
        );
        require(
            !KeybindProfileManager
                .migrateLegacyGunslingerRefitMapping(refitMapping),
            "TaCZ Refit migration must be idempotent"
        );
    }

    private static void normalizesRuntimeRoleNames() {
        require(
            NexusClass.fromId("warrior") == NexusClass.WARRIOR &&
            NexusClass.fromId("guerrero") == NexusClass.WARRIOR,
            "Warrior aliases must normalize to WARRIOR"
        );
        require(
            NexusClass.fromId("mage") == NexusClass.MAGE &&
            NexusClass.fromId("mago") == NexusClass.MAGE &&
            NexusClass.fromId("arcanist") == NexusClass.MAGE &&
            NexusClass.fromId("arcanista") == NexusClass.MAGE &&
            NexusClass.fromId("metallurgist") == NexusClass.MAGE &&
            NexusClass.fromId("metalomante") == NexusClass.MAGE,
            "Mage and specialization aliases must normalize to MAGE"
        );
        require(
            NexusClass.fromId("gunslinger") == NexusClass.GUNSLINGER &&
            NexusClass.fromId("gunner") == NexusClass.GUNSLINGER &&
            NexusClass.fromId("pistolero") == NexusClass.GUNSLINGER,
            "Gunslinger aliases must normalize to GUNSLINGER"
        );
        require(
            NexusSpecialization.fromId("arcanist") ==
                NexusSpecialization.ARCANIST &&
            NexusSpecialization.fromId("arcanista") ==
                NexusSpecialization.ARCANIST,
            "Arcanist aliases must normalize to ARCANIST"
        );
        require(
            NexusSpecialization.fromId("metallurgist") ==
                NexusSpecialization.METALLURGIST &&
            NexusSpecialization.fromId("metalomante") ==
                NexusSpecialization.METALLURGIST,
            "Metallurgist aliases must normalize to METALLURGIST"
        );
        require(
            NexusClass.fromId("") == NexusClass.NONE &&
            NexusClass.fromId("unknown") == NexusClass.NONE &&
            NexusSpecialization.fromId("") ==
                NexusSpecialization.NONE &&
            NexusSpecialization.fromId("unknown") ==
                NexusSpecialization.NONE,
            "Empty and unknown role names must remain inactive"
        );
    }

    private static void warriorReceivesExpectedProfile()
        throws Exception {
        assertProfile(
            "WARRIOR_PROFILE",
            NexusClass.WARRIOR,
            NexusSpecialization.NONE
        );
    }

    private static void mageReceivesExpectedProfile()
        throws Exception {
        assertProfile(
            "ARCANIST_PROFILE",
            NexusClass.MAGE,
            NexusSpecialization.ARCANIST
        );
        assertProfile(
            "METALLURGIST_PROFILE",
            NexusClass.MAGE,
            NexusSpecialization.METALLURGIST
        );
    }

    private static void gunslingerReceivesExpectedProfile()
        throws Exception {
        assertProfile(
            "GUNSLINGER_PROFILE",
            NexusClass.GUNSLINGER,
            NexusSpecialization.NONE
        );
    }

    private static void classChangesReapplyContexts() {
        Map<String, KeyMapping> mappings =
            mappingsForManagedProfiles();

        KeybindProfileManager.applyProfileToMappings(
            mappings,
            NexusClass.WARRIOR,
            NexusSpecialization.NONE
        );

        require(
            mappings.get(GUARD_MAPPING)
                .getKeyConflictContext()
                .isActive(),
            "Warrior Guard must be active for Warrior"
        );

        KeybindProfileManager.applyProfileToMappings(
            mappings,
            NexusClass.MAGE,
            NexusSpecialization.ARCANIST
        );

        require(
            !mappings.get(GUARD_MAPPING)
                .getKeyConflictContext()
                .isActive(),
            "Warrior Guard must be inactive after Warrior -> Mage"
        );
        requireActiveKey(
            mappings,
            "key.irons_spellbooks.spellbook_cast",
            GLFW.GLFW_KEY_V,
            "Mage cast must activate after Warrior -> Mage"
        );

        KeybindProfileManager.applyProfileToMappings(
            mappings,
            NexusClass.GUNSLINGER,
            NexusSpecialization.NONE
        );

        require(
            !mappings.get(
                "key.irons_spellbooks.spellbook_cast"
            ).getKeyConflictContext().isActive(),
            "Mage cast must be inactive after Mage -> Gunslinger"
        );
        requireActiveKey(
            mappings,
            "key.tacz.reload.desc",
            GLFW.GLFW_KEY_R,
            "TaCZ reload must activate after Mage -> Gunslinger"
        );
    }

    private static void emptyOrUnknownClassActivatesNoClassProfile() {
        Map<String, KeyMapping> mappings =
            mappingsForManagedProfiles();

        KeybindProfileManager.applyProfileToMappings(
            mappings,
            NexusClass.fromId("unknown"),
            NexusSpecialization.fromId("unknown")
        );

        for (KeyMapping mapping : mappings.values()) {
            require(
                !mapping.getKeyConflictContext().isActive(),
                "Unknown role must not activate " + mapping.getName()
            );
            require(
                mapping.getKey().getValue() != GLFW.GLFW_KEY_UNKNOWN,
                "Unknown role must not write -1 to " + mapping.getName()
            );
        }
    }

    private static void sameClassDoesNotRequireAnotherSave() {
        Map<String, KeyMapping> mappings =
            mappingsForManagedProfiles();

        require(
            KeybindProfileManager.applyProfileToMappings(
                mappings,
                NexusClass.WARRIOR,
                NexusSpecialization.NONE
            ),
            "First Warrior application must repair legacy UNKNOWN keys"
        );
        require(
            !KeybindProfileManager.applyProfileToMappings(
                mappings,
                NexusClass.WARRIOR,
                NexusSpecialization.NONE
            ),
            "Same matching profile must not require another options save"
        );
    }

    private static void preservesValidCustomManagedBinding() {
        Map<String, KeyMapping> mappings =
            mappingsForManagedProfiles();
        KeyMapping cast =
            mappings.get(
                "key.irons_spellbooks.spellbook_cast"
            );

        cast.setKey(
            InputConstants.Type.KEYSYM.getOrCreate(
                GLFW.GLFW_KEY_B
            )
        );

        KeybindProfileManager.applyProfileToMappings(
            mappings,
            NexusClass.MAGE,
            NexusSpecialization.ARCANIST
        );

        require(
            cast.getKey().getValue() == GLFW.GLFW_KEY_B,
            "A valid custom managed key must be preserved"
        );
        require(
            cast.getKeyConflictContext().isActive(),
            "A custom managed key must activate for its profile"
        );
    }

    private static void preservesNeutralAndUnmanagedMappings() {
        Map<String, KeyMapping> mappings =
            mappingsForManagedProfiles();

        KeyMapping tooltip = mapping(
            KeybindProfileManager.EPIC_FIGHT_TOOLTIP_MAPPING,
            GLFW.GLFW_KEY_P
        );
        KeyMapping unmanaged = mapping(
            "key.unmanaged.nexus_check",
            GLFW.GLFW_KEY_B
        );

        mappings.put(tooltip.getName(), tooltip);
        mappings.put(unmanaged.getName(), unmanaged);

        KeybindProfileManager.applyProfileToMappings(
            mappings,
            NexusClass.WARRIOR,
            NexusSpecialization.NONE
        );

        require(
            tooltip.getKey().getValue() == GLFW.GLFW_KEY_P &&
            tooltip.getKeyConflictContext().isActive(),
            "Neutral tooltip mapping must remain intact"
        );
        require(
            unmanaged.getKey().getValue() == GLFW.GLFW_KEY_B &&
            unmanaged.getKeyConflictContext().isActive(),
            "Unmanaged mappings must remain intact"
        );
    }

    private static void preservesValidCustomTooltipKey() {
        KeyMapping mapping = mapping(
            "custom-tooltip",
            GLFW.GLFW_KEY_P
        );

        require(
            !KeybindProfileManager.migrateLegacyNeutralMapping(mapping),
            "A valid custom tooltip key must not be migrated"
        );
        require(
            mapping.getKey().getValue() == GLFW.GLFW_KEY_P,
            "The valid custom tooltip key must be preserved"
        );
    }

    private static void migratesLegacyUnknownOnlyOnce() {
        KeyMapping mapping = mapping(
            "legacy-tooltip",
            GLFW.GLFW_KEY_UNKNOWN
        );

        require(
            KeybindProfileManager.migrateLegacyNeutralMapping(mapping),
            "Legacy UNKNOWN tooltip key must be migrated"
        );
        require(
            mapping.getKey().getValue() == GLFW.GLFW_KEY_LEFT_SHIFT,
            "Legacy tooltip key must use Epic Fight's official default"
        );
        require(
            mapping.getKeyModifier() == KeyModifier.NONE,
            "Tooltip migration must not add a modifier"
        );
        require(
            !KeybindProfileManager.migrateLegacyNeutralMapping(mapping),
            "Tooltip migration must be idempotent"
        );
    }

    private static void keepsTooltipOutsideClassRestrictions() {
        require(
            !KeybindProfileManager.isClassManagedMapping(
                KeybindProfileManager.EPIC_FIGHT_TOOLTIP_MAPPING
            ),
            "Tooltip mapping must remain available for every class"
        );
    }

    private static void leavesNoManagedMappingUnknown() {
        Map<String, KeyMapping> mappings =
            mappingsForAllNexusProfiles();

        KeybindProfileManager.applyProfileToMappings(
            mappings,
            NexusClass.NONE,
            NexusSpecialization.NONE
        );

        for (KeyMapping mapping : mappings.values()) {
            require(
                mapping.getKey().getValue() != GLFW.GLFW_KEY_UNKNOWN,
                mapping.getName() + " must not retain key code -1"
            );
        }
    }

    private static void toleratesUnregisteredMappings() {
        require(
            !KeybindProfileManager.applyProfileToMappings(
                new HashMap<>(),
                NexusClass.WARRIOR,
                NexusSpecialization.NONE
            ),
            "Missing third-party mappings must be ignored safely"
        );
    }

    private static void classSyncSchedulesDeferredApplication()
        throws Exception {
        ClientConnectionEvents.cancelProfileApply();

        ClientClassState.accept(
            NexusClass.WARRIOR,
            NexusSpecialization.NONE
        );

        Field pendingField =
            ClientConnectionEvents.class.getDeclaredField(
                "profileApplyPending"
            );
        pendingField.setAccessible(true);

        require(
            pendingField.getBoolean(null),
            "Receiving a class sync must schedule deferred application"
        );
        require(
            ClientClassState.isSynchronizedFromServer(),
            "Client class must be marked synchronized"
        );

        ClientClassState.reset();
    }

    private static void keepsGuardBindingUnchanged()
        throws Exception {
        Map<String, Object> warriorProfile =
            profile("WARRIOR_PROFILE");

        Object guardBinding =
            warriorProfile.get(GUARD_MAPPING);

        require(
            guardBinding != null,
            "Warrior Guard mapping must remain configured"
        );

        InputConstants.Key guardKey =
            bindingKey(guardBinding);
        KeyModifier guardModifier =
            bindingModifier(guardBinding);

        require(
            guardKey.getType() == InputConstants.Type.MOUSE &&
            guardKey.getValue() == GLFW.GLFW_MOUSE_BUTTON_RIGHT,
            "Warrior Guard must remain on right mouse"
        );
        require(
            guardModifier == KeyModifier.NONE,
            "Warrior Guard modifier must remain unchanged"
        );
    }

    private static void assertProfile(
        String profileField,
        NexusClass nexusClass,
        NexusSpecialization specialization
    ) throws Exception {
        Map<String, KeyMapping> mappings =
            mappingsForManagedProfiles();
        Map<String, Object> expectedProfile =
            profile(profileField);

        KeybindProfileManager.applyProfileToMappings(
            mappings,
            nexusClass,
            specialization
        );

        for (
            Map.Entry<String, Object> entry :
            expectedProfile.entrySet()
        ) {
            KeyMapping mapping =
                mappings.get(entry.getKey());
            InputConstants.Key expectedKey =
                bindingKey(entry.getValue());

            require(
                mapping != null,
                entry.getKey() + " must exist in the test registry"
            );

            if (expectedKey.equals(InputConstants.UNKNOWN)) {
                require(
                    !mapping.getKeyConflictContext().isActive(),
                    entry.getKey() + " must be disabled safely"
                );
                require(
                    mapping.getKey().getValue() !=
                        GLFW.GLFW_KEY_UNKNOWN,
                    entry.getKey() + " must keep a valid key code"
                );
                continue;
            }

            require(
                mapping.getKey().equals(expectedKey),
                entry.getKey() + " must use its profile key"
            );
            require(
                mapping.getKeyModifier() ==
                    bindingModifier(entry.getValue()),
                entry.getKey() + " must use its profile modifier"
            );
            require(
                mapping.getKeyConflictContext().isActive(),
                entry.getKey() + " must be active for its profile"
            );
        }

        for (String mappingName : managedMappingNames()) {
            Object expectedBinding =
                expectedProfile.get(mappingName);

            if (
                expectedBinding == null ||
                bindingKey(expectedBinding).equals(
                    InputConstants.UNKNOWN
                )
            ) {
                require(
                    !mappings.get(mappingName)
                        .getKeyConflictContext()
                        .isActive(),
                    mappingName
                        + " must be inactive outside its active profile"
                );
            }
        }
    }

    private static void requireActiveKey(
        Map<String, KeyMapping> mappings,
        String mappingName,
        int keyCode,
        String message
    ) {
        KeyMapping mapping = mappings.get(mappingName);

        require(
            mapping.getKey().getValue() == keyCode &&
            mapping.getKeyConflictContext().isActive(),
            message
        );
    }

    private static Map<String, KeyMapping>
        mappingsForManagedProfiles() {
        Map<String, KeyMapping> mappings =
            new HashMap<>();

        for (String mappingName : managedMappingNames()) {
            mappings.put(
                mappingName,
                mapping(
                    mappingName,
                    GLFW.GLFW_KEY_UNKNOWN
                )
            );
        }

        return mappings;
    }

    private static Map<String, KeyMapping>
        mappingsForAllNexusProfiles() {
        Map<String, KeyMapping> mappings =
            mappingsForManagedProfiles();

        try {
            for (
                String mappingName :
                profile("COMMON_PROFILE").keySet()
            ) {
                mappings.putIfAbsent(
                    mappingName,
                    mapping(
                        mappingName,
                        GLFW.GLFW_KEY_UNKNOWN
                    )
                );
            }
        } catch (Exception exception) {
            throw new AssertionError(
                "Unable to inspect common profile",
                exception
            );
        }

        return mappings;
    }

    @SuppressWarnings("unchecked")
    private static Set<String> managedMappingNames() {
        try {
            Field field =
                KeybindProfileManager.class.getDeclaredField(
                    "MANAGED_CLASS_MAPPINGS"
                );
            field.setAccessible(true);
            return (Set<String>) field.get(null);
        } catch (ReflectiveOperationException exception) {
            throw new AssertionError(
                "Unable to inspect managed mappings",
                exception
            );
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> profile(
        String fieldName
    ) throws Exception {
        Field field =
            KeybindProfileManager.class.getDeclaredField(
                fieldName
            );
        field.setAccessible(true);
        return (Map<String, Object>) field.get(null);
    }

    private static InputConstants.Key bindingKey(
        Object binding
    ) throws Exception {
        Method accessor =
            binding.getClass().getDeclaredMethod("key");
        accessor.setAccessible(true);
        return (InputConstants.Key) accessor.invoke(binding);
    }

    private static KeyModifier bindingModifier(
        Object binding
    ) throws Exception {
        Method accessor =
            binding.getClass().getDeclaredMethod("modifier");
        accessor.setAccessible(true);
        return (KeyModifier) accessor.invoke(binding);
    }

    private static KeyMapping mapping(
        String name,
        int keyCode
    ) {
        return new KeyMapping(
            name,
            InputConstants.Type.KEYSYM,
            keyCode,
            "key.categories.nexuscore.check"
        );
    }

    private static void require(
        boolean condition,
        String message
    ) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
