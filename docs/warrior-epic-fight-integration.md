# Pack 16.5 - Warrior Epic Fight Integration

## Objetivo

Usar Epic Fight como sistema principal del Guerrero.

## Mods añadidos

- Epic Fight
- EpicFight-Nightfall
- Epic Fight: Skill Tree
- Epic Fight - Invincible Lib
- Epic Fight - Avalon
- AAA Particles

## Mods sustituidos

- Better Combat eliminado.
- Combat Roll eliminado.
- Simply Swords se mantiene.
- `FA: Player Extension Compat` eliminado porque instala `fape_compat-0.5.jar` y depende de mixins de Better Combat.
- `FA: Player Extension X Better Combat` eliminado porque es un resource pack de compatibilidad exclusivo para Better Combat.
- Pack 16.5.1 corrige el crash de arranque `fape_compat.mixins.json:BCAttackAdjustmentMixin` causado por la ausencia de Better Combat.

## Arquitectura de clases

Guerrero:

- Epic Fight
- EpicFight-Nightfall
- Skill Tree
- Simply Swords

Mago:

- Iron's Spells base
- T.O Magic permanece rechazado/postergado hasta validar una opcion mas limpia

Pistolero:

- TaCZ
- Shoulder Surfing

## Limitacion

Epic Fight se carga globalmente.
No se puede cargar solo para Guerrero.
La separacion se hace mediante:

- kits;
- tags;
- restricciones KubeJS;
- quests;
- progresion.

## Restricciones KubeJS

`kubejs/server_scripts/nexus_class_restrictions.js` bloquea usos de item por namespace cuando el jugador no tiene el tag de clase correcto.

Guerrero:

- `simplyswords:*`
- `epicfight:*`
- `epicfight_nightfall:*`
- `efn:*`
- `nightfall:*`

Mago:

- `irons_spellbooks:*`
- `traveloptics:*` como future-proofing, aunque T.O Magic no esta instalado.

Pistolero:

- `tacz:*`

La primera version usa eventos de click derecho de item. El bloqueo de ataques basicos, click izquierdo o acciones internas de mods puede necesitar eventos/configuracion adicional si KubeJS no los expone de forma fiable.

Pack 16.5.3 refuerza esta capa:

- `epicskills:*`, `epic_fight_avalon:*` e `invincible:*` tambien quedan reservados al Guerrero.
- `PlayerEvents.tick` revisa mano principal/offhand de forma ligera cada ~1 segundo por jugador.
- El guardia no borra ni mueve items; solo avisa y apoya el bloqueo de eventos.
- `/nexus_class_debug` permite comprobar el namespace y la clase requerida del item en mano.
- Battle Mode de Epic Fight sigue siendo una limitacion tecnica: no se encontro una API fiable desde KubeJS `server_scripts` para forzarlo solo a Guerrero.

Pack 16.5.4 mejora la UX:

- Los avisos de restriccion usan actionbar y un sonido corto de nota cuando los comandos vanilla funcionan.
- El chat solo queda como fallback con cooldown.
- Jugadores sin clase reciben un aviso espaciado para elegir clase, no spam por el guardia de mano.
- Se reviso el repo buscando config de Epic Fight para unarmed/empty-hand, pero no hay archivo versionado claro para desactivar ese comportamiento sin inventar formato.
- Guerrero mantiene Epic Fight con armas; Mago y Pistolero quedan mitigados por bloqueo de items/progresion hasta encontrar API/config fiable para Battle Mode.

## Pack 16.5.2 - Starter kit backend fix

- El fallo de entrega de kits no venia de Epic Fight, IDs ni NBT.
- La causa era `TypeError: redeclaration of var count` en el script de seleccion de clase.
- `nexusCreateKitItem` y `nexusGiveKitItem` usan `itemCount` para evitar la redeclaracion en Rhino/KubeJS.
- El fallback automatico de comandos por chat se elimina; FancyMenu queda como selector principal.
- `/nexus_class_help` queda disponible como ayuda manual.
- `/nexus_givekit <class> [player]` queda disponible para pruebas de operador.

## Punchy

Punchy se mantiene.
Blacklist manual recomendada:

- `^tacz:.*$`
- `^simplyswords:.*$`
- `^epicfight:.*$`
- `^epicfight_nightfall:.*$`
- `^efn:.*$`
- `^nightfall:.*$`

## Keybinds recomendadas

- Epic Fight Battle Mode: X
- TaCZ Reload: R
- Punchy Menu: F8
- JourneyMap: J
- Oculus Reload Shaders: F10 o Unbound
- Epic Fight Dodge/Skill: revisar manualmente

## Riesgos

- Epic Fight puede afectar TaCZ.
- Epic Fight puede afectar Punchy.
- Epic Fight puede afectar magia.
- Hay que probar Pistolero disparando.
- Hay que probar Mago casteando.
- Hay que probar Guerrero en Battle Mode.

## Checklist Prism

1. Arrancar instancia.
2. Crear mundo nuevo.
3. Elegir Guerrero.
4. Probar iron glaive.
5. Activar Battle Mode de Epic Fight.
6. Abrir Skill Tree.
7. Probar arma Simply Swords.
8. Resetear clase.
9. Elegir Mago.
10. Probar Copper Spell Book.
11. Confirmar que Epic Fight no rompe magia.
12. Resetear clase.
13. Elegir Pistolero.
14. Probar Taurus 9 y municion 9mm.
15. Confirmar que disparar no activa ataques raros.
16. Probar Shoulder Surfing.
17. Revisar latest.log.
