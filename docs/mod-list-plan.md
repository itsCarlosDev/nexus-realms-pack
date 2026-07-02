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
- Do not use Immersive Hotbar for now because it does not fit the Forge 1.20.1 target well enough.
- Use Superior RPG only as inspiration for class progression and RPG pacing.
- Use Mushoku Tensei only as inspiration for magic/class fantasy and presentation.
