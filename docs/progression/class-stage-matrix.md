# Matriz de clases, stages y contenido

La clase guardada en `player.persistentData.nexus_class` continúa siendo la fuente de verdad. History Stages 5.4.0 es el único motor de restricciones. Pack 30.4 completa la cobertura de clase de los GunIds TaCZ locales sin cambiar sus estadísticas ni asignar nuevos tiers de Era.

| Clase | Stage individual actual | Era I | Era II | Era III | Era IV |
| --- | --- | --- | --- | --- | --- |
| Guerrero | `nexus_class_warrior` | Epic Fight/Simply Swords de hierro y movesets iniciales | familias diamond y skillbooks básicos | runic, Nightfall y combate avanzado | netherite y arsenal melee endgame |
| Mago | `nexus_class_mage` | grimorios y estaciones iniciales | grimorios, runas, curios y armadura intermedia | grimorios/staffs/armaduras avanzados | legendary/netherite y endgame mágico |
| Pistolero | `nexus_class_gunslinger` | pistolas/revólveres de servicio | SMG, escopetas, rifles básicos y accesorios | rifles, LMG y precisión avanzada | explosivos, antimaterial y armamento pesado |

Las restricciones combinan el stage de Era y el stage individual sin listeners propios ni manipulación de inventarios. Los 40 GunIds ya clasificados conservan sus tiers actuales; los otros 14 reciben únicamente la exclusividad Pistolero hasta que una auditoría de balance determine su Era.

## Guerrero

- Exclusivo propuesto: armas con movesets Epic Fight, familias avanzadas de Simply Swords y equipo Nightfall.
- Global/multiclase: armas vanilla básicas, herramientas y drops de boss hasta decidir su identidad.
- Pendiente: separar skillbooks por habilidad/NBT y medir armas únicas para Era III/IV.

## Mago, Arcanista y Metalomante

- Mago continúa siendo la clase principal.
- Arcanista y Metalomante son especializaciones mutuamente excluyentes; ninguna sustituye `nexus_class_mage`.
- Arcanista usa `nexus_specialization_arcanist` y aplica `Mage AND Arcanist` a las 91 entradas inequívocas de Iron's Spells ya clasificadas.
- Metalomante conserva el ID interno `metallurgist` y usa `nexus_specialization_metallurgist`.
- Global: materiales, inks, loot, almacenamiento y estaciones compartidas cuando no otorguen poder exclusivo por sí solas.
- Pendiente: clasificación NBT de scrolls y la UI futura de selección.

## Pistolero

- Exclusivo implementado: las 54 armas del pack TaCZ local por `GunId`; accesorios relevantes y su clasificación temporal siguen pendientes.
- Global: pickup, loot, almacenamiento y movimiento de munición/componentes.
- Pendiente: validar en runtime el filtrado NBT de History Stages y clasificar por Era los 14 GunIds locales que no pertenecían a los cuatro tiers existentes, sin bloquear `tacz:ammo` o `tacz:attachment` completos.

## Especializaciones de Mago

| Clase base | Especialización | Stage adicional | Era mínima | Estado |
| --- | --- | --- | ---: | --- |
| Mago | Arcanista (`arcanist`) | `nexus_specialization_arcanist` | I | Implementada; contenido Iron's Spells inequívoco requiere Mage AND Arcanist |
| Mago | Metalomante (`metallurgist`) | `nexus_specialization_metallurgist` | III | Implementada; Allomancy requiere Mage AND Metalomante y separa poderes básicos de Era III del avance Mistborn de Era IV |

Solo puede existir uno de estos stages a la vez. Warrior, Gunslinger y los jugadores sin clase conservan cero especializaciones de Mago.

## Contenido global y multiclase

- Create/Createaddition: global por era tecnológica.
- Relics: global o multiclase por obtención natural; clase solo después de prueba individual.
- Bosses y drops: acceso global por era; equipo marcado multiclase o pendiente hasta validar función.
- Alshanex's Familiars: multiclase pendiente de decidir afinidad mágica.
- Construcción, almacenamiento, comida, agricultura, pesca, decoración y QoL: siempre libres.

## Decisiones aún necesarias

1. Validar filtros NBT para TaCZ, scrolls y skillbooks.
2. Medir armas únicas, relics y drops de boss individualmente.
3. Decidir la afinidad de Familiars.
4. Validar en runtime la progresión ya implementada de Allomancy y su revocación al cambiar de senda.
5. Conectar la futura UI FancyMenu a los comandos de selección ya preparados.
