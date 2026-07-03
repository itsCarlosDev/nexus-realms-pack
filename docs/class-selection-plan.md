# Class selection plan

## Objective

Pack 16.0 creates the safe backend for Nexus Realms class selection before building a visual FancyMenu flow. The first version detects players without a class, lets them choose one class, persists the result, assigns a class tag, gives a small starter kit, and gives admins a reset command.

## Why KubeJS first

KubeJS gives the pack a server-side logic layer that can be tested before adding UI complexity. Starting with commands makes the important rules clear: one class per player, persistent state, no duplicate starter kits, and admin recovery if a player needs to be reset.

## Why FancyMenu waits for Pack 16.1

FancyMenu is intentionally not installed in Pack 16.0. The visual class screen should call into a backend that is already proven in Prism and on a server. Pack 16.1 can add FancyMenu and Konkrete after the command flow is stable.

## Classes

- Guerrero
- Mago
- Pistolero

## Persistent player data

- `nexus_class_chosen`: boolean. `true` means the player has already chosen a class.
- `nexus_class`: string. Stores `warrior`, `mage`, or `gunslinger`.

## Tags

- `nexus_class_warrior`
- `nexus_class_mage`
- `nexus_class_gunslinger`

## Commands

- `/nexus_select warrior`
- `/nexus_select mage`
- `/nexus_select gunslinger`
- `/nexus_resetclass <player>`: operator level 2 admin command. It clears class tags and class persistent data, but does not clear inventory.

## Current placeholder kits

Guerrero:

- `minecraft:iron_sword` x1
- `minecraft:shield` x1
- `minecraft:bread` x16

Mago:

- `minecraft:book` x1
- `minecraft:amethyst_shard` x8
- `minecraft:bread` x16

Pistolero:

- `minecraft:crossbow` x1
- `minecraft:arrow` x16
- `minecraft:bread` x16

## Future modded kits

Do not use unverified modded item IDs in the backend yet.

- TODO Guerrero: replace placeholder weapon with a verified Simply Swords item.
- TODO Mago: replace placeholder items with verified Iron's Spells 'n Spellbooks starter items.
- TODO Pistolero: replace crossbow placeholder with verified TaCZ starter weapon and ammo IDs.

## Future FTB Quests integration

FTB Quests can later read class tags or route players through class-specific quest chapters. Pack 16.0 does not create quests or quest gates yet.

## Future FancyMenu integration

Pack 16.1 should add FancyMenu and Konkrete, then build a full-screen class selection menu with buttons that run:

- `/nexus_select warrior`
- `/nexus_select mage`
- `/nexus_select gunslinger`

The menu must still rely on the KubeJS backend to prevent duplicate choices and duplicate kits.

## Pack 16.1 - FancyMenu frontend foundation

- FancyMenu is the visual frontend for class selection.
- KubeJS remains the source of truth for class selection, validation, tags, persistence, and starter kits.
- The selected class is still saved in player `persistentData` with `nexus_class_chosen` and `nexus_class`.
- The visual GUI must not give items directly. Its buttons only call `/nexus_select warrior`, `/nexus_select mage`, or `/nexus_select gunslinger`.
- If FancyMenu or the Custom GUI fails to open, the chat-command fallback remains available.

## Pack 16.2 - Class quest progression foundation

- FTB Quests will provide the class progression layer.
- KubeJS remains the source of truth for class selection and persistence.
- The existing class tags are the bridge for quest visibility/progression: `nexus_class_warrior`, `nexus_class_mage`, and `nexus_class_gunslinger`.
- Recipe balance and class restrictions are not implemented yet.
- Epic Fight is not touched in this pack.

## Pack 16.3 - Mage class expansion

- Iron's Spells remains the primary magic system for the Mago class.
- T.O Magic 'n Extras is added as an Iron's Spells addon for more mage progression content.
- No other large magic system is added in this pack.
- The Mago starter kit remains placeholder until real item IDs are verified with `/kubejs hand`.
- `/nexus_select` and `/nexus_resetclass` are unchanged.

## Future Epic Fight integration

Epic Fight integration should only be revisited if the combat stack is fixed and promoted out of experiment branches. Pack 16.0 does not add Epic Fight logic, recipes, skills, or class gating.

## Prism test checklist

- Start a new test world or join with a player that has no class data.
- Confirm the chat selector appears on first login.
- Run `/nexus_select warrior` and confirm the player receives iron sword, shield, and bread.
- Confirm the player gets `nexus_class_warrior`.
- Try `/nexus_select mage` after choosing warrior and confirm it is rejected.
- Repeat with a fresh/reset player for `mage` and `gunslinger`.
- As an operator, run `/nexus_resetclass <player>`.
- Confirm class tags are removed and the player can choose again.
- Confirm reset does not clear inventory.
- Restart the world/server and confirm the selected class remains saved.
