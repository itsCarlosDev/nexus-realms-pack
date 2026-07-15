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

## Mago y Arcanista

- Mago continúa siendo la clase principal.
- Arcanista será la especialización de Iron's Spells, no una cuarta clase.
- Exclusivo propuesto: uso de grimorios, scrolls, runas, staffs, armaduras y curios mágicos según era.
- Global: materiales, inks, loot, almacenamiento y estaciones compartidas cuando no otorguen poder exclusivo por sí solas.
- Pendiente: stage/selector de Arcanista y clasificación NBT de scrolls.

## Pistolero

- Exclusivo propuesto: armas por `GunId`, accesorios relevantes y uso del arsenal TaCZ.
- Global: pickup, loot, almacenamiento y movimiento de munición/componentes.
- Pendiente: validar filtrado NBT de History Stages para no bloquear `tacz:modern_kinetic_gun`, `tacz:ammo` o `tacz:attachment` completos.

## Especialización Metalomante

| Clase base | Especialización | Stage adicional existente | Era mínima | Estado |
| --- | --- | --- | ---: | --- |
| Mago | Metalomante (`metallurgist`) | `nexus_specialization_metallurgist` | III | Base reservada; Allomancy no integrado ni clasificado |

Metalomante conserva `nexus_class_mage` y nunca sustituye la clase principal. No se renombra el ID interno ni se asignan metales/objetos en esta fase.

## Contenido global y multiclase

- Create/Createaddition: global por era tecnológica.
- Relics: global o multiclase por obtención natural; clase solo después de prueba individual.
- Bosses y drops: acceso global por era; equipo marcado multiclase o pendiente hasta validar función.
- Alshanex's Familiars: multiclase pendiente de decidir afinidad mágica.
- Construcción, almacenamiento, comida, agricultura, pesca, decoración y QoL: siempre libres.

## Decisiones aún necesarias

1. Crear la arquitectura definitiva de Arcanista.
2. Validar filtros NBT para TaCZ, scrolls y skillbooks.
3. Medir armas únicas, relics y drops de boss individualmente.
4. Decidir la afinidad de Familiars.
5. Integrar el mod definitivo de Allomancy antes de clasificar Metalomante.
