# Mod side rules

Use packwiz `side` values to separate client and server files. Do not use separate `server` and `client` branches.

## client

Use `side = "client"` for client-only mods and visual assets:

- Graphics and rendering.
- Maps and minimaps.
- Shaders.
- Interface and HUD changes.
- Camera and zoom tools.
- Visual optimization.
- Resource packs and shader packs.

Common examples:

- Embeddium
- Oculus
- Entity Culling
- More Culling
- JourneyMap
- Zoomify
- Resource packs
- Shaders

## server

Use `side = "server"` for server-only tools:

- Pregeneration.
- Profilers.
- Server administration tools.
- Server-only logic.
- Performance tools that do not need a client install.

## both

Use `side = "both"` for mods that add or change shared gameplay:

- Blocks.
- Items.
- Entities.
- Dimensions.
- Weapons.
- Magic.
- Bosses.
- Structures.
- Create machinery.
- Quests and progression.

Mods that normally belong in `both`:

- Create
- TacZ
- Iron's Spells 'n Spellbooks
- Cataclysm
- Alex's Mobs
- Ice and Fire
- Unusual Prehistory
- FTB Quests

If a mod changes gameplay or registry content, assume `both` until tested otherwise.

