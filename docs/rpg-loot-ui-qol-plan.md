# Pack 19.0 - RPG Loot UI, Inventory, Visual Polish and QoL

## Scope

Pack 19.0 adds RPG-style loot feedback, inventory comfort, item rarity visuals and general quality-of-life improvements.

## Included areas

### Loot and item presentation

- Loot Journal
- Legendary Tooltips
- Item Borders
- Inventory HUD+
- Equipment Compare

### Inventory and exploration

- Sophisticated Core
- Sophisticated Backpacks

### QoL and client polish

- RightClickHarvest
- Dynamic FPS
- Particle Core
- Continuity, only if a Forge 1.20.1 build works without Sinytra/Connector
- Charm of Undying
- Better Totem of Undying, only if kept after duplication review
- Emojiful

## Not in scope

The following belong to later packs:

- Particle Rain
- Cool Rain
- Serene Seasons
- Tough As Nails
- Bosses
- Factions
- Dungeons
- Realm RPG quests
- Worldgen
- Dragon mounts
- Nether/End expansions

## Balance notes

Sophisticated Backpacks can strongly affect exploration and dungeon loot capacity. Backpack tiers and upgrades should be reviewed later in the economy/balance pack.

Charm of Undying and Better Totem of Undying can overlap. Better Totem of Undying stays pending in Pack 19.0 so Charm of Undying can be tested first. If the extra totem presentation still feels needed later, test Better Totem in a separate pass.

RightClickHarvest is allowed as a low-risk QoL mod.

Dynamic FPS and Particle Core are client-side polish/performance helpers.

Continuity must not pull Sinytra Connector or Fabric API into Nexus Realms. Pack 19.0 tested Continuity and left it pending because the resolved build attempted to install Sinytra Connector and Forgified Fabric API.

## Testing checklist

1. Start Nexus Realms from Prism.
2. Pick up several item stacks and verify Loot Journal notifications.
3. Hover common, uncommon, rare and modded items and verify Legendary Tooltips.
4. Check Item Borders in inventory.
5. Check TaCZ guns, Iron's Spells spellbooks and Simply Swords item icons/tooltips.
6. Equip/use a Sophisticated Backpack.
7. Verify backpack upgrades do not crash.
8. Harvest vanilla crops with right click.
9. Test Charm of Undying with a totem in the Curios slot if available.
10. Test Better Totem behavior if installed.
11. Type emojis in chat with Emojiful.
12. Check latest.log for errors related to lootjournal, legendarytooltips, itemborders, sophisticatedbackpacks, rightclickharvest, continuity, particlecore, dynamicfps and emojiful.
