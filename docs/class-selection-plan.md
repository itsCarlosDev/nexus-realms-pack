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

## Current starter kits

Guerrero:

- `simplyswords:iron_glaive` x1
- `minecraft:shield` x1
- `minecraft:bread` x16

Mago:

- `irons_spellbooks:copper_spell_book` x1 with `irons_spellbooks:acupuncture` level 1
- `minecraft:amethyst_shard` x8
- `minecraft:bread` x16

Pistolero:

- `tacz:modern_kinetic_gun` x1 with `GunId:"tacz:taurus9"`
- `tacz:ammo` x16 with `AmmoId:"tacz:9mm"`
- `minecraft:bread` x16

## Starter kit notes

- Pack 16.4 uses verified IDs/NBT from `/kubejs hand`.
- KubeJS still marks `nexus_class_chosen` before giving items to avoid kit duplication.
- If a starter kit item fails, KubeJS logs the item error and keeps the class locked in.

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
- T.O Magic 'n Extras was tested and then reverted because it continued to fail in Prism after pulling in Alex's Caves, Apothic Attributes/AttributesLib, Placebo, and L_Ender's Cataclysm.
- Mage expansion is postponed until a cleaner Iron's Spells addon or a safer version is validated.
- No other large standalone magic system is added in this pack.
- `/nexus_select` and `/nexus_resetclass` are unchanged.

## Pack 16.4 - Real class starter kits

- Warrior starts with `simplyswords:iron_glaive`, shield, and bread.
- Mage starts with `irons_spellbooks:copper_spell_book` containing `irons_spellbooks:acupuncture` level 1, amethyst shards, and bread.
- Gunslinger starts with `tacz:modern_kinetic_gun` using `tacz:taurus9`, `tacz:ammo` 9mm, and bread.
- Starter kit item NBT is handled in KubeJS with per-item error logging.
- FancyMenu and FTB Quests still do not grant starter kits directly.

## Pack 16.4.2 - Starter kit delivery fix

- `nexusGiveStarterKit` now creates each stack through `nexusCreateKitItem`.
- Optional NBT is supported with a fallback item creation path.
- Every delivered item is logged.
- Failed items are reported without stopping the rest of the kit.
- `/nexus_select` still locks the class before trying to deliver items.

## Pack 16.5.2 - Kit delivery and chat UX fix

- Fixed the KubeJS/Rhino `TypeError: redeclaration of var count` kit delivery failure.
- Kit creation now uses `itemCount` consistently and keeps NBT support.
- Added `/nexus_givekit <class> [player]` for operator kit testing without changing class state.
- Removed the automatic command-list chat fallback on login.
- FancyMenu remains the primary class selector.
- `/nexus_class_help` is the manual fallback for command instructions.
- `/nexus_class_menu` reopens the visual selector for players without a class.

## Pack 16.5.3 - Gunslinger gun and class system enforcement

- Fixed the Gunslinger starter gun by creating the Taurus 9 with the exact TaCZ `GunId` NBT.
- `tacz:modern_kinetic_gun` without NBT is only a generic TaCZ item and should not be used in kits.
- Hardened class restrictions by namespace for Warrior, Mage, and Gunslinger systems.
- Added a lightweight hand/offhand guard so restricted items warn even when a mod does not pass through the right-click event.
- Added `/nexus_class_debug` for checking class tags, held item namespace, required class, and restriction result.
- Epic Fight Battle Mode could not be disabled reliably from KubeJS `server_scripts`; mitigation is item/progression restriction.

## Pack 16.5.4 - Restriction UX and Epic Fight unarmed mitigation

- Restriction warnings now prefer actionbar messages with a short vanilla sound.
- Chat fallback is only used if the actionbar command fails.
- Classless players no longer receive restriction spam every second; they get a long-cooldown prompt to choose a class.
- Reset messaging is cleaner and tries to reopen FancyMenu automatically.
- TaCZ Taurus 9 NBT is left unchanged because `/kubejs hand` confirms the correct `GunId`.
- The remaining purple/black TaCZ icon is documented as likely inventory render/icon behavior unless the creative item proves extra NBT is required.
- No reliable versioned Epic Fight config/API was found to disable unarmed/empty-hand Battle Mode from KubeJS.
- Punchy blacklist remains manual because no clear Punchy config file exists in the repo.

## Pack 16.5 - Warrior Epic Fight integration

- Epic Fight becomes the Warrior combat foundation.
- EpicFight-Nightfall, Epic Fight: Skill Tree, Invincible Lib, Avalon, and AAA Particles are added for the Warrior stack.
- Better Combat and Combat Roll are removed from this branch.
- KubeJS remains the source of truth for class selection, persistent data, tags, and starter kits.
- `nexus_class_warrior`, `nexus_class_mage`, and `nexus_class_gunslinger` now also drive conservative item-use restrictions.
- FancyMenu still only calls `/nexus_select <class>`.
- FTB Quests still provides progression later and does not assign the class.
- The restriction layer uses item interaction events first; basic attack blocking may need more work if Epic Fight/TaCZ expose no reliable KubeJS event.

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
