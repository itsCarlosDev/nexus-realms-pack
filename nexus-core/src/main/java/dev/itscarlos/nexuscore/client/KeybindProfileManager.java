package dev.itscarlos.nexuscore.client;

import com.mojang.blaze3d.platform.InputConstants;
import dev.itscarlos.nexuscore.NexusClass;
import dev.itscarlos.nexuscore.NexusSpecialization;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraftforge.client.settings.KeyModifier;
import org.lwjgl.glfw.GLFW;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Applies complete Nexus Realms keybind profiles by class.
 *
 * Class-exclusive mappings are disabled when the player is using another class.
 * Common conflict fixes are always applied.
 */
public final class KeybindProfileManager {

    private static NexusClass lastKnownClass = NexusClass.NONE;
    private static NexusSpecialization lastKnownSpecialization = NexusSpecialization.NONE;

    private static final Map<String, Binding> WARRIOR_PROFILE = new HashMap<>();
    private static final Map<String, Binding> ARCANIST_PROFILE = new HashMap<>();
    private static final Map<String, Binding> METALLURGIST_PROFILE = new HashMap<>();
    private static final Map<String, Binding> GUNSLINGER_PROFILE = new HashMap<>();
    private static final Map<String, Binding> COMMON_PROFILE = new HashMap<>();

    private static final Set<String> MANAGED_CLASS_MAPPINGS = new HashSet<>();

    private static final Binding UNBOUND =
        new Binding(InputConstants.UNKNOWN, KeyModifier.NONE);

