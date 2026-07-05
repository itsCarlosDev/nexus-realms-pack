# Mod list plan

This is a planning document only. Do not install all candidates at once. Add mods in small batches and test after each batch.

## Version target

- Target Minecraft: `1.20.1`
- Loader: Forge
- Forge: `47.x`
- Exact Forge build: pending final choice in Prism Launcher and the server

Do not migrate to Minecraft `1.21.1` for now. Nexus Realms is targeting Forge 1.20.1 because it keeps the intended RPG/survival stack compatible: Create, TacZ, Iron's Spells, Cataclysm, Alex's Mobs, Farmer's Delight, Chef's Delight, YUNG's Better Dungeons, YUNG's Better Mineshafts, Cult of Azazel, Stellara, You Died, and most of the planned survival/RPG ecosystem.

| Category | Candidate mods | Notes |
| --- | --- | --- |
| Core / libraries | KubeJS | Needed for pack scripting, classes, recipes, and progression logic. Add other required libraries as dependencies appear. |
| Performance | ModernFix, FerriteCore | Usually important early additions. Confirm Forge 1.20.1 compatibility. |
| Client visual | Embeddium, Oculus, Entity Culling, More Culling, FancyMenu, Drippy Loading Screen, Shoulder Surfing Reloaded | Usually `client`. Keep server clean of visual-only mods. |
| Create / building | Create, Create: Copycats+ | Usually `both`. Core survival and building identity of the pack. |
| Shooter / Pistolero | TacZ | Usually `both`. Test weapon balance and server performance carefully. |
| Guerrero / combat | Better Combat, Epic Fight, Punchy! | Usually `both`. Important: do not mix Better Combat and Epic Fight without very careful testing. |
| Magic | Iron's Spells 'n Spellbooks | Usually `both`. Core mage class candidate. |
| Bosses / enemies | Cataclysm, Alex's Mobs | Usually `both`. Test difficulty, loot, and world impact. |
| Food / farming | Farmer's Delight, Chef's Delight | Usually `both`. Good survival support candidates for Forge 1.20.1. |
| World / structures | YUNG's Better Dungeons, YUNG's Better Mineshafts | Usually `both`. Add gradually because structure mods can affect world generation heavily. |
| Dinosaurs / dragons | Unusual Prehistory, Ice and Fire Community Edition | Usually `both`. Test mob spawning, worldgen, and server load. |
| Dark RPG / death / progression flavor | Cult of Azazel, Stellara, You Died | Usually `both`. Test difficulty, world impact, and compatibility before accepting. |
| Quests / classes / progression | FTB Quests, KubeJS | Usually `both`. Use for class progression and onboarding. Superior RPG and Mushoku Tensei are inspiration only, not full imports. |
| Resource packs / shaders | Resource packs, shader packs | Usually `client`. Keep optional unless required for UI or identity. |

## Pack 16.0 - Class Selection Logic

### Mods added

- KubeJS - `both`, backend scripting for first class selection logic.
- Rhino - `both`, installed as a KubeJS dependency.
- Architectury API - `both`, already present and confirmed as a KubeJS dependency.

### Backend added

- Initial class selection backend with persistent player state, class tags, starter kits, and an operator reset command.
- Classes covered in the first logic pass: Guerrero, Mago, and Pistolero.
- The current selector is chat-command based: `/nexus_select warrior`, `/nexus_select mage`, or `/nexus_select gunslinger`.

### Intentionally excluded from Pack 16.0

- No FancyMenu yet. The full-screen class menu belongs in Pack 16.1 after this backend is validated.
- No Konkrete yet, because FancyMenu is not installed in this pack.
- No GameStages.
- No OpenLoader or Paxi.
- No new Epic Fight work in `dev`; combat-class integration stays experimental until compatibility is fixed.

## Pack 16.1 - Class Selection FancyMenu UI

### Mods added

- FancyMenu - `client`, visual frontend for the class selector.
- Konkrete - `client`, FancyMenu dependency.
- Melody - `client`, FancyMenu dependency.

### UI foundation added

- Placeholder class images for Guerrero, Mago, and Pistolero under `config/fancymenu/assets/nexus/class_selection/`.
- KubeJS bridge that keeps the chat fallback and attempts to open the planned Custom GUI `nexus_class_selection`.
- The visual GUI is expected to call `/nexus_select <class>` and must not give items directly.
- Pre-existing Epic Fight experiment entries were removed from this branch so the class selection UI remains isolated from combat experiments.

### Intentionally excluded from Pack 16.1

- No GameStages.
- No OpenLoader or Paxi.
- No Epic Fight integration or replacement mods.

## Pack 16.2 - Class Quest Progression Foundation

### Existing mods used

- FTB Quests - already present, used as the future class progression layer.
- FTB Teams - already present, review team/shared quest progress carefully before enabling class-critical rewards.
- FTB Library - already present, required by the FTB stack.
- Quests Additions - already present, available for quest tooling if needed.

### Foundation added

- Documented Warrior, Mage, and Gunslinger quest paths.
- Prepared the progression model around existing KubeJS class tags.
- No active FTB Quests SNBT files were created because this repo does not yet contain a verified quest file format to copy.

### Intentionally excluded from Pack 16.2

- No new mods installed.
- No GameStages.
- No OpenLoader or Paxi.
- No Epic Fight.

## Pack 16.3 - Mage Class Expansion

### Mods tested and reverted

- T.O Magic 'n Extras - Iron's Spells Addon - tested with file `traveloptics-6.3.0-1.20.1.jar`, then reverted.
- Alex's Caves - removed because it was added only for T.O Magic 'n Extras.
- Apothic Attributes - removed because it was added only for T.O Magic 'n Extras.
- Placebo - removed because it was added only for Apothic Attributes.
- L_Ender's Cataclysm - kept because it was already part of the pack before this experiment.

### Mage direction

- Iron's Spells remains the main magic system.
- T.O Magic 'n Extras is rejected temporarily because the dependency chain added caves/bosses content and still failed Prism validation.
- Mage expansion is postponed until a cleaner addon or safer version is validated.
- Mage starter kit now uses a verified Iron's Spells copper spell book with `irons_spellbooks:acupuncture` in Pack 16.4.

### Intentionally excluded from Pack 16.3

- No Ars Nouveau.
- No Occultism.
- No Forbidden & Arcanus.
- No Botania.
- No Malum.
- No Hexerei.
- No Mobbility.
- No Monsters & Spellbooks.
- No KubeJS Iron's Spells addon.
- No GameStages.
- No OpenLoader or Paxi.
- No Epic Fight.

## Pack 16.4 - Real Class Starter Kits

### Backend updated

- KubeJS starter kits now support item objects with optional NBT.
- Warrior kit uses Simply Swords.
- Mage kit uses Iron's Spells with a real spell book NBT payload.
- Gunslinger kit uses TaCZ gun and ammo NBT.
- Class state is still saved before item delivery to avoid duplication.

### No new mods

- Uses already-installed Simply Swords, Iron's Spells, and TaCZ.
- No GameStages.
- No OpenLoader or Paxi.
- No Epic Fight.

