# Pack 27 — campaña principal

## Pack 27.0: arquitectura conservada

- Se conserva el grupo `Nexus Realms` y los cuatro IDs de hito global conectados a `/nexus_era request`.
- `Progresión Global`, que era una sucesión de checkmarks de prueba, se sustituye por `00 — Comienzo`.
- Se conserva `Senda del Metal`, su ID de capítulo y el reward `/nexus_specialization unlock metallurgist`.
- No se añade ningún temporizador, stage ni sistema de clase paralelo.

## Flujo principal

1. `00 — Comienzo`: campaña, calendario, elección de clase y preparación.
2. `01 — Era I: Supervivencia`: asentamiento, despensa, herramientas, defensa, exploración inicial y Overworld.
3. `02 — Era II: Expansión`: diamante, encantamientos, apertura del Nether, alquimia y progreso intermedio.
4. `03 — Era III: Arcano e Industria`: apertura del Aether, Create, Create Addition, progreso avanzado y bifurcación del Mago.
5. `04 — Era IV: El Nexus`: apertura del End y Otherside, netherite, maestría de clase, Wither y cierre principal.

Las quests solicitan una era mediante el puente Nexus. El calendario global decide si el avance es inmediato o queda pendiente hasta los días 1, 7, 14 y 21.

## Pack 27.1: profundidad añadida

### Ramas de clase

- Guerrero: guja de hierro, entrenamiento defensivo, mandoble de diamante, arma rúnica, equipo Nightfall y mandoble de netherite.
- Mago base: esencia, tinta y estaciones de trabajo compartidas antes de elegir senda.
- Arcanista: grimorio, runa, orbe, bastón, armadura mágica y grimorio final.
- Metalomante: grinder, vial, ocho metales básicos, reservas, equipo propio, ocho metales avanzados, Lerasium y paso manual Mistborn.
- Pistolero: Glock 17, precisión, MP5A5, M4A1, largo alcance y M107. Las tareas de dominio son manuales porque el `GunId` vive en NBT y no se fuerza una coincidencia frágil.

Las ramas son opcionales respecto al flujo global. Ninguna clase bloquea la finalización de una era.

### Exploración y hordas

- Cartografía, océano, búsqueda de fortaleza y End usan objetos verificables.
- La preparación de hordas es informativa y de suministros.
- La finalización automática de una horda queda aplazada: el scheduler no expone un objetivo estable a FTB Quests y no se añaden listeners.

### Bosses verificados

| Era | Boss | ID |
| --- | --- | --- |
| II | Ferrous Wroughtnaut | `mowziesmobs:ferrous_wroughtnaut` |
| II | Yeti | `block_factorys_bosses:yeti` |
| III | Gauntlet | `bosses_of_mass_destruction:gauntlet` |
| III | Maze Mother | `aquamirae:maze_mother` |
| III | Kraken | `block_factorys_bosses:kraken` |
| IV | Obsidilith | `bosses_of_mass_destruction:obsidilith` |
| IV | Ender Guardian | `cataclysm:ender_guardian` |
| IV | Ignis | `cataclysm:ignis` |

La cadena es opcional y utiliza la tarea nativa `kill` de FTB Quests. El Wither sí forma parte del cierre global de Era IV.

## Rewards

- Comida o materiales auxiliares en cantidades pequeñas.
- Experiencia entre 2 y 6 niveles según el hito.
- No se entregan armas, armaduras, grimorios, poderes, Lerasium ni equipo endgame.
- No se entregan municiones o accesorios TaCZ con NBT.

## Pendiente posterior

- Condiciones visuales de clase/especialización dentro de FTB Quests.
- Detección estable de completar una horda.
- Tareas TaCZ con `GunId` si se valida una comparación NBT débil y estable.
- Pergaminos, curios y contenido mágico dependiente de NBT.
- Wither Reincarnated: no se añade hasta verificar un ID de entidad utilizable.
- Bosses adicionales y presentación visual final.
