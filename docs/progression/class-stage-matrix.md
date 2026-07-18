# Matriz de clases, stages y contenido

La clase guardada en `player.persistentData.nexus_class` continúa siendo la fuente de verdad. History Stages 5.4.0 es el único motor previsto para enforcement. Esta actualización documenta la clasificación completa, pero no modifica stages ni gameplay.

| Clase | Stage individual actual | Era I | Era II | Era III | Era IV |
| --- | --- | --- | --- | --- | --- |
| Guerrero | `nexus_class_warrior` | Epic Fight/Simply Swords de hierro y movesets iniciales | familias diamond y skillbooks básicos | runic, Nightfall y combate avanzado | netherite y arsenal melee endgame |
| Mago | `nexus_class_mage` | grimorios y estaciones iniciales | grimorios, runas, curios y armadura intermedia | grimorios/staffs/armaduras avanzados | legendary/netherite y endgame mágico |
| Pistolero | `nexus_class_gunslinger` | pistolas/revólveres de servicio | SMG, escopetas, rifles básicos y accesorios | rifles, LMG y precisión avanzada | explosivos, antimaterial y armamento pesado |

Las restricciones representativas ya existentes no se amplían en este pack. Una futura implementación debe combinar el stage de era y el stage individual sin listeners propios ni manipulación de inventarios.

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

- Exclusivo propuesto: armas por `GunId`, accesorios relevantes y uso del arsenal TaCZ.
- Global: pickup, loot, almacenamiento y movimiento de munición/componentes.
- Pendiente: validar filtrado NBT de History Stages para no bloquear `tacz:modern_kinetic_gun`, `tacz:ammo` o `tacz:attachment` completos.

## Especializaciones de Mago

| Clase base | Especialización | Stage adicional | Era mínima | Estado |
| --- | --- | --- | ---: | --- |
| Mago | Arcanista (`arcanist`) | `nexus_specialization_arcanist` | I | Implementada; contenido Iron's Spells inequívoco requiere Mage AND Arcanist |
| Mago | Metalomante (`metallurgist`) | `nexus_specialization_metallurgist` | III | Arquitectura implementada; Allomancy no integrado ni clasificado |

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
4. Integrar el mod definitivo de Allomancy antes de clasificar Metalomante.
5. Conectar la futura UI FancyMenu a los comandos de selección ya preparados.