## Pack 16.5 - Warrior Epic Fight Integration

### Mods added

- Epic Fight - `both`, Warrior combat foundation.
- EpicFight-Nightfall - `both`, Warrior combat expansion.
- Epic Fight: Skill Tree - `both`, Warrior progression layer.
- Epic Fight - Invincible Lib - `both`, dependency for Nightfall.
- Epic Fight - Avalon - `both`, dependency for Nightfall.
- AAA Particles - `both`, Nightfall particle dependency.

### Mods removed

- Better Combat was removed because Epic Fight is now the primary Warrior combat system.
- Combat Roll was removed because Epic Fight handles the Warrior combat movement layer.

### Mods preserved

- Simply Swords remains installed for Warrior weapons.
- Punchy remains installed and needs manual blacklist review.
- TaCZ and Shoulder Surfing remain installed for Pistolero.
- Iron's Spells remains installed for Mago.
- T.O Magic remains rejected/postponed from Pack 16.3 and is not reinstalled here.

### Backend updated

- `kubejs/server_scripts/nexus_class_restrictions.js` adds conservative item-use restrictions by class tag.
- Warrior namespaces: `simplyswords`, `epicfight`, `epicfight_nightfall`, `efn`, `nightfall`.
- Mage namespaces: `irons_spellbooks`, `traveloptics`.
- Gunslinger namespace: `tacz`.
- No GameStages.
- No OpenLoader or Paxi.

## Pack 16.5.3 - Gunslinger gun and class restrictions

### Backend updated

- Gunslinger starter gun now uses the exact TaCZ Glock 17 NBT path.
- `tacz:modern_kinetic_gun` without `GunId:"tacz:glock_17"` is treated as a generic/broken starter item and should not be used.
- Warrior restrictions now include `simplyswords`, `epicfight`, `epicfight_nightfall`, `efn`, `nightfall`, `epicskills`, `epic_fight_avalon`, and `invincible`.
- Mage restrictions include `irons_spellbooks` and future-proof `traveloptics`.
- Gunslinger restrictions include `tacz`.
- `ItemEvents.rightClicked` blocks direct use when available.
- `PlayerEvents.tick` adds a lightweight main hand/offhand warning guard.
- `/nexus_class_debug` was added for class restriction diagnostics.

### Limitation

- Epic Fight Battle Mode could not be force-disabled from KubeJS `server_scripts` with a verified API in this pack.
- Separation is enforced through items, kits, tags, quests, and progression.

## Pack 16.5.4 - Restriction UX and Epic Fight unarmed review

### Backend updated

- Restriction warnings now use vanilla actionbar commands when possible.
- Warning sound uses a short `minecraft:block.note_block.bass` playsound.
- Chat is only a fallback with cooldown.
- Classless players get a long-cooldown prompt instead of repeated restriction spam.
- Reset flow now uses cleaner messaging and attempts to reopen FancyMenu.

### Investigation notes

- TaCZ starter gun now uses `GunId:"tacz:glock_17"`.
- If the TaCZ icon remains purple/black while `/kubejs hand` shows the correct GunId, treat it as a TaCZ inventory icon/render issue until the creative item proves extra NBT is required.
- No versioned Epic Fight config/API was found in the repo to disable unarmed/empty-hand Battle Mode safely.
- No clear Punchy config file was found; Punchy blacklist remains manual through its UI.

## Pack 16.5.5 - Block non-Warrior unarmed combat

### Backend updated

- `EntityEvents.hurt` cancels direct melee damage from Mage, Gunslinger, and classless players when their main hand is empty.
- Warrior remains allowed to use unarmed/Epic Fight melee.
- Damage with a held item that belongs to another class is also cancelled.
- The visual Epic Fight Battle Mode may still activate client-side; the server-side mitigation blocks damage.
- Non-Warriors were initially forced back to Epic Fight Mining Mode every 20 ticks with `/epicfight mode mining <player>`.
- Pack 16.5.6 replaces that command loop with Epic Tweaks and leaves the KubeJS command path disabled by default.
- Gunslinger starter gun remains Glock 17 with `GunId:"tacz:glock_17"`.

### Keybind plan

- `R` is reserved for TaCZ Reload.
- `Z` is Iron's Spells Spell Wheel Hold.
- `G` is Epic Fight Battle/Mining Toggle.
- `K` is Epic Fight Skill Tree GUI.
- Default Options and Balm are already installed, but no generated keybind files are committed until tested in Prism.

## Pack 16.5.6 - Epic Tweaks mode enforcement

### Mod added

- Epic Tweaks - `both`, Forge 1.20.1, installed with packwiz.

### Mode control

- Epic Tweaks becomes the primary controller for Epic Fight Battle/Mining Mode.
- `canSwitchPlayerMode=false` is not used as the final solution because it also blocks Warrior.
- `canSwitchPlayerMode` should stay true; use `/gamerule canSwitchPlayerMode true` in Prism test worlds if it was changed.
- Desired generated Epic Tweaks config:
  - `autoswitch_mode = true`
  - `enforce_mode = true`
  - `filter_animation_first_person = true`
- KubeJS command enforcement with `/epicfight mode mining <player>` is disabled by default.
- KubeJS still handles class item restrictions, actionbar warnings, and unarmed melee damage mitigation.
- Gunslinger starter remains Glock 17 with `GunId:"tacz:glock_17"`.

### Keybind plan

- `R` is TaCZ Reload.
- Iron's Spells Spell Wheel Hold moves to `Z` or `V`.
- Epic Fight Battle/Mining Toggle is Not Bound.
- Epic Fight Skill Tree GUI uses `K`.
- JEI Show Recipe uses `U`; Show Uses uses `Y`.

## Pack 16.6 - Default Options and Keybind Foundation

### Mods present

- Default Options - `client`, Forge 1.20.1, managed by packwiz.
- Balm - `both`, Forge 1.20.1, managed by packwiz.

### Scope

- No `options.txt` root file is generated or versioned.
- No manual `keybindings.txt` is invented.
- Generated Default Options files are postponed to Pack 16.6.1 after Prism validation.
- Epic Tweaks remains installed.
- Gunslinger starter remains Glock 17 with `GunId:"tacz:glock_17"`.
- Pack 16.10 resolves Battle Mode per-class enforcement with Epic Tweaks, Epic Fight item preferences, Air as Preferred Tool, and Epic Fight Toggle set to Not Bound.

### Keybind target

- TaCZ Reload: `R`.
- Iron's Spells Spell Wheel Hold: `Z`.
- Epic Fight Toggle Battle/Mining Mode: Not Bound.
- Epic Fight Skill Tree GUI: `K`.
- JEI Show Recipe: `U`.
- JEI Show Uses: `Y`.

## Pack 16.7 - Class System QA and Polish

### Backend

