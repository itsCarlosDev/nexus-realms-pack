# Class item restrictions

## Objetivo

Separar los sistemas principales de clase con KubeJS:

- Guerrero: Epic Fight, EpicFight-Nightfall, Skill Tree, Avalon, Invincible Lib y Simply Swords.
- Mago: Iron's Spells y TravelOptics si se reintroduce en el futuro.
- Pistolero: TaCZ.

## Fuente de verdad

Los tags siguen viniendo del selector KubeJS:

- `nexus_class_warrior`
- `nexus_class_mage`
- `nexus_class_gunslinger`

FTB Quests, FancyMenu y otros sistemas no deben asignar clase directamente.

## Namespaces restringidos

Solo Guerrero:

- `simplyswords:*`
- `epicfight:*`
- `epicfight_nightfall:*`
- `efn:*`
- `nightfall:*`
- `epicskills:*`
- `epic_fight_avalon:*`
- `invincible:*`

Solo Mago:

- `irons_spellbooks:*`
- `traveloptics:*`

Solo Pistolero:

- `tacz:*`

## Arquitectura actual

- KubeJS sigue siendo la fuente de clase, selector, tags, persistentData, FancyMenu y kits.
- NexusCore (`nexuscore`) es el mini-mod Forge que bloquea uso y dano real.
- TaCZ JS expone eventos KubeJS mediante `TimelessGunEvents`; `nexus_tacz_restrictions.js` cancela disparo, recarga, melee y dano de arma para no-Pistoleros.
- KubeJS mantiene `/nexus_class_debug` y `/nexus_inventory_debug` como diagnostico solamente.
- GameStages/ItemStages quedan reservados para progresion por eras, no para clases en esta fase.

El guardia no borra, no dropea y no mueve items. Si un item restringido esta en mano, NexusCore cancela su uso y dano. El item puede seguir visible en mano, pero no debe servir para disparar, castear o hacer melee.

# Safe hand enforcement

Items from another class may exist in the inventory and may remain visually in main hand/offhand.

If a wrong-class item is detected in main hand/offhand:
- NexusCore cancels use/damage through Forge events.
- KubeJS does not move the item.
- The item is never deleted.
- NBT is preserved because no inventory mutation happens.

This is required because some mods, especially TaCZ and Epic Fight, may process combat outside simple right-click handlers.

TaCZ is handled at two layers:
- `nexus_tacz_restrictions.js` cancels native TaCZ events: `gunShoot`, `gunFire`, `gunReload`, `gunMelee`, `gunFireSelect`, `gunFinishReload` and `entityHurtByGunPre`.
- NexusCore remains the Forge fallback for generic right click, combat and `tacz:*` bullet damage.

The enforcement must:
- block use/damage in NexusCore;
- block native TaCZ gun events for non-Gunslingers;
- avoid all KubeJS inventory movement;
- avoid `player.give`, automatic drop fallback and vanilla `/item replace` hand enforcement;
- never delete or duplicate the item.

`/nexus_inventory_debug` may still read slot data for diagnosis, but that output is not used for enforcement decisions.

The active hand enforcement namespaces are:
- Warrior only: `simplyswords`, `epicfight`, `epicfight_nightfall`, `efn`, `nightfall`, `epicskills`, `epic_fight_avalon`, `invincible`.
- Mage only: `irons_spellbooks`, `traveloptics`.
- Gunslinger only: `tacz`.

## Unarmed melee hotfix

- Non-warrior unarmed melee against entities is blocked by NexusCore.
- This does not disable Punchy for normal actions such as mining, building, fishing or vanilla interactions.
- Mago and Pistolero can keep empty-hand utility actions, but cannot damage entities with empty-hand melee.
- Guerrero remains allowed to use unarmed/Epic Fight melee.
- The block runs on Forge combat/damage events; it does not cancel block left-click, block interaction, fishing, doors, chests or normal item use.
- Epic Tweaks remains the Battle/Mining Mode controller. KubeJS does not re-enable the `/epicfight mode mining` tick fallback.

## Pack 16.11 - QA final de mano vacia

- Pack 16.10 preparo la arquitectura final; Pack 16.11 cierra QA y pulido.
- El bloqueo de melee sin arma para no-Guerreros queda activo con:
  `NEXUS_BLOCK_NON_WARRIOR_UNARMED_MELEE = true`
- Mago y Pistolero deben conservar mano vacia, Punchy y acciones vanilla normales.
- NexusCore no cancela interacciones vanilla normales con mano vacia.
- La solucion principal para evitar Battle Mode en mano vacia es Air / `minecraft:air` como Preferred Tool, Epic Tweaks autoswitch/enforce y Toggle Not Bound.
- El bloqueo unarmed solo cancela dano a entidades; Punchy se conserva para acciones normales.

## Pack 16.5.5 - Bloqueo de melee sin arma historico

- Mago, Pistolero y jugadores sin clase no debian hacer daño melee directo con mano principal vacia en el experimento original.
- Guerrero conserva el daño unarmed/Epic Fight.
- Si un jugador ataca con un item que pertenece a otra clase, el daño tambien se cancela en la capa de daño.
- Los mensajes usan actionbar/sonido con cooldown:
  - Mago: `✨ Mis manos canalizan magia, no golpes.`
  - Pistolero: `🔫 Sin arma no hay disparo. Mantén la distancia.`
  - Sin clase: `Elige una clase para combatir.`
- Esta capa no busca bloquear hechizos de Iron's Spells, disparos/proyectiles de TaCZ, daño ambiental, caidas, fuego ni daño de mobs.

