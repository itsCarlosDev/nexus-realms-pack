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

## Eventos usados

- `ItemEvents.rightClicked` bloquea el uso de item cuando KubeJS recibe el evento.
- `PlayerEvents.tick` ejecuta hand enforcement de mano principal/offhand cada tick por jugador.
- `EntityEvents.hurt` bloquea daño con items restringidos cuando el atacante es un jugador y el caso es seguro de identificar.
- `EntityEvents.hurt` tambien bloquea melee sin arma de no-Guerreros contra entidades.

El guardia no borra items. Si un item restringido esta en mano, intenta moverlo con comandos vanilla `item replace ... from entity ...` hacia un slot vacio de inventario. Si no encuentra hueco seguro o el comando no confirma exito, deja el item donde esta y cancela uso/dano para que no sirva.

# Safe hand enforcement

Items from another class may exist in the inventory, but they cannot remain in main hand or offhand.

If a wrong-class item is detected in main hand/offhand:
- KubeJS attempts to move it to the inventory with vanilla `/item replace entity ... from entity ...`.
- If no safe inventory slot exists, KubeJS cancels use/damage and leaves the item in hand.
- The item is never deleted.
- NBT is preserved by copying from `weapon.mainhand` or `weapon.offhand`; KubeJS does not reconstruct an ItemStack in JS.

This is required because some mods, especially TaCZ and Epic Fight, may process combat outside simple right-click handlers.

Wrong-class items are not returned with `player.give` because that can place the item back into the selected hotbar slot.

The enforcement must:
- use command-based movement only;
- move the item only to empty `inventory.0..inventory.26` slots after checking NBT `Inventory[{Slot:9b..35b}]`;
- refuse use/damage with `command_move_failed_no_empty_slot` if no slot is available or the command cannot confirm success;
- never delete or duplicate the item.

Safe inventory movement no longer depends on KubeJS inventory APIs such as `getItem`, `setItem`, selected hotbar slot, or `stack.empty` checks. `/nexus_inventory_debug` may still read slot data for diagnosis, but that output is not used for enforcement decisions.

The active hand enforcement namespaces are:
- Warrior only: `simplyswords`, `epicfight`, `epicfight_nightfall`, `efn`, `nightfall`, `epicskills`, `epic_fight_avalon`, `invincible`.
- Mage only: `irons_spellbooks`, `traveloptics`.
- Gunslinger only: `tacz`.

## Unarmed melee hotfix

- Non-warrior unarmed melee against entities is blocked by KubeJS.
- This does not disable Punchy for normal actions such as mining, building, fishing or vanilla interactions.
- Mago and Pistolero can keep empty-hand utility actions, but cannot damage entities with empty-hand melee.
- Guerrero remains allowed to use unarmed/Epic Fight melee.
- The block only runs on entity damage through `EntityEvents.hurt`; it does not cancel block left-click, block interaction, fishing, doors, chests or normal item use.
- Epic Tweaks remains the Battle/Mining Mode controller. KubeJS does not re-enable the `/epicfight mode mining` tick fallback.

## Pack 16.11 - QA final de mano vacia

- Pack 16.10 preparo la arquitectura final; Pack 16.11 cierra QA y pulido.
- El bloqueo de melee sin arma para no-Guerreros queda activo con:
  `NEXUS_BLOCK_NON_WARRIOR_UNARMED_MELEE = true`
- Mago y Pistolero deben conservar mano vacia, Punchy y acciones vanilla normales.
- KubeJS no cancela interacciones vanilla normales con mano vacia.
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
- strategy: `command_based_item_replace`;
- last enforcement result: `moved_by_command_inventory_*`, `command_move_failed_no_empty_slot`, or `kept_in_hand`;
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