- Adds `/nexus_class_status [player]` for class state checks.
- Adds `/nexus_testkit <class> [player]` as a QA kit command that does not change class.
- Adds `/nexus_resetclass_clean <player>` for controlled clean test runs.
- Improves `/nexus_class_debug` with persistentData, NBT summary, TaCZ GunId, and the Epic Tweaks mode-control note.
- Keeps Gunslinger starter on Glock 17 with `GunId:"tacz:glock_17"`.
- Pack 16.10 later solves Epic Fight Battle Mode per-class enforcement through Epic Tweaks and item preferences.

### QA

- Adds `docs/class-testing-checklist.md`.
- Keeps Default Options/keybind export as a separate Prism-generated step.

## Pack 16.8 - Class Progression Foundation

### FTB Quests status

- FTB Quests is present in the pack and will be the class progression frontend.
- FTB Library and FTB Teams are present.
- Quests Additions is present.

### Scope

- KubeJS remains the source of truth for class state, kits, tags, and reset/debug commands.
- No final FTB Quests files are created in this pack.
- No Battle Mode solution is attempted in this pack.
- Gunslinger starter remains Glock 17 with `GunId:"tacz:glock_17"`.

### Docs added

- `docs/class-progression-plan.md`
- `docs/ftb-quests-class-design.md`
- `docs/class-balance-notes.md`
- `docs/class-progression-testing.md`

## Pack 16.10 - Epic Fight Air Tool and Mode Enforcement

### Final class mode architecture

- KubeJS blocks items by class.
- Epic Tweaks controls Epic Fight Battle/Mining Mode using item preferences.
- `canSwitchPlayerMode` stays `true`; `false` is rejected because it also blocks Warrior.
- Air / `minecraft:air` must be set to Preferred Tool in Epic Fight Item Preferences.
- Epic Fight Toggle Battle/Mining Mode must be Not Bound through generated Default Options keybinds.
- Mage and Gunslinger stay in Mining/Vanilla Mode with empty hand, Iron's Spells spellbooks, or TaCZ guns.
- Warrior enters Battle Mode automatically with compatible Warrior weapons.
- Punchy remains installed for normal empty-hand and vanilla interactions.
- No invented Epic Fight, Epic Tweaks, Default Options, root `options.txt`, or `air.json` files are added.
- Gunslinger starter remains Glock 17 with `GunId:"tacz:glock_17"`.

## Pack 16.5.1 - Remove Better Combat compatibility leftover

### Mods and resourcepacks removed

- FA: Player Extension Compat was removed because it installs `fape_compat-0.5.jar`.
- FA: Player Extension X Better Combat was removed because it is only useful with Better Combat.

### Crash fixed

- Prism crashed during startup at `fape_compat.mixins.json:BCAttackAdjustmentMixin`.
- The crash happened because `fape_compat` tried to mix into Better Combat classes after Better Combat was removed.
- Better Combat and Combat Roll remain removed.
- Epic Fight remains the Warrior combat foundation.
- Fresh Animations and Fresh Animations: Player Extension remain available as visual resource packs.

## Block 2 - QoL/UI

- Just Enough Items (JEI) - `client`
- Jade - `both`
- AppleSkin - `both`
- Mouse Tweaks - `client`
- BetterF3 - `client`
- Cloth Config API - `client`
- Controlling - `client`
- Searchables - `client`

## Block 3 - World structures, exploration and multiplayer utilities

- YUNG's Better Strongholds - `both`
- YUNG's Better Nether Fortresses - `both`
- YUNG's Better Ocean Monuments - `both`
- YUNG's Better Desert Temples - `both`
- YUNG's Better Jungle Temples - `both`
- YUNG's Better Witch Huts - `both`
- YUNG's Better End Island - `both`
- Lootr - `both`
- Waystones - `both`
- Balm - `both`
- Nature's Compass - `both`
- Xaero's Minimap - `client`
- Xaero's World Map - `client`
- Corpse - `both`
- Traveler's Backpack - `both`

## Pack 4 - Magic

- Iron's Spells 'n Spellbooks - `both`
- Iron's Lib - `both`
- Curios API - `both`
- GeckoLib - `both`
- playerAnimator - `both`

## Pack 6 - Visual / immersion / UI

### Mods added

- Entity Texture Features - `client`
- Entity Model Features - `client`
- Punchy! - `client`
- Shoulder Surfing Reloaded - `client`
- Visuality: Reforged - `client`
- What Are They Up To (WATUT) - `both`
- CoroUtil - `both`, dependency for WATUT
- You Died - `client`
- Fancy World Animations - `client`
- Fancy Toasts - `client`
- Stellara - `client`
- Status Effect Bars Reforged - `client`
- YDM's Weapon Master - `both`
- Fresh Animations - `client` resource pack, managed by packwiz metadata

### Mods pending

- Immersive Hotbar - packwiz did not find a valid version for the current Forge 1.20.1 pack settings. Recheck later if Forge support appears.

### Mods omitted

- Epic Fight, Better Combat, Cataclysm, TaCZ, Alex's Mobs, Alex's Delight, Mystic's Biomes, Cult of Azazel, Chef's Delight, Create Better FPS, Arsenal RPG Series, Clavis, Superior RPG, and Mushoku Tensei remain intentionally excluded from Pack 6.

## Pack 6.1 - Visual polish / UI extra

### Mods added

- Perception - `client`
- Pretty Rain - `client`
- Visual Workbench - `both`
- Particular Reforged - `client`
- Inventory Particles - `client`
- Advancement Plaques - `client`
- Immersive Damage Indicators - `client`

### Resourcepacks added

- Better Lanterns - `client` resource pack, managed by packwiz metadata
- Fresh Animations remains enabled from Pack 6 - `client` resource pack, managed by packwiz metadata

### Automatic dependencies

- Architectury API - `both`, dependency for Perception
- ShatterLib / OctoLib - `both`, dependency for Perception
- Puzzles Lib - `both`, dependency for Visual Workbench
- MossyLib - `client`, dependency for Inventory Particles
- Iceberg - `both`, dependency for Advancement Plaques
- TxniLib - `both`, dependency for Immersive Damage Indicators
- Immersive Messages API - `both`, dependency for Immersive Damage Indicators

### Mods pending or omitted

- Jofi's 3D Apples / 3D Golden Apple was removed from the pack. Modrinth metadata declares Minecraft 1.20.1 support, but Minecraft shows it in red/incompatible in the resource pack UI, so it stays pending until a clearly compatible version is available.
- Immersive Hotbar remains pending because packwiz did not find a valid Forge 1.20.1 version for the current pack settings.
- TreeChop, FallingTree, Epic Fight, Better Combat, Cataclysm, TaCZ, Alex's Mobs, Mystic's Biomes, Cult of Azazel, Chef's Delight, Create Better FPS, Arsenal RPG Series, and Clavis remain intentionally excluded from Pack 6.1.

### Visual overlaps to review in Prism

- Advancement Plaques and Fancy Toasts can overlap visually. Keep both for now; if they clash, prefer Advancement Plaques for achievement presentation and remove or disable Fancy Toasts only after Carlos confirms.
- Visuality, Particular Reforged, Pretty Rain, Perception, and Inventory Particles can increase particle density. Test rain, combat, mining, inventory screens, and low-end client performance.
- Immersive Damage Indicators, Status Effect Bars Reforged, and You Died can saturate the HUD in combat. Test regular mobs, boss-like fights, death flow, and multiplayer visibility.
- Visual Workbench is installed as `both`; test it in Prism and on a server instance before promoting to `main`.

