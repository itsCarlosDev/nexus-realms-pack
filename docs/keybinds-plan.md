# Nexus Realms Keybind Plan

## Objetivo

Evitar conflictos entre TaCZ, Iron's Spells y Epic Fight.

Regla principal:

- `R` debe quedar solo para TaCZ Reload.
- `R` no debe abrir Spell Wheel.
- `R` no debe alternar Battle/Mining Mode.

## Plan recomendado

### TaCZ

- Reload: `R`
- Aim: Right Mouse Button
- Fire: Left Mouse Button
- Attachments: `F4`

### Iron's Spells

- Spell Wheel Hold: `Z`
- Cast Spell: mantener default si no choca.
- Next/Previous Spell: mantener defaults si no chocan.

### Epic Fight

- Toggle Battle/Mining Mode: `G`
- Skill Tree GUI: `K`
- Weapon Innate Skill: `Left Alt`
- Open Configuration Screen: Not Bound
- Open Skill Editor: Not Bound salvo debug/admin.

Notas:

- Guerrero puede aprovechar `G` para alternar Battle/Mining Mode.
- Mago y Pistolero son forzados a Mining Mode por KubeJS cada 20 ticks.
- Si Mago/Pistolero activan Battle Mode visualmente, el servidor lo corrige periodicamente.

### JEI

- Show Recipe: `U` si `R` interfiere con TaCZ.
- Show Uses: `Y`
- Si JEI solo usa `R` dentro de GUI y no rompe TaCZ, se puede revisar en Prism, pero el objetivo final es que `R` no tenga conflictos de combate.

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
- Oculus Reload Shaders: `F10` o Unbound
- Shoulder Surfing Toggle Perspective: tecla libre, evitando `R`, `G`, `J`, `K`, `Z`, `Left Alt`
- Shoulder Surfing Swap Shoulder: tecla libre o boton extra de raton

## Default Options

- Default Options y Balm ya estan instalados.
- No se crea `options.txt` raiz.
- No se crean archivos de `config/defaultoptions/` manualmente.
- Exportar keybinds finales solo desde Prism, despues de probarlos:
  `/defaultoptions saveKeys`
- Solo commitear `config/defaultoptions/keybindings.txt` si fue generado por el mod en una instancia probada.

## Checklist Prism

1. Abrir Controls.
2. Buscar `Reload`.
3. Dejar `R` solo en TaCZ Reload.
4. Buscar `Spell Wheel`.
5. Poner Iron's Spells Spell Wheel Hold en `Z`.
6. Buscar `Battle`.
7. Poner Epic Fight Toggle Battle/Mining Mode en `G`.
8. Buscar `Skill Tree`.
9. Poner Epic Fight Skill Tree GUI en `K`.
10. Poner Epic Fight Weapon Innate Skill en `Left Alt`.
11. Mover JEI Show Recipe a `U` y Uses a `Y` si `R` interfiere.
12. Confirmar Punchy en `F8`.
13. Confirmar Oculus Reload Shaders en `F10` o Unbound.
14. Probar Pistolero: apuntar, disparar y recargar con Glock 17.
15. Probar Mago: abrir Spell Wheel con `Z` y lanzar hechizo.
16. Probar Guerrero: alternar Epic Fight con `G` y abrir Skill Tree con `K`.
17. Cuando todo este validado, exportar con `/defaultoptions saveKeys`.
