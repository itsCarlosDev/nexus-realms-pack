# Class Testing Checklist

## Precondition

```mcfunction
/gamerule canSwitchPlayerMode true
```

- Epic Tweaks config: `autoswitch_mode = true`, `enforce_mode = true`, `filter_animation_first_person = true`.
- Epic Fight Item Preferences: Air / `minecraft:air` as Preferred Tool.
- Epic Fight Toggle Battle/Mining Mode: Not Bound.
- TaCZ Reload: `R`.
- Iron's Spells Spell Wheel: `V` or `Z`.
- JEI Recipe: `U`.
- JEI Uses: `Y`.
- JourneyMap: `J`.

## Mage test

```mcfunction
/nexus_changeclass <OWNER_NAME> mage
```

Probar:

- mano vacia;
- Punchy/acciones normales;
- spellbook;
- lanzar hechizos;
- intentar arma Simply Swords;
- intentar TaCZ;
- intentar Battle Mode.

Resultado esperado:

- mano vacia y spellbook en Mining/Vanilla Mode;
- hechizos funcionan;
- no usa armas Guerrero;
- no usa TaCZ;
- no mantiene Battle Mode si Air es Preferred Tool y Toggle esta Not Bound.

## Gunslinger test

```mcfunction
/nexus_changeclass <OWNER_NAME> gunslinger
```

Probar:

- Glock 17;
- apuntar click derecho;
- recargar con R;
- mano vacia;
- intentar spellbook;
- intentar arma Simply Swords;
- intentar Battle Mode.

Resultado esperado:

- TaCZ queda Mining/Vanilla;
- R recarga;
- R no abre Spell Wheel;
- no usa spellbooks;
- no usa armas Guerrero;
- no mantiene Battle Mode.

## Warrior test

```mcfunction
/nexus_changeclass <OWNER_NAME> warrior
```

Probar:

- Simply Swords;
- Epic Fight Battle Mode automatico;
- Skill Tree;
- mano vacia;
- intentar spellbook;
- intentar TaCZ.

Resultado esperado:

- arma Guerrero entra en Battle Mode;
- mano vacia idealmente vuelve a Mining/Vanilla;
- no usa spellbooks;
- no usa TaCZ.

## Debug commands

```mcfunction
/nexus_class_debug
/nexus_class_status
/nexus_givekit warrior
/nexus_givekit mage
/nexus_givekit gunslinger
```

Tambien probar:

```mcfunction
/nexus_class_status <OWNER_NAME>
/nexus_class_menu
/nexus_class_help
/nexus_changeclass_status <OWNER_NAME>
/nexus_repairclass <OWNER_NAME>
```

## Transaction and recovery QA

- Initial `/nexus_select warrior|arcanist|gunslinger` remains free, preserves inventory, creates no cooldown, and does not require selecting Mage first.
- A later `/nexus_changeclass <player> <class>` costs exactly 41 Minecraft levels and starts a 12-hour cooldown.
- With 40 levels, the command returns failure without journal, charge, inventory mutation, kit, or cooldown.
- With an external container open, the server closes it, reports `interfaz cerrada; activa de nuevo el altar`, and makes no other change.
- Cover hotbar, main inventory, armor, offhand, cursor, personal 2x2 crafting, functional Curios, cosmetic Curios, and an NBT container stack.
- Confirm success preserves those locations; only incompatible equipped items may move safely into main inventory, while Ender Chest and external storage remain unchanged.
- Inject/reproduce a failure before `OLD_STATE_REVOKED`; confirm exact inventory, Curios, XP, class, specialization, tags, and stages rollback.
- Inject/reproduce a failure at or after `OLD_STATE_REVOKED`; confirm login performs forward recovery without another XP charge or duplicate kit.
- Confirm recovery stops after three failed attempts and leaves `RECOVERY_REQUIRED` for administration.
- Confirm Warrior/Mage/Gunslinger initial kits are delivered by deficit and preserve the Glock/ammo NBT.
- Confirm the Arcanist initial spellbook delivery is also idempotent and preserves its spell-container NBT; later changes deliver no starter kit.
- Confirm direct `metallurgist` selection is rejected by `/nexus_select`, `/nexus_specialization`, and `/nexus_changeclass`.
- Confirm an existing `mage + metallurgist` player migrates once to Warrior without XP cost, cooldown, starter kit, inventory mutation, or lost quest/era progress.
- Confirm Warrior reconciliation grants any missing basic powers and preserves advanced powers/Mistborn; leaving Warrior revokes Allomancy and verifies zero powers.
- Confirm `/nexus_repairclass` charges nothing, starts no cooldown, gives no kit, and uses only the exact persistent class as authority.
- Confirm repair removes only equipped incompatible armor/offhand/Curios when the vanilla main inventory can accept every stack.
- Test commands from an OP player, dedicated-server console, and command block.

## Non-warrior unarmed melee QA

- Select Mage.
- Empty hand.
- Try to punch a mob.
- Expected: no damage, warning message.
- Try to mine/build/open chest.
- Expected: works normally.

- Select Gunslinger.
- Empty hand.
- Try to punch a mob.
- Expected: no damage, warning message.
- Try to mine/build/open chest.
- Expected: works normally.

- Select Warrior.
- Empty hand or warrior weapon.
- Expected: warrior combat behavior is not broken.

