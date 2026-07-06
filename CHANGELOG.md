# Changelog

## Hand enforcement loop fix

- Fixed wrong-class held items being returned to the selected hotbar slot.
- Replaced unsafe `player.give` hand return behavior with verified safe inventory-slot movement.
- Avoided automatic drop fallback when no safe inventory slot exists to prevent pickup loops.
- Prevented pickup sound loops from repeated restriction enforcement.
- Improved reliability against TaCZ and Epic Fight items.
- Kept Punchy and Epic Tweaks behavior unchanged.

## Class hand enforcement hotfix

- Added active main hand/offhand enforcement for wrong-class items.
- Wrong-class items can remain in inventory but cannot be used from hand.
- Blocked TaCZ firing for non-Gunslingers by preventing TaCZ guns from staying in hand.
- Blocked Epic Fight/Simply Swords weapons for non-Warriors by preventing those weapons from staying in hand.
- Blocked Iron's Spells items for non-Mages.
- Ensured restricted items are moved only to verified safe inventory slots and are never deleted.
- Improved class debug/status output for hand enforcement.
- Kept Punchy and Epic Tweaks behavior intact.

## Unarmed melee restriction hotfix

- Enabled non-warrior unarmed melee blocking.
- Prevented Mage and Gunslinger from damaging entities with empty-hand melee.
- Kept Punchy usable for normal Minecraft actions.
- Kept Epic Tweaks mode enforcement intact.

## Pack 19.0 - RPG Loot UI, Inventory, Visual Polish and QoL

- Added RPG loot and item presentation improvements.
- Added Loot Journal for pickup notifications.
- Added Legendary Tooltips and Item Borders for more visible item rarity and RPG item presentation.
- Added inventory and comparison helpers.
- Added Sophisticated Backpacks and Sophisticated Core for exploration storage.
- Added RightClickHarvest for crop QoL.
- Added Dynamic FPS and Particle Core for client polish/performance.
- Added Emojiful for social chat expression.
- Reviewed Continuity as optional visual polish only if it does not require Sinytra Connector or Fabric API.
- Kept weather, worldgen, bosses, factions and quests for later packs.

### Pending

- Continuity: pending because the resolved Forge build attempted to install Sinytra Connector and Forgified Fabric API.
- Better Totem of Undying: pending while Charm of Undying is tested first to avoid redundant totem behavior.

## Pack 18.0 - Visual Resource Packs and Fresh Animations

- Added the visual resource-pack foundation for Nexus Realms.
- Added Entity Model Features and Entity Texture Features for OptiFine-like entity model support without OptiFine.
- Added Entity Culling to reduce rendering overhead with animated entities.
- Added Fresh Animations and compatible visual resource packs where valid Forge/Minecraft 1.20.1 sources were available.
- Documented the recommended resource-pack order.
- Documented pending/incompatible packs that require a valid Minecraft 1.20.1 source before inclusion.
- Did not add root `options.txt`.
- Did not add manually downloaded resource-pack `.zip` files.
- Kept Particle Rain and weather mods for a later weather/worldgen pack.
- Pending after validation: Fresh Animations x Baby Animals Remastered, AL's Piglins Revamped + FA, Detailed Animations Reworked, Better Fresher 3D Books, Fresh Buckets 3D UI, Fresh Food, Fresh Flowers and Plants, Fresh Skeleton Physics, Actually 3D Stuff, Weskerson's 3D Items, BabyAnimalsRemastered_1.21.5 and Baha's 3D Beds.

## Pack 17.0 - Nexus Realms Creator Tools

- Added creator-friendly tools for trailers, cinematics, ambience and roleplay.
- Added CMDCam and CreativeCore for cinematic camera paths.
- Added Not Enough Animations for improved third-person player animation.
- Added Emotecraft for roleplay emotes and trailer scenes.
- Added AmbientSounds 6 and Sound Physics Remastered for stronger RPG ambience.
- Added Simple Voice Chat for proximity voice and multiplayer recording.
- Documented Freecam, ReForgedPlay, Distant Horizons, Oculus and shaders as creator-only tools outside the normal pack.

## Pack 16.11 - Class System QA and Final Polish

