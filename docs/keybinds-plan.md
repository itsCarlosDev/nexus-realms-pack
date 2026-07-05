# Nexus Realms Keybind Plan

## Objetivo

Evitar conflictos entre TaCZ, Iron's Spells, Epic Fight, JEI y JourneyMap.

Regla principal:

- `R` debe quedar solo para TaCZ Reload.
- `R` no debe abrir Spell Wheel.
- `R` no debe alternar Battle/Mining Mode.

## Plan recomendado

### TaCZ

- Fire: Left Mouse Button
- Aim: Right Mouse Button
- Reload: `R`
- Attachments: `F4`

### Iron's Spells

- Spell Wheel Hold: `Z`
- Cast Spell: mantener default si no choca.
- Next/Previous Spell: mantener defaults si no chocan.

### Epic Fight

- Toggle Battle/Mining Mode: Not Bound
- Skill Tree GUI: `K`
- Open Configuration Screen: Not Bound
- Open Skill Editor: Not Bound salvo debug/admin.
- Weapon Innate Skill: `Left Alt` o tecla segura, pendiente de prueba.

Notas:

- La tecla manual de Epic Fight debe quedar sin asignar.
- Epic Fight deberia controlarse por item/autoswitch, no por tecla manual.
- Mago y Pistolero deben quedar en Mining/Vanilla Mode por Epic Tweaks cuando usen mano vacia, spellbook o TaCZ.
- Air / `minecraft:air` debe estar como Preferred Tool en Epic Fight Item Preferences para que mano vacia sea herramienta/vanilla.
- `canSwitchPlayerMode` debe quedar en `true`; no usar `false` porque tambien bloquea al Guerrero.

### JEI

- Show Recipe: `U`
- Show Uses: `Y`

### Punchy

- Punchy menu/config: `F8`
- Punchy sigue instalado para acciones normales.
- Blacklist manual recomendada:
  - `^tacz:.*$`
  - `^simplyswords:.*$`
  - `^epicfight:.*$`
  - `^epicfight_nightfall:.*$`
  - `^efn:.*$`
  - `^nightfall:.*$`
  - `^epicskills:.*$`
  - `^epic_fight_avalon:.*$`
  - `^invincible:.*$`
  - `^irons_spellbooks:.*$`
  - `^traveloptics:.*$`

### Otros

- JourneyMap fullscreen: `J`
- Minimap presets: mantener default si no choca.
- Oculus Reload Shaders: `F10` o Unbound
- Shoulder Surfing Toggle Perspective: tecla libre, evitando `R`, `G`, `J`, `K`, `Z`, `Left Alt`
- Shoulder Surfing Swap Shoulder: tecla libre o boton extra de raton

## Default Options

- Default Options y Balm ya estan instalados.
- No se crea `options.txt` raiz.
- No se crean archivos de `config/defaultoptions/` manualmente.
- Exportar keybinds finales solo desde Prism, despues de probarlos:
  `/defaultoptions saveKeys`
  o:
  `/defaultoptions saveAll`
- Solo commitear `config/defaultoptions/keybindings.txt` si fue generado por el mod en una instancia probada.
- Si `/defaultoptions saveAll` no existe en esta version, probar `/defaultoptions saveKeys`.
- No crear `options.txt` raiz ni inventar `config/defaultoptions/keybindings.txt`.

## Checklist Prism

1. Abrir Controls.
2. Buscar `Reload`.
3. Dejar `R` solo en TaCZ Reload.
4. Buscar `Spell Wheel`.
5. Poner Iron's Spells Spell Wheel Hold en `Z`.
6. Buscar `Battle`.
7. Poner Epic Fight Toggle Battle/Mining Mode en Not Bound.
8. Buscar `Skill Tree`.
9. Poner Epic Fight Skill Tree GUI en `K`.
10. Poner Epic Fight Weapon Innate Skill en `Left Alt`.
11. Mover JEI Show Recipe a `U` y Uses a `Y` si `R` interfiere.
12. Confirmar Punchy en `F8`.
13. Confirmar Oculus Reload Shaders en `F10` o Unbound.
14. Probar Pistolero: apuntar, disparar y recargar con Glock 17.
15. Probar Mago: abrir Spell Wheel con `Z` y lanzar hechizo.
16. Probar Guerrero: confirmar autoswitch de Epic Tweaks con arma.
17. Ejecutar `/gamerule canSwitchPlayerMode true` en el mundo de prueba.
18. Configurar Air / `minecraft:air` como Preferred Tool en Epic Fight Item Preferences.
19. Cuando todo este validado, exportar con `/defaultoptions saveKeys` o `/defaultoptions saveAll`.
