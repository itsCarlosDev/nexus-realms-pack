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
- Epic Fight Battle Mode sigue pendiente de research externo.

## Pruebas Mago

- Recibe `irons_spellbooks:copper_spell_book`.
- Puede lanzar hechizo.
- No usa Simply Swords.
- No usa TaCZ.
- No debe depender de Battle Mode.

## Pruebas Pistolero

- Recibe Glock 17.
- `/kubejs hand` muestra `GunId:"tacz:glock_17"`.
- Recibe `AmmoId:"tacz:9mm"`.
- Puede apuntar, disparar y recargar tras configurar keybinds.
- No usa spellbook.
- No usa Simply Swords.

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
grep -RniE "Nexus Realms|nexus_class|nexus_givekit|nexus_testkit|failed|error|exception|glock_17|tacz|irons_spellbooks|simplyswords" \
"/Users/carlosmoralesartes/Library/Application Support/PrismLauncher/instances/Nexus Realms DEV/minecraft/logs/latest.log" | tail -220
```