## Pack 6.3 - 3D Items / resourcepack compatibility

### Resourcepacks removed

- MB-3D Items Pack was removed from the pack. Carlos does not want it for Nexus Realms, and it may be too invasive with Punchy! and YDM's Weapon Master.

### Pending

- Search for visual alternatives inspired by DiosesMC for 3D items and 3D apples.

### Pending or omitted candidates

- Jofi's 3D Apples remains omitted because Minecraft showed it in red/incompatible in the resource pack UI.
- 3D Apples remains omitted because it is not compatible with Minecraft 1.20.1.
- Fresh Food remains pending because it requires additional mods.
- Fusion 3D Items remains pending because it requires Fusion.
- Better 3D Food remains an alternative if MB-3D Items Pack looks bad in Prism.

## Pack 6.4 - DiosesMC-inspired visual polish

DiosesMC - Official is a Fabric 1.21.8 modpack, so its list is used only as visual inspiration. Pack 6.4 uses Forge 1.20.1-compatible equivalents managed by packwiz.

### Mods added

- Chat Heads - `client`, Forge 1.20.1 equivalent for DiosesMC `chat_head`
- Chat Animation - `client`, Forge 1.20.1 equivalent for DiosesMC `chatanimation`
- CinematicZoom Original - `client`, Forge 1.20.1 equivalent for DiosesMC `cinematiczoom`; review keybinds with Shoulder Surfing Reloaded and Controlling
- Immersive UI - `client`, Forge 1.20.1 equivalent for DiosesMC `ImmersiveUI`; test with Advancement Plaques, Fancy Toasts, and HUD mods

### Resourcepacks added

- Torches Reimagined - `client` resource pack, managed by packwiz metadata; test together with Better Lanterns
- Enchant Icons - `client` resource pack, managed by packwiz metadata
- Low On Fire - `client` resource pack, managed by packwiz metadata

### DiosesMC entries already covered

- Entity Model Features, Entity Texture Features, Fresh Animations, Inventory Particles, Perception, Visuality: Reforged, Jade, Entity Culling, Cloth Config API, Architectury API, and ShatterLib / OctoLib are already present in Nexus Realms.

### Pending or discarded DiosesMC entries

- Hold My Items remains pending. Keep Punchy! for now; only compare Hold My Items in a separate dev test if Carlos asks for it.
- FirItemZoom remains discarded because the available candidate is Fabric 1.21.8 only.
- Cinematic Zoom remains discarded because the direct candidate is NeoForge 1.21+; use CinematicZoom Original instead.
- Toggle Nametags, GUI Scale Splitter, and GUIScaleSplitter remain discarded because the available candidates are Fabric/Quilt-only for this target.
- Gamma Utils remains discarded for now because no Forge 1.20.1 version was confirmed, and fullbright-style vision can affect intended lighting balance.
- Subtle Effects remains pending because it overlaps heavily with Visuality, Particular Reforged, Perception, Pretty Rain, and Inventory Particles.
- Font++ remains pending until a clear packwiz-manageable resource pack candidate is identified.
- Complementary Shaders - Unbound remains documentation-only for now; do not install shaders in Pack 6.4.
- 3D Items-Vanillaism, Actually 3D Blocks & Items, Better 3D Food, and 3D FOOD remain pending for a later 3D items / apples pass.
- Jofi's 3D Apples and 3D Apples remain discarded for the reasons recorded in Pack 6.3.
- MB-3D Items Pack remains removed and must not be reinstalled.

### Prism validation

- Test chat with multiple players to validate Chat Heads and Chat Animation.
- Test CinematicZoom Original keybinds against Shoulder Surfing Reloaded and Controlling.
- Open inventory, chests, enchanting table, anvil, and furnace screens to review Immersive UI, Enchant Icons, and Inventory Particles together.
- Test torches, lanterns, caves, and low-light areas with Torches Reimagined and Better Lanterns.
- Stand in fire or lava briefly to confirm Low On Fire improves visibility without hurting combat readability.
- Fight in first person with Punchy! and in third person with YDM's Weapon Master to confirm hands, weapons, HUD, and particles remain readable.
- Recheck rain, mining, combat, and dense particle scenes before promoting this pack to `main`.

## Pack 6.5 - DiosesMC visual alignment + JourneyMap + sound

Pack 6.5 continues the DiosesMC-inspired visual alignment on Forge 1.20.1 without adding Fabric-only mods, Sinytra Connector, manual `.jar` files, or manual `.zip` files.

### Mods removed

- Stellara was removed because its sky presentation felt too forced for Nexus Realms.
- Xaero's Minimap was removed and replaced by JourneyMap.
- Xaero's World Map was removed and replaced by JourneyMap.
- MB-3D Items Pack remains removed; no Pack 6.5 install was needed because it was not present.
- JourneyMap 6.0.0-beta.2 was rejected after a startup crash: `ClassMetadataNotFoundException: journeymap.client.render.map.GridRenderer`.

### Mods added

- JourneyMap 5.10.3 - `both`, stable Forge 1.20.1 release replacing Xaero's Minimap and Xaero's World Map.
- AmbientSounds 6 - `both`, adds ambient sound polish.
- Sound Physics Remastered - `both`, adds environmental sound behavior.
- Presence Footsteps - `both`, adds footstep sound detail.
- CreativeCore - `both`, dependency added automatically for AmbientSounds 6.

### DiosesMC entries already covered by Nexus Realms

- Sodium is covered by Embeddium.
- Iris is covered by Oculus.
- FerriteCore Fabric is covered by FerriteCore Forge.
- EMF and ETF are installed.
- Visuality, Inventory Particles, Perception, Chat Heads, ChatAnimation, Immersive UI, Jade, and JEI are already covered.

### Pending or omitted DiosesMC-inspired candidates

- JourneyMap Web Map remains pending until Carlos explicitly wants the browser map component.
- Item Zoomer remains pending as a possible FirItemZoom-style equivalent.
- Subtle Effects remains pending because it can add too many particles alongside Visuality, Particular Reforged, Perception, Pretty Rain, and Inventory Particles.
- Inventory HUD Forge remains pending because Nexus Realms already has many HUD elements.
- Gamma Utils remains pending/discarded unless a clear Forge 1.20.1 candidate is confirmed and Carlos accepts the lighting-balance impact.
- Hold My Items remains pending; keep Punchy! unless Carlos asks for a direct comparison.
- Fadeless remains pending until a clear Forge 1.20.1 candidate is confirmed.
- ImmediatelyFast was removed after Pack 6.5 testing because Minecraft crashed on startup with Oculus/Embeddium in this configuration: `Failed to initialize Iris compatibility` / `ClassNotFoundException net.coderbot.iris.vertices.ImmediateState`.

### Prism validation

