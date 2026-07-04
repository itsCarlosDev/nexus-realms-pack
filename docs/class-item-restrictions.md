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

El guardia no borra items, no los tira al suelo y no intenta moverlos para evitar duplicaciones o perdidas. Solo avisa y bloquea usos cuando hay evento disponible.

## Battle Mode de Epic Fight

No se encontro una API fiable desde `server_scripts` de KubeJS para forzar o desactivar Battle Mode de Epic Fight.

Limitacion actual:

- Battle Mode puede seguir siendo un estado/keybind cliente.
- La mitigacion actual bloquea items, skills/progresion por namespace y quests.
- Si Epic Fight expone una API o comando fiable mas adelante, se puede agregar un bloqueo directo para no-Guerreros.

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
