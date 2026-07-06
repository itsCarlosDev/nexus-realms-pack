# Nexus Realms Resource Pack Order

Pack 18.0 adds the visual resource-pack foundation for Nexus Realms.

## Required mods

Fresh Animations and its addons need OptiFine-like entity model support. Nexus Realms does not use OptiFine, so the pack uses:

- Entity Model Features
- Entity Texture Features
- Entity Culling

## Recommended order

Resource pack order should be reviewed in Minecraft after installation.

General rule:
- Compatibility patches and addons go above their base pack.
- Fresh Animations addons go above Fresh Animations.
- LowOnFire can stay near the top because it is a first-person visibility improvement.
- 3D item/block packs can usually stay below entity animation packs unless a specific pack author says otherwise.

Suggested top-to-bottom order:

1. LowOnFire
2. FA+Player
3. FA+Emissive
4. FA+Details
5. Fresh Animations x Baby Animals Remastered
6. AL's Piglins Revamped + FA
7. Fresh Skeleton Physics
8. Fresh Animations
9. Detailed Animations Reworked
10. Actually 3D Stuff
11. Better Fresher 3D Books
12. Fresh Buckets 3D UI
13. Fresh Food
14. Fresh Flowers and Plants
15. MushroomsPlus

## Not enabled automatically

Do not create or commit root `options.txt`.

If a resource-pack selection needs to be distributed later, use Default Options and only version generated files under `config/defaultoptions/` after manual verification.

## Pending packs

The following packs were seen in screenshots but must not be added until a valid Minecraft 1.20.1 version is confirmed:

- Weskerson's 3D Items
- BabyAnimalsRemastered_1.21.5
- Baha's 3D Beds

The following Pack 18.0 targets remain pending because packwiz could not confirm a safe Minecraft 1.20.1 source, or the current metadata attempted to add Sinytra Connector:

- Fresh Animations x Baby Animals Remastered
- AL's Piglins Revamped + FA
- Detailed Animations Reworked
- Better Fresher 3D Books
- Fresh Buckets 3D UI
- Fresh Food
- Fresh Flowers and Plants
- Fresh Skeleton Physics
- Actually 3D Stuff

## Testing checklist

1. Start Nexus Realms from Prism.
2. Open Resource Packs.
3. Enable Fresh Animations and installed addons.
4. Apply the recommended order.
5. Enter a test world.
6. Check villagers, zombies, skeletons, piglins, animals and player animations.
7. Check Warrior, Mage and Gunslinger in third person.
8. Check TaCZ aiming/reloading does not visually break.
9. Check Epic Fight animations still work for Warrior.
10. Check Iron's Spells spellbook casting still looks acceptable.
11. Check latest.log for EMF/ETF/resource-pack warnings.