- Confirm JourneyMap opens correctly, creates a minimap, and replaces the Xaero workflow cleanly.
- Confirm the installed JourneyMap version is `journeymap-1.20.1-5.10.3-forge.jar`, not the rejected `6.0.0-beta.2` build.
- Check keybind conflicts after removing Xaero and adding JourneyMap.
- Test caves, forests, villages, rain, water, mining, and combat with AmbientSounds 6, Sound Physics Remastered, and Presence Footsteps.
- Confirm CreativeCore does not introduce server/client mismatch warnings.
- Confirm no Stellara sky styling remains active.

## Pack 7 - Performance / diagnostics core

Pack 7 adds a conservative performance and diagnostics layer before larger content passes such as mobs, bosses, worldgen, Better Combat, TaCZ, quests, or economy systems.

### Mods added

- spark - `both`, profiler for client and server diagnostics.
- ServerCore - `server`, server-side optimization layer for ticking and entity behavior.
- Clumps - `both`, groups XP orbs to reduce entity pressure.
- Alternate Current - `server`, optimized redstone implementation.

### Pending or omitted candidates

- Let Me Despawn remains pending because it requires Almanac and the Forge 1.20.1 Almanac build is currently beta.
- Observable remains pending because spark covers initial profiling needs.
- Canary remains pending because it is a deep Lithium-style optimization layer and can conflict with Create, ModernFix, or Forge behavior.
- Starlight remains pending because it replaces the lighting engine and should be tested separately.
- Create Better FPS remains pending until a clear packwiz-manageable slug or URL is identified.
- AI Improvements remains omitted for now because Pack 7 prioritizes ServerCore and more targeted optimizations.
- Krypton remains omitted for now because no clear Forge 1.20.1 candidate was confirmed.

### Prism validation

- Confirm the client starts and joins a world with spark and Clumps installed.
- Test XP orb drops, XP pickup, mending, and XP-heavy fights with Clumps.
- Test Create belts, shafts, contraptions, funnels, deployers, mechanical arms, and trains with Alternate Current present.
- Test redstone clocks, doors, farms, hoppers, observers, pistons, and comparator contraptions.
- Confirm JourneyMap, Embeddium, Oculus, AmbientSounds, Sound Physics Remastered, and Presence Footsteps still behave normally.

### Server validation

- Start a local or dedicated Forge 47.4.10 server with the pack.
- Run basic spark profiling commands and confirm profiler output is generated.
- Check TPS under exploration, combat, XP drops, Create machinery, redstone, and mob farms.
- Review ServerCore behavior around mob activation, despawn, and spawn-heavy areas before adding larger content packs.

## Pack 8 - Create production integration

Pack 8 adds a small Create production block focused on automation and technical progression. Create addons are tested in small batches because Create 6.x compatibility can be sensitive.

### Mods added

- Create Crafts & Additions - `both`, bridges electrical energy and Create kinetic power with motors, alternators, and technical progression options.
- Create Slice & Dice - `both`, integrates Create with Farmer's Delight for automated cooking and food production.
- Kotlin for Forge - `both`, dependency added because Create Slice & Dice requires `kotlinforforge` 4.3.0 or above.

### Pending Create addons

- Create Steam 'n' Rails remains pending for a dedicated train/rail pass.
- Create Deco remains pending for a decorative Create pass.
- Create Design n' Decor remains pending for a decorative Create pass.
- Create Power Loader remains pending until chunk loading policy is defined for the server.
- Create Enchantment Industry for Create 6 remains pending for a later magic/progression pass involving XP and enchanting.
- Create Connected remains pending until core Create production is stable.
- Create Copycats+ remains pending until core Create production is stable.
- Create Utilities remains pending until its scope is reviewed separately.
- Create Diesel Generators remains pending for a later power/industry pass.
- Create Big Cannons remains pending because it changes combat and siege balance.
- Create New Age remains pending for a later power/industry pass.
- Advanced storage remains pending so storage balance does not bypass Create progression too early.

### Prism validation

- Confirm the client starts and joins a world with Create, Create Crafts & Additions, Create Slice & Dice, and Kotlin for Forge installed.
- Test motors, alternators, connectors, accumulators, and Create kinetic/electric conversion loops.
- Test Farmer's Delight integration with Create Slice & Dice, including cutting, cooking, and automated food workflows.
- Test JEI recipes for Create Crafts & Additions and Create Slice & Dice.
- Test Create contraptions, belts, funnels, deployers, mechanical arms, and redstone with Alternate Current still enabled.

## Pack 9 - Prehistoric Wildlife & Oceans

Pack 9 adds the first prehistoric wildlife and hostile ocean block without adding heavy dimensions, large worldgen passes, quest systems, economy, extra bosses, or broad combat overhauls.

### Mods added

- Unusual Prehistory 2 - `both`, fossils, prehistoric creatures, plants, and progression for reviving dinosaurs.
- Ben's Sharks - `both`, sharks, ocean creatures, and Megalodon.
- Alex's Mobs - `both`, dangerous fauna and a livelier survival world.
- Patchouli - `both`, guide/book support and documentation dependency.
- Citadel - `both`, required dependency for Alex's Mobs.

### Pending prehistoric and related candidates

- Prehistoric Fauna remains pending because it adds dimensions/worldgen and should be evaluated only after Pack 9 is stable.
- Jurassic Saga remains pending as a separate DNA/Jurassic Park-style system.
- Alex's Caves remains pending for a future caves/worldgen block, not this pack.
- Alex's Delight remains pending for a later food/cooking block.
- Prehistoric Nature remains pending.
- Ancient Nature remains pending.
- Primitive Invasion remains pending.

### Discarded for now

- Jurassic Reborn remains discarded for now.

### Notes

- Do not add several large prehistoric mods at once; this avoids duplicated fossils, mobs, spawns, worldgen, and performance problems.
- Prehistoric Fauna is a possible Pack 9.1 candidate if Pack 9 is stable in Prism and server testing.
- Alex's Caves belongs in a future caves/worldgen pack instead of this wildlife and ocean block.

### Prism validation

- Confirm the client starts and joins a world with Unusual Prehistory 2, Ben's Sharks, Alex's Mobs, Patchouli, Citadel, and existing GeckoLib installed.
- Test dinosaur/fossil progression from Unusual Prehistory 2 and confirm Patchouli content opens without missing dependency errors.
- Test ocean exploration and Megalodon/shark spawns from Ben's Sharks.
- Test Alex's Mobs spawns, AI behavior, drops, and server tick impact in forests, caves, oceans, deserts, and villages.
- Watch entity density and main-thread performance before adding Prehistoric Fauna, Alex's Caves, or additional mob packs.

## Pack 10 - Worldgen / Settlements / Exploration

Pack 10 adds a conservative world, settlement, biome, and exploration block before deciding the final world generation stack.

### Mods added

- ChoiceTheorem's Overhauled Village - `server`, improved villages and pillager outposts.
- Mystic's Biomes - `both`, new Overworld biomes.
- TerraBlender - `both`, biome library required for biome generation.
- Explorer's Compass - `both`, structure location utility that complements Nature's Compass.

