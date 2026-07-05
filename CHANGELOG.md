# Changelog

## 0.1.0

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