    static {
        /*
         * COMMON CONFLICT CLEANUP
         *
         * These bindings are applied for every class.
         */

        COMMON_PROFILE.put(
            "key.curios.open.desc",
            key(GLFW.GLFW_KEY_F6)
        );

        COMMON_PROFILE.put(
            "key.push_to_talk",
            key(GLFW.GLFW_KEY_CAPS_LOCK)
        );

        COMMON_PROFILE.put(
            "key.hide_icons",
            keyWithModifier(GLFW.GLFW_KEY_H, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.disable_voice_chat",
            UNBOUND
        );

        COMMON_PROFILE.put(
            "key.shouldersurfing.free_look",
            UNBOUND
        );

        /*
         * Camera controls moved away from normal gameplay keys.
         * This removes the H/J camera rotation/reset problem.
         */
        COMMON_PROFILE.put(
            "key.zoomin",
            keyWithModifier(GLFW.GLFW_KEY_F7, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.centerzoom",
            keyWithModifier(GLFW.GLFW_KEY_F8, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.zoomout",
            keyWithModifier(GLFW.GLFW_KEY_F9, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.rollleft",
            keyWithModifier(GLFW.GLFW_KEY_F7, KeyModifier.ALT)
        );

        COMMON_PROFILE.put(
            "key.rollcenter",
            keyWithModifier(GLFW.GLFW_KEY_F8, KeyModifier.ALT)
        );

        COMMON_PROFILE.put(
            "key.rollright",
            keyWithModifier(GLFW.GLFW_KEY_F9, KeyModifier.ALT)
        );

        COMMON_PROFILE.put(
            "key.point",
            keyWithModifier(GLFW.GLFW_KEY_P, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.startStop",
            keyWithModifier(GLFW.GLFW_KEY_U, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.clearPoint",
            keyWithModifier(GLFW.GLFW_KEY_DELETE, KeyModifier.CONTROL)
        );

        /*
         * Other global conflict fixes.
         */
        COMMON_PROFILE.put(
            "key.journeymap.fullscreen.disable_buttons",
            UNBOUND
        );

        COMMON_PROFILE.put(
            "framedblocks.key.update_cull",
            UNBOUND
        );

        COMMON_PROFILE.put(
            "key.bookofdragons.open_inventory",
            key(GLFW.GLFW_KEY_GRAVE_ACCENT)
        );

        COMMON_PROFILE.put(
            "key.relics.ability_list",
            keyWithModifier(GLFW.GLFW_KEY_R, KeyModifier.ALT)
        );

        COMMON_PROFILE.put(
            "create.keyinfo.toolmenu",
            keyWithModifier(GLFW.GLFW_KEY_G, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "create.keyinfo.toolbelt",
            keyWithModifier(GLFW.GLFW_KEY_B, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.weaponmaster_ydm.opengui",
            keyWithModifier(GLFW.GLFW_KEY_V, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.cataclysm.ability",
            keyWithModifier(GLFW.GLFW_KEY_F1, KeyModifier.SHIFT)
        );

        COMMON_PROFILE.put(
            "key.cataclysm.helmet_ability",
            keyWithModifier(GLFW.GLFW_KEY_F2, KeyModifier.SHIFT)
        );

        COMMON_PROFILE.put(
            "key.cataclysm.chestplate_ability",
            keyWithModifier(GLFW.GLFW_KEY_F3, KeyModifier.SHIFT)
        );

        COMMON_PROFILE.put(
            "key.cataclysm.boots_ability",
            keyWithModifier(GLFW.GLFW_KEY_F4, KeyModifier.SHIFT)
        );

        COMMON_PROFILE.put(
            "key.deeperdarker.boost",
            keyWithModifier(GLFW.GLFW_KEY_D, KeyModifier.ALT)
        );

        COMMON_PROFILE.put(
            "key.deeperdarker.transmit",
            keyWithModifier(GLFW.GLFW_KEY_T, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.aether.invisibility_toggle.desc",
            keyWithModifier(GLFW.GLFW_KEY_I, KeyModifier.ALT)
        );

        COMMON_PROFILE.put(
            "key.inventoryhud.toggle",
            keyWithModifier(GLFW.GLFW_KEY_I, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.inventoryhud.openconfig",
            keyWithModifier(GLFW.GLFW_KEY_O, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.travelersbackpack.inventory",
            keyWithModifier(GLFW.GLFW_KEY_B, KeyModifier.SHIFT)
        );

        COMMON_PROFILE.put(
            "key.emotecraft.fastchoose",
            keyWithModifier(GLFW.GLFW_KEY_B, KeyModifier.ALT)
        );

        COMMON_PROFILE.put(
            "key.sophisticatedbackpacks.inventory_interaction",
            keyWithModifier(GLFW.GLFW_KEY_C, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.journeymap.fullscreen_create_waypoint",
            keyWithModifier(GLFW.GLFW_KEY_J, KeyModifier.ALT)
        );

        COMMON_PROFILE.put(
            "key.journeymap.fullscreen_chat_position",
            keyWithModifier(GLFW.GLFW_KEY_C, KeyModifier.ALT)
        );

        COMMON_PROFILE.put(
            "key.fancytoasts.config_menu",
            keyWithModifier(GLFW.GLFW_KEY_K, KeyModifier.CONTROL)
        );


        /*
         * STRICT MAGE CONFLICT CLEANUP
         *
         * Reserve the Mage gameplay keys so each unmodified key has a single
         * action:
         *
         * G        -> Iron's Spellbooks spell wheel
         * H        -> Familiar screen
         * X        -> Cast spell
         * Z        -> Summon familiar
         * R        -> Allomancy burn
         * Left Alt -> Spell bar modifier
         * J        -> JourneyMap
         *
         * Other actions that previously shared those keys are moved away.
         */

        COMMON_PROFILE.put(
            "key.loadToolbarActivator",
            UNBOUND
        );

        COMMON_PROFILE.put(
            "key.block_factorys_bosses.dodge_roll",
            keyWithModifier(GLFW.GLFW_KEY_F7, KeyModifier.SHIFT)
        );

        COMMON_PROFILE.put(
            "key.travelersbackpack.cycle_tool",
            keyWithModifier(GLFW.GLFW_KEY_F8, KeyModifier.SHIFT)
        );

        COMMON_PROFILE.put(
            "key.journeymap.toggle_waypoints",
            UNBOUND
        );

        COMMON_PROFILE.put(
            "key.jei.showRecipe",
            keyWithModifier(GLFW.GLFW_KEY_R, KeyModifier.SHIFT)
        );

        COMMON_PROFILE.put(
            "fdlib.key.end_cutscene",
            key(GLFW.GLFW_KEY_F12)
        );

        /*
         * STRICT WARRIOR CONFLICT CLEANUP
         *
         * These shared mappings are moved away from the Warrior's reserved
         * gameplay keys so the active Warrior layout has no exact keybind
         * collisions.
         */

        COMMON_PROFILE.put(
            "key.advancements",
            keyWithModifier(GLFW.GLFW_KEY_L, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "iris.keybind.toggleShaders",
            keyWithModifier(GLFW.GLFW_KEY_K, KeyModifier.SHIFT)
        );

        COMMON_PROFILE.put(
            "key.aether.open_accessories.desc",
            keyWithModifier(GLFW.GLFW_KEY_I, KeyModifier.SHIFT)
        );

        COMMON_PROFILE.put(
            "key.cinematiczoom.cinematic_zoom",
            keyWithModifier(GLFW.GLFW_KEY_F6, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.corpse.death_history",
            keyWithModifier(GLFW.GLFW_KEY_U, KeyModifier.SHIFT)
        );

        COMMON_PROFILE.put(
            "key.shouldersurfing.swap_shoulder",
            keyWithModifier(GLFW.GLFW_KEY_F5, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.jei.showUses",
            UNBOUND
        );

        /*
         * Book of Dragons controls are moved away from the Warrior's direct
         * combat mouse buttons and C key.
         */
        COMMON_PROFILE.put(
            "key.bookofdragons.secondary_ability",
            keyWithModifier(GLFW.GLFW_KEY_GRAVE_ACCENT, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.bookofdragons.dragon_sprint",
            keyWithModifier(GLFW.GLFW_KEY_GRAVE_ACCENT, KeyModifier.ALT)
        );

        COMMON_PROFILE.put(
            "key.bookofdragons.primary_ability",
            mouseWithModifier(
                GLFW.GLFW_MOUSE_BUTTON_LEFT,
                KeyModifier.CONTROL
            )
        );

        COMMON_PROFILE.put(
            "key.bookofdragons.free_camera",
            mouseWithModifier(
                GLFW.GLFW_MOUSE_BUTTON_RIGHT,
                KeyModifier.ALT
            )
        );

        /*
         * Doggy Talents whistles are moved away from Invincible Shift+1..4.
         */
        COMMON_PROFILE.put(
            "key.doggytalents.whistle.1",
            keyWithModifier(GLFW.GLFW_KEY_1, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.doggytalents.whistle.2",
            keyWithModifier(GLFW.GLFW_KEY_2, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.doggytalents.whistle.3",
            keyWithModifier(GLFW.GLFW_KEY_3, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.doggytalents.whistle.4",
            keyWithModifier(GLFW.GLFW_KEY_4, KeyModifier.CONTROL)
        );

        /*
         * STRICT GUNSLINGER CONFLICT CLEANUP
         *
         * Reserve the Gunslinger's direct gameplay keys:
         *
         * G        -> Fire Select
         * H        -> Inspect
         * R        -> Reload
         * O        -> Interact
         * C        -> Crawl
         * F4       -> Refit
         * V        -> Zoom
         * Mouse 4  -> Melee
         * Ctrl + R -> Unload
         *
         * Other global actions that used those exact keys are moved away.
         */

        COMMON_PROFILE.put(
            "key.saveToolbarActivator",
            UNBOUND
        );

        COMMON_PROFILE.put(
            "iris.keybind.shaderPackSelection",
            keyWithModifier(GLFW.GLFW_KEY_F10, KeyModifier.SHIFT)
        );

        COMMON_PROFILE.put(
            "key.journeymap.fullscreen_options",
            keyWithModifier(GLFW.GLFW_KEY_J, KeyModifier.CONTROL)
        );

        COMMON_PROFILE.put(
            "key.freecam.toggle",
            keyWithModifier(GLFW.GLFW_KEY_F4, KeyModifier.CONTROL)
        );

        /*
         * WARRIOR — STRICT CONFLICT-FREE LAYOUT
         *
         * Core combat:
         * G          -> Combat Evolution execution
         * R          -> Epic Fight switch mode
         * Mouse 4    -> Epic Fight dodge
         * Right Mouse-> Epic Fight guard
         * Left Mouse -> Epic Fight attack
         * Mouse 5    -> Epic Fight innate skill
         * Left Alt   -> Epic Fight mover skill
         * K          -> Epic Fight skill GUI
         * L          -> Epic Fight lock-on
         * N          -> Epic Skills tree
         * Z / X / C  -> P1nero skills 1 / 2 / 3
         *
         * Extra Warrior systems are moved to unique chords.
         */

        WARRIOR_PROFILE.put(
            "key.combat_evolution.execution",
            key(GLFW.GLFW_KEY_G)
        );

        WARRIOR_PROFILE.put(
            "key.epicskills.open_skill_tree",
            key(GLFW.GLFW_KEY_N)
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.show_tooltip",
            key(GLFW.GLFW_KEY_LEFT_SHIFT)
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.switch_mode",
            key(GLFW.GLFW_KEY_R)
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.dodge",
            mouse(GLFW.GLFW_MOUSE_BUTTON_4)
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.guard",
            mouse(GLFW.GLFW_MOUSE_BUTTON_RIGHT)
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.attack",
            mouse(GLFW.GLFW_MOUSE_BUTTON_LEFT)
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.weapon_innate_skill",
            mouse(GLFW.GLFW_MOUSE_BUTTON_5)
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.mover_skill",
            key(GLFW.GLFW_KEY_LEFT_ALT)
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.skill_gui",
            key(GLFW.GLFW_KEY_K)
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.lock_on",
            key(GLFW.GLFW_KEY_L)
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.lock_on_shift_left",
            UNBOUND
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.lock_on_shift_right",
            UNBOUND
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.lock_on_shift_freely",
            UNBOUND
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.config",
            UNBOUND
        );

        WARRIOR_PROFILE.put(
            "key.epicfight.switch_vanilla_model_debug",
            UNBOUND
        );

        /*
         * Punchy
         */
        WARRIOR_PROFILE.put(
            "key.punchy.open_main_menu",
            key(GLFW.GLFW_KEY_F8)
        );

        WARRIOR_PROFILE.put(
            "key.punchy.inspect",
            key(GLFW.GLFW_KEY_I)
        );

        /*
         * Invincible
         */
        WARRIOR_PROFILE.put(
            "key.invincible.key1",
            keyWithModifier(GLFW.GLFW_KEY_1, KeyModifier.SHIFT)
        );

        WARRIOR_PROFILE.put(
            "key.invincible.key2",
            keyWithModifier(GLFW.GLFW_KEY_2, KeyModifier.SHIFT)
        );

        WARRIOR_PROFILE.put(
            "key.invincible.key3",
            keyWithModifier(GLFW.GLFW_KEY_3, KeyModifier.SHIFT)
        );

        WARRIOR_PROFILE.put(
            "key.invincible.key4",
            keyWithModifier(GLFW.GLFW_KEY_4, KeyModifier.SHIFT)
        );

        /*
         * Sword Soaring
         */
        WARRIOR_PROFILE.put(
            "key.sword_soaring.take_off",
            key(GLFW.GLFW_KEY_Y)
        );

        WARRIOR_PROFILE.put(
            "key.sword_soaring.switch_mode",
            key(GLFW.GLFW_KEY_U)
        );

        WARRIOR_PROFILE.put(
            "key.sword_soaring.acceleration",
            key(GLFW.GLFW_KEY_F7)
        );

        WARRIOR_PROFILE.put(
            "key.sword_soaring.sword_skill",
            mouseWithModifier(
                GLFW.GLFW_MOUSE_BUTTON_RIGHT,
                KeyModifier.SHIFT
            )
        );

        WARRIOR_PROFILE.put(
            "key.sword_soaring.sword_back",
            mouseWithModifier(
                GLFW.GLFW_MOUSE_BUTTON_5,
                KeyModifier.SHIFT
            )
        );

        /*
         * Epic Fight Nightfall / EFN
         */
        WARRIOR_PROFILE.put(
            "key.efn.doppelganger",
            key(GLFW.GLFW_KEY_V)
        );

        WARRIOR_PROFILE.put(
            "key.efn.doppelganger_delay",
            keyWithModifier(GLFW.GLFW_KEY_V, KeyModifier.SHIFT)
        );

        WARRIOR_PROFILE.put(
            "key.efn.summoned_sword",
            mouseWithModifier(
                GLFW.GLFW_MOUSE_BUTTON_5,
                KeyModifier.CONTROL
            )
        );

        WARRIOR_PROFILE.put(
            "key.efn.zansetsu_input_switch",
            keyWithModifier(GLFW.GLFW_KEY_Z, KeyModifier.CONTROL)
        );

        WARRIOR_PROFILE.put(
            "key.efn.arts",
            keyWithModifier(GLFW.GLFW_KEY_C, KeyModifier.SHIFT)
        );

        WARRIOR_PROFILE.put(
            "key.efn.angel",
            keyWithModifier(GLFW.GLFW_KEY_X, KeyModifier.CONTROL)
        );

        WARRIOR_PROFILE.put(
            "key.efn.demon",
            mouseWithModifier(
                GLFW.GLFW_MOUSE_BUTTON_RIGHT,
                KeyModifier.CONTROL
            )
        );

        /*
         * P1nero Combat Evolution
         */
        WARRIOR_PROFILE.put(
            "key.p1nero_ec.skill_1",
            key(GLFW.GLFW_KEY_Z)
        );

        WARRIOR_PROFILE.put(
            "key.p1nero_ec.skill_2",
            key(GLFW.GLFW_KEY_X)
        );

        WARRIOR_PROFILE.put(
            "key.p1nero_ec.skill_3",
            key(GLFW.GLFW_KEY_C)
        );

        /*
         * ARCANIST — MAGE SPECIALIZATION
         *
         * G        -> Iron's Spellbooks spell wheel
         * X        -> Cast spell
         * Left Alt -> Spell bar modifier
         * Z        -> Summon familiar
         * H        -> Familiar screen
         */
        ARCANIST_PROFILE.put(
            "key.irons_spellbooks.spell_wheel",
            key(GLFW.GLFW_KEY_G)
        );

        ARCANIST_PROFILE.put(
            "key.irons_spellbooks.spell_wheel_toggle",
            UNBOUND
        );

        ARCANIST_PROFILE.put(
            "key.irons_spellbooks.spellbook_cast",
            key(GLFW.GLFW_KEY_X)
        );

        ARCANIST_PROFILE.put(
            "key.irons_spellbooks.spell_bar_modifier",
            key(GLFW.GLFW_KEY_LEFT_ALT)
        );

        for (int i = 1; i <= 15; i++) {
            ARCANIST_PROFILE.put(
                "key.irons_spellbooks.spell_quick_cast_" + i,
                UNBOUND
            );
        }

        ARCANIST_PROFILE.put(
            "key.familiarslib.summoning_key",
            key(GLFW.GLFW_KEY_Z)
        );

        ARCANIST_PROFILE.put(
            "key.familiarslib.screen_key",
            key(GLFW.GLFW_KEY_H)
        );

        /*
         * METALLURGIST — MAGE SPECIALIZATION
         *
         * R = Allomancy burn
         *
         * Basic Era III metals:
         * Shift+1 Iron
         * Shift+2 Steel
         * Shift+3 Tin
         * Shift+4 Pewter
         * Shift+5 Zinc
         * Shift+6 Brass
         * Shift+7 Copper
         * Shift+8 Bronze
         *
         * Advanced Era IV metals:
         * Alt+1 Aluminum
         * Alt+2 Duralumin
         * Alt+3 Chromium
         * Alt+4 Nicrosil
         * Alt+5 Gold
         * Alt+6 Electrum
         * Alt+7 Cadmium
         * Alt+8 Bendalloy
         */
        METALLURGIST_PROFILE.put(
            "key.burn",
            key(GLFW.GLFW_KEY_R)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.iron",
            keyWithModifier(GLFW.GLFW_KEY_1, KeyModifier.SHIFT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.steel",
            keyWithModifier(GLFW.GLFW_KEY_2, KeyModifier.SHIFT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.tin",
            keyWithModifier(GLFW.GLFW_KEY_3, KeyModifier.SHIFT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.pewter",
            keyWithModifier(GLFW.GLFW_KEY_4, KeyModifier.SHIFT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.zinc",
            keyWithModifier(GLFW.GLFW_KEY_5, KeyModifier.SHIFT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.brass",
            keyWithModifier(GLFW.GLFW_KEY_6, KeyModifier.SHIFT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.copper",
            keyWithModifier(GLFW.GLFW_KEY_7, KeyModifier.SHIFT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.bronze",
            keyWithModifier(GLFW.GLFW_KEY_8, KeyModifier.SHIFT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.aluminum",
            keyWithModifier(GLFW.GLFW_KEY_1, KeyModifier.ALT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.duralumin",
            keyWithModifier(GLFW.GLFW_KEY_2, KeyModifier.ALT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.chromium",
            keyWithModifier(GLFW.GLFW_KEY_3, KeyModifier.ALT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.nicrosil",
            keyWithModifier(GLFW.GLFW_KEY_4, KeyModifier.ALT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.gold",
            keyWithModifier(GLFW.GLFW_KEY_5, KeyModifier.ALT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.electrum",
            keyWithModifier(GLFW.GLFW_KEY_6, KeyModifier.ALT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.cadmium",
            keyWithModifier(GLFW.GLFW_KEY_7, KeyModifier.ALT)
        );

        METALLURGIST_PROFILE.put(
            "key.metals.bendalloy",
            keyWithModifier(GLFW.GLFW_KEY_8, KeyModifier.ALT)
        );

        /*
         * GUNSLINGER — STRICT CONFLICT-FREE LAYOUT
         *
         * G        -> Fire Select
         * H        -> Inspect
         * R        -> Reload
         * O        -> Interact
         * C        -> Crawl
         * F4       -> Refit
         * V        -> Zoom
         * Mouse 4  -> Melee
         * LMB      -> Shoot
         * RMB      -> Aim
         * Ctrl + R -> Unload
         * Alt + T  -> TaCZ Config
         */
        GUNSLINGER_PROFILE.put(
            "key.tacz.inspect.desc",
            key(GLFW.GLFW_KEY_H)
        );

        GUNSLINGER_PROFILE.put(
            "key.tacz.reload.desc",
            key(GLFW.GLFW_KEY_R)
        );

        GUNSLINGER_PROFILE.put(
            "key.tacz.shoot.desc",
            mouse(GLFW.GLFW_MOUSE_BUTTON_LEFT)
        );

        GUNSLINGER_PROFILE.put(
            "key.tacz.interact.desc",
            key(GLFW.GLFW_KEY_O)
        );

        GUNSLINGER_PROFILE.put(
            "key.tacz.fire_select.desc",
            key(GLFW.GLFW_KEY_G)
        );

        GUNSLINGER_PROFILE.put(
            "key.tacz.aim.desc",
            mouse(GLFW.GLFW_MOUSE_BUTTON_RIGHT)
        );

        GUNSLINGER_PROFILE.put(
            "key.tacz.crawl.desc",
            key(GLFW.GLFW_KEY_C)
        );

        GUNSLINGER_PROFILE.put(
            "key.tacz.refit.desc",
            key(GLFW.GLFW_KEY_F4)
        );

        GUNSLINGER_PROFILE.put(
            "key.tacz.zoom.desc",
            key(GLFW.GLFW_KEY_V)
        );

        GUNSLINGER_PROFILE.put(
            "key.tacz.melee.desc",
            mouse(GLFW.GLFW_MOUSE_BUTTON_4)
        );

        GUNSLINGER_PROFILE.put(
            "key.tacz.open_config.desc",
            keyWithModifier(GLFW.GLFW_KEY_T, KeyModifier.ALT)
        );

        GUNSLINGER_PROFILE.put(
            "tacztweaks.key.reduceSensitivity",
            UNBOUND
        );

        GUNSLINGER_PROFILE.put(
            "tacztweaks.key.tiltGun",
            UNBOUND
        );

        GUNSLINGER_PROFILE.put(
            "tacztweaks.key.unload",
            keyWithModifier(GLFW.GLFW_KEY_R, KeyModifier.CONTROL)
        );

        /*
         * All class-exclusive mappings are disabled before the active profile
         * is applied. This guarantees that Mage does not retain Warrior or
         * Gunslinger controls, and vice versa.
         */
        MANAGED_CLASS_MAPPINGS.addAll(WARRIOR_PROFILE.keySet());
        MANAGED_CLASS_MAPPINGS.addAll(ARCANIST_PROFILE.keySet());
        MANAGED_CLASS_MAPPINGS.addAll(METALLURGIST_PROFILE.keySet());
        MANAGED_CLASS_MAPPINGS.addAll(GUNSLINGER_PROFILE.keySet());
    }

    private KeybindProfileManager() {
    }

    public static boolean applyCurrentClass() {
        NexusClass currentClass = getCurrentClass();
        NexusSpecialization currentSpecialization = getCurrentSpecialization();

        if (
            currentClass == lastKnownClass &&
            currentSpecialization == lastKnownSpecialization
        ) {
            return false;
        }

        if (currentClass == NexusClass.NONE) {
            applyNoClassProfile();
            return false;
        }

        applyProfile(
            currentClass,
            currentSpecialization
        );

        return true;
    }

    public static boolean forceApplyCurrentClass() {
        NexusClass currentClass = getCurrentClass();
        NexusSpecialization currentSpecialization = getCurrentSpecialization();

        if (currentClass == NexusClass.NONE) {
            applyNoClassProfile();
            return false;
        }

        applyProfile(
            currentClass,
            currentSpecialization
        );

        return true;
    }

    public static void applyProfile(NexusClass nexusClass) {
        applyProfile(
            nexusClass,
            getCurrentSpecialization()
        );
    }

    public static void applyProfile(
        NexusClass nexusClass,
        NexusSpecialization specialization
    ) {
        Minecraft minecraft = Minecraft.getInstance();

        if (minecraft.options == null) {
            return;
        }

        Map<String, Binding> activeProfile = switch (nexusClass) {
            case WARRIOR -> WARRIOR_PROFILE;

            case MAGE -> switch (specialization) {
                case ARCANIST -> ARCANIST_PROFILE;
                case METALLURGIST -> METALLURGIST_PROFILE;
                default -> Map.of();
            };

            case GUNSLINGER -> GUNSLINGER_PROFILE;
            default -> Map.of();
        };

        Map<String, KeyMapping> mappingsByName =
            collectMappings(minecraft);

        /*
         * First disable every class and specialization mapping managed by
         * Nexus Core. This prevents controls from a previous role surviving
         * after a class or Mage specialization switch.
         */
        for (String mappingName : MANAGED_CLASS_MAPPINGS) {
            KeyMapping mapping =
                mappingsByName.get(mappingName);

            if (mapping != null) {
                applyBinding(
                    mapping,
                    UNBOUND
                );
            }
        }

        /*
         * Apply the shared clean layout.
         */
        applyBindings(
            mappingsByName,
            COMMON_PROFILE
        );

        /*
         * Enable only the active class/specialization profile.
         */
        applyBindings(
            mappingsByName,
            activeProfile
        );

        KeyMapping.resetMapping();
        minecraft.options.save();

        lastKnownClass = nexusClass;
        lastKnownSpecialization =
            nexusClass == NexusClass.MAGE
                ? specialization
                : NexusSpecialization.NONE;
    }

    public static void applyNoClassProfile() {
        Minecraft minecraft = Minecraft.getInstance();

        if (minecraft.options == null) {
            return;
        }

        Map<String, KeyMapping> mappingsByName =
            collectMappings(minecraft);

        for (String mappingName : MANAGED_CLASS_MAPPINGS) {
            KeyMapping mapping =
                mappingsByName.get(mappingName);

            if (mapping != null) {
                applyBinding(
                    mapping,
                    UNBOUND
                );
            }
        }

        applyBindings(
            mappingsByName,
            COMMON_PROFILE
        );

        KeyMapping.resetMapping();
        minecraft.options.save();

        lastKnownClass = NexusClass.NONE;
        lastKnownSpecialization =
            NexusSpecialization.NONE;
    }

    private static Map<String, KeyMapping> collectMappings(
        Minecraft minecraft
    ) {
        Map<String, KeyMapping> mappingsByName = new HashMap<>();

        for (KeyMapping mapping : minecraft.options.keyMappings) {
            mappingsByName.put(
                mapping.getName(),
                mapping
            );
        }

        return mappingsByName;
    }

    private static void applyBindings(
        Map<String, KeyMapping> mappingsByName,
        Map<String, Binding> bindings
    ) {
        for (Map.Entry<String, Binding> entry : bindings.entrySet()) {
            KeyMapping mapping = mappingsByName.get(entry.getKey());

            if (mapping != null) {
                applyBinding(
                    mapping,
                    entry.getValue()
                );
            }
        }
    }

    private static void applyBinding(
        KeyMapping mapping,
        Binding binding
    ) {
        mapping.setKeyModifierAndCode(
            binding.modifier(),
            binding.key()
        );
    }

    private static NexusClass getCurrentClass() {
        return ClientClassState.get();
    }

    private static NexusSpecialization getCurrentSpecialization() {
        return ClientClassState.getSpecialization();
    }

    public static void reset() {
        lastKnownClass = NexusClass.NONE;
        lastKnownSpecialization =
            NexusSpecialization.NONE;
    }

    private static Binding key(int glfwKey) {
        return new Binding(
            InputConstants.Type.KEYSYM.getOrCreate(glfwKey),
            KeyModifier.NONE
        );
    }

    private static Binding keyWithModifier(
        int glfwKey,
        KeyModifier modifier
    ) {
        return new Binding(
            InputConstants.Type.KEYSYM.getOrCreate(glfwKey),
            modifier
        );
    }

    private static Binding mouse(int glfwButton) {
        return new Binding(
            InputConstants.Type.MOUSE.getOrCreate(glfwButton),
            KeyModifier.NONE
        );
    }

    private static Binding mouseWithModifier(
        int glfwButton,
        KeyModifier modifier
    ) {
        return new Binding(
            InputConstants.Type.MOUSE.getOrCreate(glfwButton),
            modifier
        );
    }

    private record Binding(
        InputConstants.Key key,
        KeyModifier modifier
    ) {
    }
}