### Pending worldgen and structure candidates

- Terralith remains pending because it is a large worldgen overhaul.
- Regions Unexplored remains pending because it is a large biome/worldgen expansion.
- Biomes O' Plenty remains pending because it is a large biome/worldgen expansion.
- Repurposed Structures remains pending.
- Towns and Towers remains pending.
- Dungeons and Taverns remains pending.
- When Dungeons Arise remains pending.
- Prehistoric Fauna remains pending so prehistoric worldgen is not mixed into this block.
- Alex's Caves remains pending for a later caves/worldgen pass.
- Jurassic Saga remains pending as a separate prehistoric progression system.
- CTOV compat packs remain pending until the final worldgen stack is known.

### Notes

- Do not add large worldgen overhauls in this pack; this avoids too many terrain, biome, and structure changes at once.
- Test this pack in a new world before promoting it to `main`.
- Do not create the definitive world yet.

### Prism validation

- Create a new test world and confirm CTOV villages and pillager outposts generate correctly.
- Explore multiple Overworld regions and confirm Mystic's Biomes and TerraBlender load without generation errors.
- Use Explorer's Compass to locate vanilla and modded structures, then compare with JourneyMap and Nature's Compass workflows.
- Watch world creation time, chunk generation time, server TPS, and entity density before adding Terralith, Regions Unexplored, Prehistoric Fauna, or Alex's Caves.

## Pack 11 - Combat foundation / Nightfall style

Pack 11 adds the combat foundation for a darker RPG/soulslike feel without adding bosses, firearms, quests, economy, or an extreme animation overhaul.

### Mods added

- Better Combat - `both`, RPG/soulslike combat foundation with animations, combos, and hitboxes.
- Simply Swords - `both`, medieval and fantasy weapon variety for the Warrior role.
- Combat Roll - `both`, dodge/roll defensive mobility for soulslike combat.

### Pending combat and boss candidates

- Boss Checklist remains pending for a later boss tracking pass.
- Boss Checklist Addon remains pending for a later boss tracking pass.
- Cataclysm remains pending for a dedicated bosses pack.
- Bosses Rise remains pending for a dedicated bosses pack.
- Raids Enhanced remains pending.
- Cult of Azazel remains pending.
- TaCZ remains pending for a later firearms/survival tension pack.
- Better Combat compat/configs remain pending after Prism validation.
- KubeJS balance remains pending for later progression and combat tuning.
- Default Options final keybinds remain pending until combat, JourneyMap, spells, and future firearms controls are reviewed together.

### Discarded for now

- Epic Fight remains discarded for now because it can conflict more heavily with armor, Iron's Spells, TaCZ, and render/animation mods.
- Better Combat Particle remains discarded because it is not a clear Forge 1.20.1 candidate for this pack.
- Mobbility remains discarded for now.
- ParCool remains discarded for now.

### Notes

- This pack only adds the combat foundation.
- Bosses and boss tracking will be added in a later pack.
- TaCZ will be added later, and its controls should be resolved through Default Options.
- Review keybind conflicts between Combat Roll, JourneyMap, CinematicZoom Original, Shoulder Surfing Reloaded, Iron's Spells, and future TaCZ controls.

### Prism validation

- Confirm the client starts and joins a world with Better Combat, Simply Swords, Combat Roll, and playerAnimator installed.
- Test first-person and third-person melee attacks with vanilla weapons, Simply Swords weapons, shields, and Iron's Spells equipment.
- Test Combat Roll keybinds against JourneyMap, CinematicZoom Original, Shoulder Surfing Reloaded, Controlling, and spell controls.
- Test multiplayer hit registration, stamina/mobility feel, weapon animations, and server TPS before adding bosses or firearms.

## Pack 12 - Bosses / Rise / Endgame progression

Pack 12 adds the first real boss/endgame block and a visual boss progression list without adding firearms, quests, economy, extra worldgen packs, or general mob packs.

### Mods added

- L_Ender's Cataclysm - `both`, bosses, dungeons, structures, and endgame rewards.
- Bosses'Rise - `both`, soulslike bosses in its own dungeons.
- Boss Checklist - `both`, boss list/progression UI for players.
- Boss Checklist Addon - `both`, expanded boss entries for the checklist.
- Lionfish API - `both`, dependency added automatically for L_Ender's Cataclysm.

### Pending boss, raid, and progression candidates

- Cult of Azazel remains pending because it may affect Nether/worldgen.
- Daily Boss remains pending.
- Daily Boss X Bosses Rise remains pending.
- TaCZ remains pending for a later Biohazard/Pistolero pack.
- KubeJS balance remains pending for progression and reward tuning.
- FTB Quests remains pending for structured progression.
- Custom rewards remain pending until KubeJS/quests are added.

### Discarded for now

- Epic Fight remains discarded for now.
- Better Combat Particle remains discarded for now.
- Boss mods not verified for Forge 1.20.1 remain discarded for now.

### Notes

- This pack adds base bosses and boss tracking, but reward balance will be handled later with KubeJS and quests.
- Do not create the definitive world yet.
- Test this pack in a new world before promoting it to `main`.

### Prism validation

- Confirm the client starts and joins a new world with Cataclysm, Bosses'Rise, Boss Checklist, Boss Checklist Addon, and Lionfish API installed.
- Check the Boss Checklist UI and confirm entries appear for installed bosses.
- Locate or spawn-test early boss structures in a disposable world and verify no worldgen/load errors appear.
- Test boss combat with Better Combat, Simply Swords, Combat Roll, Iron's Spells, Alex's Mobs, and existing HUD mods.
- Watch TPS, entity counts, loot balance, and difficulty spikes before adding raids, quests, firearms, or additional boss packs.

## Pack 12.1 - Bosses expansion / Raids / Ocean threats

Pack 12.1 expands the boss and special-threat layer with more bosses, mini-bosses, dangerous raids, and hostile ocean exploration without adding TaCZ, quests, economy, KubeJS balance, or extra resource packs.

### Mods added

- Mowzie's Mobs - `both`, enemies and bosses with advanced AI, quality animations, and magical rewards.
- Bosses of Mass Destruction Forge - `both`, additional bosses tied to structures and endgame exploration.
- Raids:Enhanced - `both`, mini-bosses and extra threats during raids.
- Aquamirae [Forge Edition] - `both`, hostile ocean content, Ship Graveyard, enemies, and dark exploration atmosphere.
- CERBON's API - `both`, dependency added automatically for Bosses of Mass Destruction Forge.
- FDLib - `both`, dependency added automatically for Raids:Enhanced.
- Obscure API [Forge Edition] - `both`, dependency added automatically for Aquamirae.
- FA: Player Extension Compat - removed in Pack 16.5.1 because it installed `fape_compat-0.5.jar` and crashed after Better Combat was removed.

### Resourcepacks added

- Fresh Animations: Player Extension - `both`, resource pack for player animations in the Fresh Animations style.
- FA: Player Extension X Better Combat - removed in Pack 16.5.1 because Better Combat is no longer installed.

### Pending boss, raid, and progression candidates

