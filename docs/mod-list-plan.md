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
