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

### Resourcepacks added

- MB-3D Items Pack - `client` resource pack, managed by packwiz metadata, added as a test candidate for 3D item compatibility.

### Compatibility tests required in Prism

- Test MB-3D Items Pack with Punchy! in first person.
- Test MB-3D Items Pack with YDM's Weapon Master in third person.

### Pending or omitted candidates

- Jofi's 3D Apples remains omitted because Minecraft showed it in red/incompatible in the resource pack UI.
- 3D Apples remains omitted because it is not compatible with Minecraft 1.20.1.
- Fresh Food remains pending because it requires additional mods.
- Fusion 3D Items remains pending because it requires Fusion.
- Better 3D Food remains an alternative if MB-3D Items Pack looks bad in Prism.

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
