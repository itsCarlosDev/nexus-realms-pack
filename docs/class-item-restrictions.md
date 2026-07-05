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
- `PlayerEvents.tick` ejecuta un guardia ligero de mano principal/offhand cada ~1 segundo por jugador.
- `EntityEvents.hurt` bloquea daño melee directo cuando el atacante es un jugador y el caso es seguro de identificar.

El guardia no borra items, no los tira al suelo y no intenta moverlos para evitar duplicaciones o perdidas. Solo avisa y bloquea usos cuando hay evento disponible.

## Pack 16.5.5 - Bloqueo de melee sin arma

- Mago, Pistolero y jugadores sin clase no deberian hacer daño melee directo con mano principal vacia.
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
- KubeJS mantiene restricciones de items, avisos actionbar y bloqueo de dano unarmed; no controla la tecla de Battle Mode como solucion principal.

## Pack 16.5.4 - UX de restricciones

- Los avisos de restriccion usan `title <player> actionbar` cuando el comando vanilla funciona.
- Se reproduce un sonido corto con `playsound minecraft:block.note_block.bass`.
- Si actionbar falla, hay fallback a chat con cooldown.
- Immersive Messages API/UI esta instalado en el pack, pero esta capa no depende de el porque no hay comando/config versionado claro en el repo.
- Jugadores sin clase no reciben spam de restricciones cada segundo; solo ven `Elige una clase para activar tu equipo.` con cooldown largo.
- Jugadores con clase e item incorrecto tienen cooldown minimo de 5 segundos por jugador.
- El guardia de mano/offhand sigue ejecutandose de forma ligera, pero no borra, mueve ni tira items.

## Battle Mode de Epic Fight

No se encontro una API fiable desde `server_scripts` de KubeJS para forzar o desactivar Battle Mode de Epic Fight.

Limitacion actual:

- Battle Mode puede seguir siendo un estado/keybind cliente.
- La mitigacion actual bloquea items, skills/progresion por namespace y quests.
- Pack 16.5.5 tambien cancela daño melee/unarmed para no-Guerreros, pero no garantiza apagar la animacion cliente.
- Pack 16.5.6 delega el control de estado a Epic Tweaks. El comando `/epicfight mode mining <player>` queda solo como fallback desactivado.
- Si Epic Fight expone una API o comando fiable mas adelante, se puede agregar un bloqueo directo para no-Guerreros.
- No hay config versionada clara en este repo para desactivar unarmed/empty-hand de Epic Fight sin inventar formato.
- Resultado actual recomendado: Mago y Pistolero usan Punchy/brazos normales como objetivo de diseno, pero la separacion tecnica se apoya en items/progresion hasta encontrar una config/API fiable.

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

- clase detectada;
- tags actuales;
- item en mano principal;
- namespace;
- clase requerida;
- si el item estaria permitido o bloqueado.
- si Epic Fight Mining Mode command fallback esta activo;
- intervalo del fallback si se activa;
- si el fallback por comando esta habilitado;
- starter oficial del Pistolero: `GunId tacz:glock_17`.
