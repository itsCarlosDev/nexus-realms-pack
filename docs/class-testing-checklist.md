# Class Testing Checklist

## Comandos

- `/nexus_resetclass_clean SpendRed23`
- `/nexus_select warrior`
- `/nexus_select mage`
- `/nexus_select gunslinger`
- `/nexus_givekit warrior SpendRed23`
- `/nexus_givekit mage SpendRed23`
- `/nexus_givekit gunslinger SpendRed23`
- `/nexus_class_debug`
- `/nexus_class_status`
- `/nexus_class_status SpendRed23`
- `/nexus_testkit warrior SpendRed23`
- `/nexus_testkit mage SpendRed23`
- `/nexus_testkit gunslinger SpendRed23`

## Pruebas Guerrero

- Recibe `simplyswords:iron_glaive`.
- Recibe escudo y pan.
- No usa spellbook.
- No usa TaCZ.
- Arma Simply Swords debe entrar en Battle Mode automaticamente.
- Mano vacia idealmente vuelve a Mining/Vanilla Mode si Air esta como Preferred Tool.

## Pruebas Mago

- Recibe `irons_spellbooks:copper_spell_book`.
- Puede lanzar hechizo.
- No usa Simply Swords.
- No usa TaCZ.
- Mano vacia debe quedar Mining/Vanilla.
- Spellbook debe quedar Mining/Vanilla.
- No deberia poder mantener Battle Mode si Air esta Preferred Tool y Epic Fight Toggle esta Not Bound.

## Pruebas Pistolero

- Recibe Glock 17.
- `/kubejs hand` muestra `GunId:"tacz:glock_17"`.
- Recibe `AmmoId:"tacz:9mm"`.
- Puede apuntar, disparar y recargar tras configurar keybinds.
- Glock 17/TaCZ debe quedar Mining/Vanilla.
- `R` debe recargar y no abrir Spell Wheel.
- No deberia poder mantener Battle Mode.
- No usa spellbook.
- No usa Simply Swords.

## Configuracion previa en Prism

- Ejecutar `/gamerule canSwitchPlayerMode true`.
- Configurar Air / `minecraft:air` como Preferred Tool en Epic Fight Item Preferences.
- Configurar Epic Fight Toggle Battle/Mining Mode como Not Bound.
- Configurar TaCZ Reload en `R`.
- Configurar Iron's Spells Spell Wheel en `V` o `Z`.
- Guardar Default Options con `/defaultoptions saveKeys` o `/defaultoptions saveAll`.

## Consistencia

- Al elegir clase, `nexus_class_chosen` queda en `true`.
- Al elegir clase, `nexus_class` queda en `warrior`, `mage` o `gunslinger`.
- Solo queda activo un tag de clase:
  - `nexus_class_warrior`
  - `nexus_class_mage`
  - `nexus_class_gunslinger`
- No se puede elegir una segunda clase sin reset.
- `/nexus_resetclass` no borra inventario.
- `/nexus_resetclass_clean` reinicia clase y limpia inventario de prueba.
- `/nexus_givekit` y `/nexus_testkit` no cambian la clase.

## Progresion futura

- Revisar `docs/class-progression-plan.md`.
- Revisar `docs/ftb-quests-class-design.md`.
- Revisar `docs/class-balance-notes.md`.
- Ejecutar los tests de `docs/class-progression-testing.md` antes de crear quests reales.

## Logs

Comando recomendado:

```bash
grep -RniE "Nexus Realms|nexus_class|epicfight|epictweaks|autoswitch|enforce|minecraft:air|Preferred|tacz|glock_17|irons_spellbooks|simplyswords|error|exception" \
"/Users/carlosmoralesartes/Library/Application Support/PrismLauncher/instances/Nexus Realms DEV/minecraft/logs/latest.log" | tail -220
```
