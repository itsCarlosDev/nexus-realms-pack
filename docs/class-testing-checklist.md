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
/nexus_resetclass_clean SpendRed23
/nexus_select mage
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
/nexus_resetclass_clean SpendRed23
/nexus_select gunslinger
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
/nexus_resetclass_clean SpendRed23
/nexus_select warrior
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
/nexus_class_status SpendRed23
/nexus_class_menu
/nexus_class_help
```

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
- Expected: warning and Glock moved out of hand.
- Expected: Warrior cannot fire TaCZ.
- Give self Iron spellbook.
- Select it.
- Expected: warning and spellbook moved out of hand or casting blocked.

### Mage

- Select Mage.
- Give self Glock.
- Select it.
- Expected: warning and Glock moved out of hand.
- Expected: Mage cannot fire TaCZ.
- Give self Simply Swords/Epic Fight weapon.
- Select it.
- Expected: warning and weapon moved out of hand.
- Expected: Mage cannot melee with it.
- Mage spellbook must still work.

### Gunslinger

- Select Gunslinger.
- Give self Simply Swords/Epic Fight weapon.
- Select it.
- Expected: warning and weapon moved out of hand.
- Expected: Gunslinger cannot melee with it.
- Give self Iron spellbook.
- Select it.
- Expected: warning and spellbook moved out of hand or casting blocked.
- Gunslinger Glock must still work.

### Inventory behavior

- Wrong-class items may stay in inventory.
- Wrong-class items must not be deleted.
- If inventory is full, wrong-class held item may be dropped safely.

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
"/Users/carlosmoralesartes/Library/Application Support/PrismLauncher/instances/Nexus Realms DEV/minecraft/logs/latest.log" | tail -250
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