- Daily Boss remains pending.
- Daily Boss x Bosses'Rise remains pending.
- Daily Boss - More Bosses remains pending.
- Cult of Azazel remains pending.
- Alex's Caves remains pending for a later caves/worldgen pass.
- Mowzie's compat packs remain pending unless a specific compatibility need appears.
- Aquamirae Delight remains pending for a later food/cooking pass if needed.
- KubeJS balance remains pending.
- FTB Quests remains pending.
- Custom rewards remain pending.
- Spawn and difficulty configuration remains pending.
- Boss Checklist configuration remains pending if any new boss is not detected automatically.

### Discarded for now

- Ice and Fire remains discarded for now because it is large and can overlap with dragons, bosses, and worldgen.
- The Graveyard remains discarded for now.
- Born in Chaos remains discarded for now.
- Mutant Monsters remains discarded for now.
- Fresh Moves remains discarded for now.
- Trailer Player Animations remains discarded for now.
- Detailed Animations remains discarded for now.

### Notes

- This pack expands bosses and special threats, but fine balance will be handled later with KubeJS and quests.
- Do not create the definitive world yet.
- Test this pack in a new world before promoting it to `main`.
- Review performance because Mowzie's Mobs, Aquamirae, Cataclysm, and Bosses'Rise together can increase entity, AI, and structure-generation load.
- Check whether Boss Checklist detects the new bosses automatically; if not, leave checklist configuration for a later pass.
- Fresh Animations: Player Extension requires EMF and ETF.
- Test Fresh Animations: Player Extension visually with Better Combat, Combat Roll, Shoulder Surfing Reloaded, YDM's Weapon Master, and Punchy.
- Recommended resource pack order: FA: Player Extension X Better Combat, Fresh Animations: Player Extension, Fresh Animations, other visual resource packs, Default.
- Test FA: Player Extension X Better Combat and FA: Player Extension Compat in third person with a vanilla sword, Simply Swords weapons, Better Combat, Combat Roll, Shoulder Surfing Reloaded, YDM's Weapon Master, and Punchy.
- If attacking still looks frozen or wrong, remove Fresh Animations: Player Extension and FA: Player Extension X Better Combat before testing Fresh Moves.

### Prism validation

- Confirm the client starts and joins a new world with Mowzie's Mobs, Bosses of Mass Destruction Forge, Raids:Enhanced, Aquamirae, and their dependencies installed.
- Test Mowzie's Mobs encounters, Bosses of Mass Destruction structures, Aquamirae ocean/Ship Graveyard content, and Raids:Enhanced invasion events in a disposable world.
- Check Boss Checklist and Boss Checklist Addon entries for the new bosses.
- Test player animations with Fresh Animations: Player Extension in first person and third person.
- Test Better Combat attacks with FA: Player Extension X Better Combat above Fresh Animations: Player Extension in the resource pack order.
- Test the FA: Player Extension Compat client mod with Better Combat / playerAnimator attacks.
- Watch TPS, chunk generation, entity counts, raid difficulty, loot balance, and ocean exploration difficulty before adding Daily Boss, Cult of Azazel, TaCZ, quests, or KubeJS balance.

## Pack 13 - Fishing Guild Foundation

Pack 13 adds the technical foundation for a future Fishing Guild progression layer without adding final quest content, economy, KubeJS scripting, or extra large worldgen beyond The Fisherman House.

### Mods added

- Starcatcher - `both`, main fishing expansion with rare fish and fishing catalog/progression support.
- The Fisherman House - `both`, fisherman structures in oceans/beaches to give the future fishing guild a physical world anchor.
- FTB Quests - `both`, base quest system for future fishing commissions and general pack progression.
- FTB Library - `both`, Forge 1.20.1 dependency for FTB Quests.
- FTB Teams - `both`, Forge 1.20.1 dependency for FTB Quests team-based progression.
- Quests Additions - `both`, Forge 1.20.1 addon for expanded tasks/rewards and repeatable quests.

### Notes

- This pack installs the technical foundation, but it does not create the final quests yet.
- Fishing quests will be created in a later content/config pack.
- FTB XMod Compat is not installed yet.
- Item Filters is not installed unless it becomes necessary later.
- Watch that FTB Library, FTB Teams, and FTB Quests remain Forge 1.20.1 files even though CurseForge displays their project titles as NeoForge.
- Future ideas: deliver common fish, deliver rare fish, night fishing, rain fishing, visit The Fisherman House, cook fish with Farmer's Delight, and reward food, experience, or future currency.
- Watch The Fisherman House generation in a new world.
- Watch Starcatcher compatibility with Farmer's Delight.

### Prism validation

- Confirm the client starts and joins a new world with Starcatcher, The Fisherman House, FTB Quests, FTB Library, FTB Teams, and Quests Additions installed.
- Check Starcatcher fishing, catalog/progression UI, rare fish behavior, and loot integration.
- Locate or spawn-test The Fisherman House structures in a disposable world.
- Open the FTB Quests UI and confirm Quests Additions loads without requiring KubeJS, Item Filters, or FTB XMod Compat.
- Test with Farmer's Delight installed before creating final fishing quests.

## Pack 13.1 - Bossbar UI Cleanup

### Changes

- Removed Immersive Damage Indicators because it caused duplicated/inaccurate boss health bars when testing Frostmaw.
- Boss mods remain installed.
- Boss Checklist remains installed.
- This is a visual cleanup pack before Firearms/TaCZ.

### Notes

- Test required in Prism: spawn or locate Frostmaw and verify only one boss health bar appears.
- Check that the remaining boss bar decreases correctly when damaging the boss.
- Also test Cataclysm/Bosses'Rise boss bars if possible.
- If duplicate bossbars still appear, next investigation should focus on Boss Checklist/configs or bossbar resource packs, not on adding new mods.

## Pack 14 - Firearms Foundation / TaCZ Base

### Mods added

- [TaCZ] Timeless and Classics Zero Guns - `both`, base for the future Pistolero/Biohazard role with firearms, ammunition, attachments, and modern combat.

### Notes

- This pack only installs the technical firearms foundation.
- No armed NPCs are added yet.
- No extra gunpacks are added yet.
- No Create integration is added yet.
- Ammo, recipes, loot, and progression balance will be handled later with KubeJS/quests/config.
- Test visual compatibility with Better Combat, Combat Roll, Shoulder Surfing Reloaded, YDM's Weapon Master, Punchy, and player animation mods.
- Watch sound, recoil, zoom, keybinds, and FPS.
- Watch compatibility with Sound Physics Remastered and AmbientSounds.

### Prism validation

- Confirm the client starts and joins a world with TaCZ installed.
- Check basic gun handling, reloads, attachments, ammo behavior, recoil, zoom, sounds, and keybind conflicts.
- Test first-person and third-person visuals with Better Combat, Combat Roll, Shoulder Surfing Reloaded, YDM's Weapon Master, Punchy, Fresh Animations, and playerAnimator.
- Check sound behavior with Sound Physics Remastered, AmbientSounds, Presence Footsteps, and other audio mods.
- Do not add extra gunpacks, NPC gun mods, Create integrations, quests, loot tables, or KubeJS balance until this base passes Prism testing.