- Audited Nexus class commands, restrictions and starter kit documentation.
- Confirmed the final Epic Fight architecture: KubeJS handles item restrictions while Epic Tweaks handles Battle/Mining Mode.
- Kept `canSwitchPlayerMode` as `true`.
- Kept aggressive `/epicfight mode mining` command enforcement disabled by default.
- Preserved Punchy/vanilla empty-hand behavior for Mage and Gunslinger.
- Documented final QA tests for Warrior, Mage and Gunslinger.
- Kept Gunslinger starter as Glock 17.
- Did not invent Epic Fight configs or root `options.txt`.
- Added generated Epic Tweaks config file after validation.

## Pack 16.10 - Epic Fight Air Tool and Mode Enforcement

- Prepared the final Epic Fight mode architecture using Epic Tweaks and Epic Fight item preferences.
- Kept `canSwitchPlayerMode` as `true`; `false` is not a valid final solution because it also blocks Warrior.
- Disabled aggressive KubeJS `/epicfight mode mining` command enforcement by default if present.
- Documented the requirement to set Air / `minecraft:air` as Preferred Tool.
- Documented the Default Options keybind workflow for disabling the manual Epic Fight Battle/Mining toggle.
- Kept Gunslinger starter as Glock 17.
- Did not invent Epic Fight client configs or datapack overrides when generated configs were missing.

## 0.1.0