## Wrong-class hand enforcement QA

### Warrior

- Select Warrior.
- Give self TaCZ Glock.
- Put Glock in hotbar and select it.
- Expected: warning if used; Glock may remain in hand.
- Expected: Warrior cannot fire TaCZ.
- Give self Iron spellbook.
- Select it.
- Expected: warning if used; casting blocked.

### Mage

- Select Mage.
- Give self Glock.
- Select it.
- Expected: warning if used; Glock may remain in hand.
- Expected: Mage cannot fire TaCZ.
- Give self Simply Swords/Epic Fight weapon.
- Select it.
- Expected: warning if used; weapon may remain in hand.
- Expected: Mage cannot melee with it.
- Mage spellbook must still work.

### Gunslinger

- Select Gunslinger.
- Give self Simply Swords/Epic Fight weapon.
- Select it.
- Expected: warning if used; weapon may remain in hand.
- Expected: Gunslinger cannot melee with it.
- Give self Iron spellbook.
- Select it.
- Expected: warning if used; casting blocked.
- Gunslinger Glock must still work.

### Inventory behavior

- Wrong-class items may stay in inventory.
- Wrong-class items may stay in hand.
- Wrong-class items must not be deleted.
- Wrong-class held items are not moved by KubeJS or NexusCore.
- The enforcement path must not use `player.give`, automatic drop fallback, KubeJS inventory slot writes, or `/item replace`.
- Wrong-class held item use/damage is blocked even when the item remains visually in hand.

### TaCZ native event QA

- Select Warrior.
- Put TaCZ Glock in hand.
- Expected: `TimelessGunEvents.gunShoot` / `gunFire` are blocked, Glock does not fire, and ammo should not be consumed if TaCZ cancels before consumption.
- Select Mage.
- Put TaCZ Glock in hand.
- Expected: Glock does not fire and TaCZ reload/melee are blocked.
- Select Gunslinger.
- Put TaCZ Glock in hand.
- Expected: Glock fires, reloads and uses ammo normally.
- Check latest.log.
- Expected: controlled lines like `[Nexus Realms] Blocked TaCZ event gunShoot ... class=warrior` without spam.

## Hand enforcement regression QA

- Select Gunslinger.
- Put Simply Swords/Epic Fight weapon in selected hotbar slot.
- Expected: item may remain in hand.
- Expected: no pickup sound loop.
- Expected: cannot hit mobs with it.
- Expected: item is not deleted, duplicated, dropped or moved.

- Select Warrior.
- Put TaCZ Glock in selected hotbar slot.
- Expected: item may remain in hand.
- Expected: cannot fire.
- Expected: no pickup sound loop.

- Fill inventory.
- Select Mage.
- Put Glock in hand.
- Expected: use/damage is blocked, not deleted, not duplicated, and does not loop infinitely into hand.

## NexusCore debug QA

- Run `/nexus_class_debug`.
- Expected: output reports `Enforcement owner: nexuscore` and `Strategy: forge_event_enforcer_no_inventory_movement`.
- Run `/nexus_inventory_debug`.
- Expected: output is marked diagnostic only and does not move inventory.

## Creator Tools visual QA

After Pack 17.0, record or observe:
- Warrior Epic Fight animations in third person.
- Mage spellcasting in third person.
- Gunslinger aiming and reloading in third person.
- Emotecraft emotes with class gear.
- AmbientSounds and Sound Physics in a dungeon/cave.

## Pack 18.0 visual QA

After enabling the resource packs manually:

- Check Warrior with Epic Fight in third person.
- Check Mage with Iron's Spells in third person.
- Check Gunslinger with TaCZ aiming/reloading in third person.
- Check villagers, zombies, skeletons, piglins and animals.
- Check player animations with Not Enough Animations + Fresh Animations stack.
- Check that no resource pack breaks item icons for TaCZ, spellbooks or Simply Swords.

## Pack 19.0 class item visual QA

After Pack 19.0:

- Check Gunslinger Glock 17 tooltip and icon.
- Check TaCZ ammo tooltip and stack display.
- Check Mage spellbook tooltip.
- Check Warrior Simply Swords tooltip and item border.
- Check that Legendary Tooltips and Item Borders do not hide class restriction feedback.
- Check Sophisticated Backpack with Warrior, Mage and Gunslinger inventories.

## Logs

```bash
grep -RniE "Nexus Realms|nexus_class|epicfight|epictweaks|autoswitch|enforce|minecraft:air|Preferred|tacz|glock_17|irons_spellbooks|simplyswords|error|exception" \
"<PRISM_INSTANCE>/minecraft/logs/latest.log" | tail -250
```

## Pack 16.11 notes

- KubeJS bloquea items por clase.
- Epic Tweaks controla Battle/Mining Mode.
- `canSwitchPlayerMode` debe quedar `true`.
- El fallback agresivo `/epicfight mode mining <player>` queda apagado.
- El bloqueo de melee sin arma para no-Guerrero queda activo solo contra entidades.
- Punchy/vanilla se conserva para mineria, construccion, pesca e interacciones normales.
- Los items de otra clase pueden estar en inventario, pero hand enforcement debe retirarlos de main hand/offhand.
- Pistolero mantiene Glock 17 como starter activo.
