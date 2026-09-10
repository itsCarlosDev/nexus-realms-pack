# Pack 27 — progresión global permanente

## Pack 27.0: arquitectura conservada

- Se conserva el grupo `Nexus Realms` y los cuatro IDs de hito global conectados a `/nexus_era request`.
- `Progresión Global`, que era una sucesión de checkmarks de prueba, se sustituye por `00 — Comienzo`.
- Se conserva `Senda del Metal` y su ID de capítulo; se elimina el reward heredado `/nexus_specialization unlock metallurgist` porque Allomancy se activa con Guerrero.
- No se añade ningún temporizador, stage ni sistema de clase paralelo.

## Flujo principal

1. `00 — Comienzo`: hitos, quórum, elección de clase y preparación.
2. `01 — Era I: Supervivencia`: asentamiento, despensa, herramientas, defensa, exploración inicial y Overworld.
3. `02 — Era II: Expansión`: diamante, encantamientos, apertura del Nether, alquimia y progreso intermedio.
4. `03 — Era III: Arcano e Industria`: apertura del Aether, Create, Create Addition, progreso avanzado y bifurcación del Mago.
5. `04 — Era IV: El Nexus`: apertura del End y Otherside, netherite, maestría de clase, Wither y cierre principal.

Las quests solicitan exactamente la siguiente Era con `/nexus_era request 1..4`.
El hito se registra incluso con un solo jugador. La petición persiste hasta que no
haya una Horda global activa y se reúna el quórum; entonces avanza automáticamente,
sin repetir ni reclamar otra vez la quest. No hay días mínimos ni caducidad.

La fuente única es `config/nexuscore/eras.json`, también embebida en Nexus Core
durante `processResources`. `progression.required_online_players` acepta un entero
entre 1 y 2147483647 y usa 3 si falta o es inválido, con aviso en el log. Se carga
con los scripts de servidor. Una definición de Era inválida bloquea el avance
automático, conservando el hito pendiente.

El servidor cuenta su lista actual de jugadores: excluye `FakePlayer` y
espectadores; incluye humanos Survival, Adventure y Creative, sin condiciones
de distancia, dimensión, AFK o finalización personal de la quest. El mismo conteo
alimenta KubeJS y el panel mediante la sincronización existente cada 10 ticks.
No se persiste el conteo online ni se reutilizan los participantes de Horda.

### Mundos existentes y administración

La normalización idempotente `nexusProgressionSchemaVersion = 1` conserva
`nexusEra`, eleva el hito al menos hasta la Era persistida y preserva un pending
de exactamente la siguiente Era como hito solicitado. Un pending ya alcanzado
se limpia; uno que salta Eras se descarta con error en el log, sin avanzar ni
borrar hitos válidos. Una Era III permanece III; pending IV espera solo las
condiciones de avance. Las claves NBT temporales antiguas quedan inertes.

Se conservan `/nexus_era get`, `request`, `advance`, `set` y `sync`. `advance`
solicita el siguiente hito con las reglas normales; `set` es el override
administrativo explícito. `/nexus_era reset_production confirm` mantiene permiso
4, confirmación y veto durante una Horda activa: reinicia progresión e historial
de hordas de prueba. Es una operación destructiva manual, nunca una migración.
La antigua API de campaña temporal se retira.

History Stages conserva sus cuatro IDs globales y sigue siendo la autoridad de
restricciones. Se sincroniza al cambiar la Era y una vez tras cargar, con demora
de 100 ticks, usando la Era persistida. Fallos de sincronización se registran;
`/nexus_era sync` permite repetirla después de corregirlos.

### Calendario de hordas y despliegue

Los días de Minecraft de The Hordes se conservan: `getDayTime() / 24000`,
primera horda desde día 15, gracia de 2 días, cooldown de 10 días y ventana
nocturna existente. Se conservan recovery, participantes, tablas, recompensas y
protección frente a hordas activas. El inicio y la pausa de la antigua campaña
ya no bloquean el scheduler; no se introduce otra pausa. Era 0 sigue sin hordas.

Nexus Core 0.6.44 usa protocolo de progresión 8: servidor y clientes deben
actualizar juntos. El panel muestra hito, jugadores elegibles/requeridos y la
espera por jugadores o Horda. El calendario de hordas sigue visible.

Validación offline: `node tools/validate_nexus_progression.cjs` comprueba las
transiciones con dobles de servidor, sin ejecutar Minecraft ni Rhino.
Pendiente de runtime: conservar Era III y pending tras reinicio, transición
1/3 → 2/3 → 3/3, FakePlayer y espectador reales, UI, reconciliación de History
Stages, espera/liberación de una Horda y ausencia de errores KubeJS/Rhino.
Not runtime-tested.

## Pack 27.1: profundidad añadida

### Ramas de clase

- Guerrero: guja de hierro, entrenamiento defensivo, mandoble de diamante, arma rúnica, equipo Nightfall y mandoble de netherite.
- Mago base: esencia, tinta y estaciones de trabajo compartidas antes de elegir senda.
- Arcanista: grimorio, runa, orbe, bastón, armadura mágica y grimorio final.
- Guerrero — Senda del Metal: grinder, vial, ocho metales básicos, reservas, equipo propio, ocho metales avanzados, Lerasium y paso manual Mistborn.
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
