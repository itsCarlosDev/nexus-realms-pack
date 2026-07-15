# Nexus UI asset manifest

Phase 1 renders the Lithic-Arcane inventory tab and compact panel with native `GuiGraphics` geometry and registered Minecraft item icons. The persistent gameplay HUD was removed in Nexus Core 0.4.1. This keeps the interface reproducible and license-safe while bespoke pixel art is prepared. The following files are the replacement contract for a later art pass; they are intentionally not referenced until they exist.

| Asset path | Canvas | Alpha | Function | Era variant | Nine-slice safe zone |
| --- | --- | --- | --- | --- | --- |
| `assets/nexuscore/textures/gui/nexus_inventory_progression_panel.png` | 136×166 px | RGBA, transparent corners | Compact inventory-attached stone plate; nine-sliced down to 126 px when space is constrained | Tint fissure at runtime | Insets: 8 left/right, 8 top/bottom |
| `assets/nexuscore/textures/gui/nexus_inventory_progression_tab.png` | 20×22 px | RGBA, transparent corners | Closed/open Nexus inventory tab | Tint border at runtime | Insets: 4 px on every edge |
| `assets/nexuscore/textures/gui/nexus_inventory_quest_button.png` | 18×18 px | RGBA, transparent corners | Disabled FTB Quests shortcut until a reliable chapter API is configured | Neutral bronze/stone | Insets: 3 px on every edge |
| `assets/nexuscore/textures/gui/nexus_era_prep_icon.png` | 32×32 px | RGBA | Dormant carved monolith | Dark stone, minimal grey energy | Not applicable |
| `assets/nexuscore/textures/gui/nexus_era_iron_icon.png` | 32×32 px | RGBA | Steel/bronze monolith | Aged bronze and discreet cold blue | Not applicable |
| `assets/nexuscore/textures/gui/nexus_era_diamond_icon.png` | 32×32 px | RGBA | Crystal monolith | Crystal blue/cyan edge | Not applicable |
| `assets/nexuscore/textures/gui/nexus_era_arcane_icon.png` | 32×32 px | RGBA | Geared rune monolith | Bronze, violet and cyan | Not applicable |
| `assets/nexuscore/textures/gui/nexus_era_nexus_icon.png` | 32×32 px | RGBA | Awakened Nexus monolith | Cyan with a small magenta core | Not applicable |

## Art constraints

- Pixel art or nearest-neighbor game UI; no text baked into textures.
- Approximately 80% `#2A2A2E` / `#141416`, 15% `#E6F2F5` / `#B5824C`, and no more than 5% bright energy.
- Energy accents: `#4169E1`, `#00E5FF`, `#8A2BE2`, and `#FF00FF`; warnings use `#FFBF00`, hordes use `#D91A2A`.
- No third-party textures or fonts without a recorded redistribution license.
- Transparent corners stay clear; the nine-slice interior must not contain cracks that would stretch visibly.