## Pack 16.5.6 - Epic Tweaks mode enforcement

- Epic Tweaks se anade como controlador principal de Battle/Mining Mode.
- La solucion de `/gamerule canSwitchPlayerMode false` queda descartada porque bloquea tambien al Guerrero.
- `canSwitchPlayerMode` debe quedar en `true` para que Epic Tweaks pueda hacer autoswitch/enforce.
- Config deseada de Epic Tweaks tras generar su archivo en Prism:
  - `autoswitch_mode = true`
  - `enforce_mode = true`
  - `filter_animation_first_person = true`
- El fallback KubeJS por comando queda desactivado por defecto con:
  `NEXUS_FORCE_EPICFIGHT_MINING_WITH_COMMAND = false`
- KubeJS mantiene restricciones de items y avisos actionbar; no controla la tecla de Battle Mode como solucion principal.

## Pack 16.10 - Epic Fight Air Tool and Mode Enforcement

- Arquitectura final: KubeJS bloquea items por clase y Epic Tweaks controla Battle/Mining Mode por preferencias de item.
- `canSwitchPlayerMode` debe quedar en `true`; `false` no sirve porque tambien bloquea al Guerrero.
- Air / `minecraft:air` debe configurarse desde la UI de Epic Fight como Preferred Tool.
- Epic Fight Toggle Battle/Mining Mode debe quedar Not Bound con Default Options cuando Prism genere `config/defaultoptions/keybindings.txt`.
- Mago y Pistolero deben mantener mano vacia, spellbook y TaCZ en Mining/Vanilla Mode.
- Guerrero debe entrar en Battle Mode automaticamente al equipar armas compatibles.
- Punchy se conserva para construccion, mineria, pesca y acciones vanilla normales.
- No se versionan configs inventadas de Epic Fight, Epic Tweaks ni Default Options.
- Pack 16.11 versiona solo `config/epictweaks-client.toml` porque fue generado en Prism y sus valores coinciden con el objetivo.

## Pack 16.5.4 - UX de restricciones

- Los avisos de restriccion usan `title <player> actionbar` cuando el comando vanilla funciona.
- Se reproduce un sonido corto con `playsound minecraft:block.note_block.bass`.
- Si actionbar falla, hay fallback a chat con cooldown.
- Immersive Messages API/UI esta instalado en el pack, pero esta capa no depende de el porque no hay comando/config versionado claro en el repo.
- Jugadores sin clase no reciben spam de restricciones cada segundo; solo ven `Elige una clase para activar tu equipo.` con cooldown largo.
- Jugadores con clase e item incorrecto tienen cooldown minimo de 5 segundos por jugador.
- El guardia de mano/offhand sigue ejecutandose de forma ligera, pero no borra, mueve ni tira items.

## Battle Mode de Epic Fight

La solucion final no es forzar comandos desde KubeJS. El estado Battle/Mining queda delegado a Epic Tweaks y a las preferencias de item de Epic Fight:

- Air / `minecraft:air` debe ser Preferred Tool para que mano vacia sea herramienta/vanilla.
- Epic Fight Toggle Battle/Mining Mode debe quedar Not Bound para evitar cambios manuales accidentales.
- `canSwitchPlayerMode=true` permite que Epic Tweaks haga autoswitch/enforce.
- El comando `/epicfight mode mining <player>` queda solo como fallback apagado.
- Si las configs generadas no existen, Carlos debe crearlas desde Prism y versionarlas despues de validarlas.

## Punchy

No se encontro una config versionada clara de Punchy en `config/` o `defaultconfigs/`.

Blacklist manual recomendada desde Punchy/F8:

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

## Debug

Comando:

- `/nexus_class_debug`

Muestra:

- clase detectada por `persistentData`;
- si `nexus_class_chosen` esta activo;
- clase detectada;
- tags actuales;
- item en mano principal;
- namespace;
- NBT resumido;
- GunId si el item en mano es TaCZ;
- clase requerida;
- si el item estaria permitido o bloqueado.
- si la mano principal esta vacia;
- si hand enforcement esta activo;
- main hand/offhand namespace;
- main hand/offhand clase requerida;
- main hand/offhand allowed;
- main hand/offhand action;
- selected hotbar slot;
- enforcement owner: `nexuscore`;
- strategy: `forge_event_enforcer_no_inventory_movement`;
- si el bloqueo de melee sin arma no-Guerrero esta activo;
- si el resultado final bloquearia melee sin arma contra entidades;
- si Epic Fight Mining Mode command fallback esta activo;
- intervalo del fallback si se activa;
- si el fallback por comando esta habilitado;
- starter oficial del Pistolero: `GunId tacz:glock_17`.
- nota de que Epic Tweaks es el controlador esperado de Battle/Mining Mode.
- nota de que Air / `minecraft:air` debe ser Preferred Tool.
- nota de que Epic Fight Toggle Battle/Mining Mode debe ser Not Bound.

## QA commands

- `/nexus_class_status [player]` muestra el estado de clase sin modificar datos.
- `/nexus_testkit <class> [player]` entrega un kit de prueba sin cambiar clase.
- `/nexus_resetclass_clean <player>` reinicia clase y limpia inventario para pruebas controladas.

## Progresion

- FTB Quests sera el frontend de progresion por clase.
- KubeJS sigue siendo la fuente de verdad para clase, tags, kits y restricciones por item.
- No se crean quests definitivas en Pack 16.8.
- Epic Tweaks y Epic Fight Item Preferences son la solucion final de Battle/Mining Mode.
