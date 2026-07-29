# Diamond and netherite progression candidates

Local audit date: 2026-07-15. Sources: installed Forge 1.20.1 JAR registries, English language files, recipe paths, and the current Nexus class rules. Names alone were not treated as proof of tier.

## Applied now

| Tier | Item | Evidence | Decision |
| --- | --- | --- | --- |
| Diamond | `farmersdelight:diamond_knife` | The installed Farmer's Delight JAR defines the item and recipe `farmersdelight:diamond_knife`. | Direct diamond tool/weapon equivalent; gated in Era II. |
| Netherite | `farmersdelight:netherite_knife` | The installed Farmer's Delight JAR defines the item and recipe `farmersdelight:netherite_knife_smithing`. | Direct netherite upgrade; gated in Era IV. |

## Clear material equivalents deferred by class ownership

| Mod | Candidates | Classification | Reason not applied |
| --- | --- | --- | --- |
| Simply Swords | Diamond and netherite variants of chakram, claymore, cutlass, glaive, greataxe, greathammer, halberd, katana, longsword, rapier, sai, scythe, spear, twinblade and warglaive | Clear diamond/netherite weapons | Namespace `simplyswords` is reserved to the Warrior by `kubejs/server_scripts/nexus_class_selection.js` and Nexus Core `ClassRules`; special class progression is out of scope. |
| Epic Fight | `diamond_dagger`, `diamond_greatsword`, `diamond_longsword`, `diamond_spear`, `diamond_tachi` and their netherite variants | Clear material-tier weapons | Epic Fight equipment belongs to Warrior progression and needs a class-aware stage. |

## Uses diamond as an ingredient but is not a material tier

| Mod | Candidates | Classification |
| --- | --- | --- |
| Create Crafts & Additions | Diamond grit and diamond sandpaper | Processing ingredient/consumable, not equipment tier. |
| Born in Chaos | Diamond termite shard/egg and related drops | Creature material/loot, not vanilla-equivalent equipment. |
| Starcatcher | Diamond trophy | Passive trophy. |
| TaCZ packs | Diamond ammo box references | Pistolero content; not a vanilla material tool tier. |

## Clear endgame equipment deferred by system ownership

| Mod | Candidates | Classification | Reason not applied |
| --- | --- | --- | --- |
| Create | Netherite backtank, diving helmet and diving boots | Advanced Create equipment | Create and Create Aeronautics require their own Arcano-Industrial/Nexus milestones. |
| Iron's Spells 'n Spellbooks | Diamond spell book, netherite mage armor and netherite spell book | Mage equipment | Magic progression is explicitly deferred. |
| Cataclysm | Netherite effigy and netherite monstrosity-related entries | Boss/relic content | Boss and relic progression is explicitly deferred. |

## Ambiguous: design decision required

| Mod | Candidates | Question |
| --- | --- | --- |
| Sophisticated Backpacks | Diamond and netherite backpacks/upgrades | Storage capacity tier or general progression milestone? |
| Traveler's Backpack | Diamond/netherite backpacks, tanks and tool upgrades | Storage/tool utility rather than combat tier. |
| Critters and Companions | Diamond dragonfly armor | Pet equipment; History Stages equip behavior must be tested on non-player slots. |
| Minecraft | `minecraft:diamond_horse_armor` | Horse inventory is not a player armor slot. Excluded until runtime proves equip is blocked without deletion, duplication or ghost items. |

## Explicit exclusions

TaCZ, Iron's Spells, Create, Create Aeronautics, relics, boss drops and special class weapons are not added to either global material stage. Passive materials (`diamond`, diamond blocks, netherite scrap/ingots/blocks and smithing templates) remain collectible and storable.