## Pack 14.1 - TaCZ + Punchy Compatibility / Biohazard Camera Cleanup

### Changes

- Kept Punchy installed.
- Punchy is already on a Forge 1.20.1 version with regex blacklist support.
- Added Shoulder Surfing Reloaded: Camera Fixes & Additions to improve TaCZ crosshair/camera behavior with Shoulder Surfing.
- Planned Punchy item exclusion for TaCZ using regex `^tacz:.*$` if the real config schema is available.
- Documented Biohazard-style Shoulder Surfing camera tuning.
- Documented keybind cleanup.

### Notes

- Punchy must stay installed.
- TaCZ must stay installed.
- The double AK render should be fixed by excluding `tacz:*` items from Punchy, not by removing Punchy.
- Codex could not verify a Punchy config schema in the repo, so config must be done manually in Prism first and then exported/copied later.
- Final Default Options export is still postponed until the pack is closed because no `config/defaultoptions` keybinding structure exists in the repo yet.
- Shoulder Surfing camera tuning should be done manually in Prism because no real Shoulder Surfing config file exists in the repo yet.

### Prism validation

- Add `^tacz:.*$` to the Punchy item blacklist/exclusion if the Punchy menu exposes it.
- Confirm TaCZ no longer double-renders AKs or other guns in first person while Punchy remains enabled.
- Tune Shoulder Surfing to right shoulder, medium-close distance, visible character, visible weapon, and usable crosshair.
- Confirm SSR Camera Fixes aligns TaCZ shots with the crosshair in shoulder camera.
- Clean keybinds so `R` is only TaCZ Reload, Combat Roll is `Left Alt`, and Oculus Reload Shaders is `F8` or `F10`.
- After final controls are accepted, export keys later with `/defaultoptions saveKeys`.

## Pack 14.2 - TaCZ Punchy Stabilization

### Changes

- Punchy is kept installed.
- TaCZ is kept installed.
- SSR Camera Fixes/Additions is removed because it caused broken Shoulder Surfing camera/mouse/WASD behavior.
- TaCZ weapons must be excluded from Punchy through Punchy's Item Blacklist, preferably with regex `^tacz:.*$`.
- Keybind plan updated: R only for TaCZ Reload, Combat Roll on Left Alt, Oculus Reload Shaders on F10/Unbound, Punchy menu on F8.

### Notes

- Shoulder Surfing Reloaded base remains installed.
- Do not add gunpacks, weapon NPCs, Create TaCZ integration, KubeJS, CraftTweaker, custom mixins, or replacement camera mods in this stabilization pack.
- No root `options.txt` is committed.
- Default Options keybind export remains postponed until controls are tested in Prism.

### Prism validation

- Open Punchy with F8 and add `^tacz:.*$` to Item Blacklist if regex is supported; otherwise add TaCZ weapons/items manually.
- Confirm normal tools still use Punchy but TaCZ guns no longer double-render.
- Confirm Shoulder Surfing base no longer has the broken Camera Fixes WASD/mouse behavior.
- Set R only to TaCZ Reload, Combat Roll to Left Alt, Oculus Reload Shaders to F10 or Unbound, and JourneyMap fullscreen to J.
- Export final tested controls later with `/defaultoptions saveKeys`.

## Pack 14.3 - Biohazard Gunplay Alignment

### Mods added

- Third Person Shooting: Zero - `client`, integrates TaCZ with Shoulder Surfing 5 for third-person shooting/camera behavior in a Biohazard-style setup.
- TaCZ Tweaks - `both`, QoL improvements and adjustments for TaCZ 1.1.8.
- TaCZ Ammo Query - `client`, JEI improvement showing which weapons use each ammunition type.
- YetAnotherConfigLib - `client`, automatic dependency for TaCZ Tweaks.

### Notes

- Punchy remains installed.
- TaCZ remains installed.
- Shoulder Surfing Reloaded base remains installed.
- SSR Camera Fixes/Additions remains excluded because it broke camera/WASD/mouse behavior.
- TaCZ Additions is postponed for a future Pack 14.4 if this pack works well.
- No extra gunpacks are added.
- No armed NPCs are added.
- No Create integration is added yet.
- Test camera, recoil, ADS, hip-fire, Shoulder Surfing, Punchy blacklist, and keybinds carefully.

### Prism validation

- Test TaCZ ADS and hip-fire with Shoulder Surfing base and Third Person Shooting: Zero.
- Check whether third-person projectiles and crosshair feel aligned.
- Confirm TaCZ Ammo Query exposes ammunition-to-weapon information in JEI.
- Review TaCZ Tweaks options and only change gameplay balance after separate testing.
- Keep Punchy's TaCZ blacklist active with `^tacz:.*$` or manual TaCZ item entries.

## Experimental Branch - Warrior Epic Fight Experiment

### Mods added

- Epic Fight - `both`, soulslike combat system for testing an advanced Warrior role.
- EpicFight-Nightfall - `both`, movement/combat addon inspired by NightfallCraft.
- Epic Fight: Skill Tree - `both`, skill tree progression for the Warrior role.
- Epic Fight - Invincible Lib - `both`, dependency required by EpicFight-Nightfall in this experiment.
- Epic Fight - Avalon - `both`, dependency required by EpicFight-Nightfall in this experiment.

### Notes

- This is not part of stable `dev` yet.
- This is a test on an experimental branch.
- Better Combat is not removed yet.
- Combat Roll is not removed yet.
- TaCZ, Punchy, and Shoulder Surfing are not removed.
- The goal is to verify whether Epic Fight can coexist with the current stack or whether classes/systems need separation.
- If it breaks TaCZ, Punchy, Better Combat, Combat Roll, or player animations, do not merge this branch to `dev`.

## Initial candidate list

- ModernFix
- FerriteCore
- Embeddium
- Oculus
- Entity Culling
- More Culling
- Create
- Create: Copycats+
- TacZ
- Iron's Spells 'n Spellbooks
- Better Combat
- Epic Fight
- Cataclysm
- Alex's Mobs
- Farmer's Delight
- Chef's Delight
- YUNG's Better Dungeons
- YUNG's Better Mineshafts
- Cult of Azazel
- Stellara
- You Died
- Unusual Prehistory
- Ice and Fire Community Edition
- FTB Quests
- KubeJS
- FancyMenu
- Drippy Loading Screen
- Shoulder Surfing Reloaded
- Punchy!

Important: Better Combat and Epic Fight should not be mixed without heavy testing.

## Excluded for now

- Do not use Arsenal RPG Series for now because it does not fit the Forge 1.20.1 target well enough.
- Do not use Clavis for now because it does not fit the Forge 1.20.1 target well enough.
- Do not use Immersive Hotbar for now because packwiz did not find a valid Forge 1.20.1 version for the current pack settings.
- Use Superior RPG only as inspiration for class progression and RPG pacing.
- Use Mushoku Tensei only as inspiration for magic/class fantasy and presentation.