- Pack 16.8 - Class Progression Foundation: documented FTB Quests class progression architecture, class chapter design, initial balance notes, progression testing, kept KubeJS as source of truth, kept Gunslinger Glock 17, and deferred final Battle Mode handling to Pack 16.10.
- Pack 16.7 - Class System QA and Polish: added class status/debug improvements, added test kit commands, improved class selection and kit messages, added class testing checklist, kept Gunslinger starter Glock 17, and prepared debug output for the Pack 16.10 Epic Tweaks mode plan.
- Pack 16.6 - Default Options and Keybind Foundation: documented Default Options support, Balm dependency, final combat keybind plan, Default Options workflow, Gunslinger Glock 17 starter, and prepared the keybind path completed in Pack 16.10.
- Experimental: added Epic Tweaks to enforce Epic Fight mode by held item, disabled aggressive KubeJS mining-mode command enforcement, documented the TaCZ/Iron's/Epic Fight keybind plan, and kept Gunslinger on Glock 17.
- Experimental: forced non-Warrior classes back to Epic Fight mining mode, documented combat keybinds to avoid TaCZ/Iron's/Epic Fight conflicts, and kept Gunslinger on Glock 17.
- Experimental: blocked unarmed melee damage for non-Warrior classes to mitigate Epic Fight Battle Mode leakage and switched the Gunslinger starter gun to Glock 17.
- Experimental: reduced class restriction chat spam with actionbar/cooldown warnings, improved reset messaging, reviewed TaCZ starter gun icon behavior, and documented Epic Fight unarmed limitations.
- Experimental: fixed Gunslinger starter gun NBT, hardened class item restrictions for Warrior, Mage and Gunslinger systems, and added class restriction debug tooling.
- Experimental: fixed class starter kit delivery after Epic Fight integration by removing the KubeJS count redeclaration and making FancyMenu the primary login selector.
- Experimental: removed fape_compat and Better Combat compatibility resource pack after Better Combat removal to fix the BCAttackAdjustmentMixin startup crash.
- Experimental: integrated Epic Fight warrior combat stack and replaced Better Combat/Combat Roll as the Warrior combat foundation.
- Experimental: fixed class starter kit delivery with NBT item creation fallback and per-item logs.
- Experimental: updated Warrior, Mage and Gunslinger starter kits with verified modded items and NBT.
- Experimental: reverted T.O Magic 'n Extras pending a cleaner Mage expansion.
- Experimental: fixed Mage expansion dependency chain for T.O Magic 'n Extras.
- Experimental: added T.O Magic 'n Extras as an Iron's Spells addon to expand the Mage class.
- Experimental: documented FTB Quests class progression foundation for Warrior, Mage and Gunslinger paths.
- Experimental: added FancyMenu UI foundation for class selection with placeholder class images and KubeJS open-gui bridge.
- Experimental: removed Epic Fight experiment entries from the class selection branch to keep Pack 16.1 isolated.
- Experimental: added initial KubeJS class selection backend with persistent player class state, class tags, starter kits and admin reset command.
- Experimental: added Epic Fight, EpicFight-Nightfall and Epic Fight Skill Tree on warrior experiment branch.
- Added Biohazard gunplay alignment with Third Person Shooting: Zero, TaCZ Tweaks and TaCZ Ammo Query.
- Stabilized TaCZ/Punchy integration by keeping Punchy, removing problematic SSR Camera Fixes if present, and documenting TaCZ blacklist plus keybind cleanup.
- Kept Punchy and added TaCZ/Shoulder Surfing compatibility cleanup with SSR Camera Fixes and documented Punchy blacklist/keybind configuration.
- Added Firearms Foundation with TaCZ for the future Pistolero/Biohazard progression.
- Removed Immersive Damage Indicators to fix duplicated boss health bars before the Firearms pack.
- Added Fishing Guild Foundation with Starcatcher, The Fisherman House, FTB Quests, FTB Library, FTB Teams and Quests Additions.
- Added FA: Player Extension Compat as a client-side fix for Fresh Animations: Player Extension and Better Combat compatibility.
- Added FA: Player Extension X Better Combat to fix the visual conflict between Fresh Animations: Player Extension and Better Combat.
- Added Fresh Animations: Player Extension as a managed resource pack in `dev`.
- Added Pack 12.1 Bosses expansion / Raids / Ocean threats in `dev` with Mowzie's Mobs, Bosses of Mass Destruction, Raids:Enhanced, and Aquamirae.
- Added Pack 12 Bosses / Rise / Endgame progression in `dev` with Cataclysm, Bosses'Rise, Boss Checklist, and Boss Checklist Addon.
- Added Pack 11 Combat foundation in `dev` with Better Combat, Simply Swords, and Combat Roll.
- Added Pack 10 Worldgen / Settlements / Exploration in `dev` with CTOV, Mystic's Biomes, TerraBlender, and Explorer's Compass.
- Added Pack 9 Prehistoric Wildlife & Oceans in `dev` with dinosaurs, sharks, Megalodon, and dangerous fauna.
- Added Kotlin for Forge in `dev` as the missing Create Slice & Dice dependency.
- Added Pack 8 Create production integration in `dev` with Create Crafts & Additions and Create Slice & Dice.
- Added Pack 7 performance diagnostics core in `dev` with spark, ServerCore, Clumps, and Alternate Current.
- Replaced the JourneyMap 6.0.0 beta build in `dev` with stable JourneyMap 5.10.3 after a load crash.
- Removed ImmediatelyFast from `dev` after a startup crash with Oculus/Embeddium.
- Removed Stellara, replaced Xaero's maps with JourneyMap, and added the Pack 6.5 sound/ambient block in `dev`.
- Added the Pack 6.4 DiosesMC-inspired visual polish block in `dev`, including chat, zoom, UI, torch, enchant icon, and low-fire visibility polish.
- Removed MB-3D Items Pack from `dev`.
- Added MB-3D Items Pack in `dev` as a managed resource pack for 3D item testing.
- Removed Jofi's 3D Apples from Pack 6.1 after Minecraft showed it as visually incompatible in the resource pack UI.
- Added the Pack 6.1 visual polish / UI extra block in `dev`, including extra particles, visual workbench support, advancement plaques, damage indicators, and Better Lanterns.
- Added Jofi's 3D Apples as a Pack 6 managed resource pack.
- Added the Pack 6 visual / immersion / UI block in `dev`, including visual animation, camera, HUD, and Fresh Animations resource pack support.
- Added the Magic class block in `dev` with Iron's Spells 'n Spellbooks and required libraries.
- Added the structures, exploration, and multiplayer utilities block in `dev`.
- Added the QoL/UI block in `dev`: JEI, Jade, AppleSkin, Mouse Tweaks, BetterF3, Cloth Config API, Controlling, and Searchables.
- Initial Nexus Realms packwiz repository structure.
- Added documentation for Prism Launcher, server installation, branch strategy, update workflow, and mod side rules.
- Added helper scripts for refreshing, server updates, and development checks.

## Experimental - Class Selection FancyMenu template
- Added functional FancyMenu class selection template.
- Buttons successfully call KubeJS class commands.
- Visual design is still placeholder/template and will be polished later.
