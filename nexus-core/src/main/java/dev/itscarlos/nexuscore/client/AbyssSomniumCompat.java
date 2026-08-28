package dev.itscarlos.nexuscore.client;

import dev.itscarlos.nexuscore.NexusCore;
import net.minecraft.world.entity.player.Player;
import net.minecraftforge.common.capabilities.Capability;
import net.minecraftforge.common.util.LazyOptional;

import java.lang.reflect.Field;

public final class AbyssSomniumCompat {

    private static final String VARIABLES_CLASS =
        "net.yezon.theabyss.network.TheabyssModVariables";

    private static final String PLAYER_VARIABLES_CLASS =
        VARIABLES_CLASS + "$PlayerVariables";

    private static boolean initialized = false;
    private static boolean warningLogged = false;

    private static Capability<?> playerVariablesCapability;
    private static Field manaField;

    private AbyssSomniumCompat() {
    }

    private static void initialize() {
        if (initialized) {
            return;
        }

        initialized = true;

        try {
            Class<?> variablesClass =
                Class.forName(VARIABLES_CLASS);

            playerVariablesCapability =
                (Capability<?>) variablesClass
                    .getField("PLAYER_VARIABLES_CAPABILITY")
                    .get(null);

            Class<?> playerVariablesClass =
                Class.forName(PLAYER_VARIABLES_CLASS);

            manaField =
                playerVariablesClass.getField("Mana");

            NexusCore.LOGGER.info(
                "[Nexus Realms] The Abyss Somnium HUD integration enabled."
            );
        } catch (ReflectiveOperationException | LinkageError error) {
            playerVariablesCapability = null;
            manaField = null;

            NexusCore.LOGGER.warn(
                "[Nexus Realms] Could not initialize The Abyss Somnium integration.",
                error
            );
        }
    }

    @SuppressWarnings({
        "rawtypes",
        "unchecked"
    })
    public static boolean shouldRender(Player player) {
        if (player == null) {
            return false;
        }

        initialize();

        /*
         * Fail-open:
         * si una actualización futura de The Abyss cambia su API,
         * preferimos que la barra aparezca antes que provocar errores.
         */
        if (
            playerVariablesCapability == null ||
            manaField == null
        ) {
            return true;
        }

        try {
            LazyOptional<?> optional =
                player.getCapability(
                    (Capability) playerVariablesCapability
                );

            Object variables = optional.orElse(null);

            if (variables == null) {
                return true;
            }

            double mana = manaField.getDouble(variables);

            /*
             * The Abyss usa > 1 como umbral para considerar
             * que existe Somnium utilizable.
             */
            return mana > 1.0D;
        } catch (ReflectiveOperationException | RuntimeException error) {
            if (!warningLogged) {
                warningLogged = true;

                NexusCore.LOGGER.warn(
                    "[Nexus Realms] Could not read current Somnium value.",
                    error
                );
            }

            return true;
        }
    }
}