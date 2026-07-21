# Matriz de contenido por eras

Las eras controlan potencia global y no sustituyen la clase ni sus futuros subhitos. Los mínimos de campaña permanecen en 1/1/7/14/21. La clasificación completa está en `full-content-progression-matrix.md`; este documento resume la dirección de diseño y no activa restricciones nuevas.

| Era | Día mínimo | Identidad | Dimensiones disponibles | Contenido relevante | Subhitos previstos |
| --- | ---: | --- | --- | --- | --- |
| 0 · Preparación | 1 | Introducción breve | Overworld | Recursos básicos, hierro, construcción, decoración y sistemas globales libres; sin hordas automáticas | Clase, refugio, comida y suministros |
| I · Edad del Hierro | 1 | Primer asentamiento defendido | Overworld | Armas iniciales de clase, magia inicial, pistolas de servicio, Create básico y primeras hordas | Fundamentos marciales, iniciación arcana, arma de servicio y mecánica inicial |
| II · Edad del Diamante | 7 | Poder intermedio | Overworld + Nether | Diamante, tiers intermedios de clase, automatización, familiares, reliquias utilitarias y primeros drops especiales | Exploración, armamento reforzado, arsenal medio y automatización intermedia |
| III · Era Arcano-Industrial | 14 | Magia e industria avanzadas | Overworld + Nether + Aether | Runic/armas avanzadas, Arcanista avanzado, rifles avanzados, brass/precision, energía y bosses intermedios | Arcano avanzado, industria avanzada, arsenal avanzado, reliquias y cacería de bosses |
| IV · Era del Nexus | 21 | Convergencia endgame | Overworld + Nether + Aether + End + Otherside | Netherite, endgame de clase, tecnología sobrecargada, reliquias mayores y bosses finales | Acceso al Nexus, endgame de clase, reliquias, bosses finales y tecnología aérea futura |

## Progresión dimensional

- Era I: «El Nexus aún no puede mantener conexiones entre reinos.»
- Era II: «Se estabiliza la conexión con el Nether.»
- Era III: «El Nexus alcanza un reino elevado: el Aether.»
- Era IV: «El Nexus puede abrir caminos hacia el End y el misterioso Otherside.»

History Stages aplica estas restricciones con los cuatro stages globales ya
existentes. Los portales y accesos siguen siendo los nativos de cada dimensión.

## Política definitiva de clasificación

- Los materiales comunes, almacenamiento, construcción, comida, pesca, agricultura y decoración permanecen libres.
- Las armas y herramientas vanilla siguen siendo globales cuando su era material lo permite.
- Las clases controlan estilo de combate; las eras impiden adelantar poder.
- Un objeto exclusivo puede requerir simultáneamente stage global de era y stage individual de clase mediante History Stages.
- Los items contenedores con NBT —TaCZ guns/ammo/attachments, scrolls y skillbooks— no deben bloquearse globalmente sin un filtro validado.
- Era III y IV se dividen mediante subhitos, no mediante nuevas eras.
- La clasificación documental está terminada por familias; las restricciones masivas y las decisiones marcadas como pendientes aún no están implementadas.

## Especializaciones del Mago

- **Arcanista:** futura especialización de Iron's Spells. La matriz ya separa iniciación, desarrollo, avanzado y endgame, pero no crea todavía su stage ni selector.
- **Metalomante (`metallurgist`):** especialización avanzada y mutuamente excluyente del Mago. Allomancy usa Mage AND `nexus_specialization_metallurgist`: ocho poderes básicos en Era III y metales avanzados/Lerasium en Era IV. No es una cuarta clase.

## Preparación tecnológica futura

Create Aeronautics no está instalado. Una integración futura debe reutilizar la infraestructura avanzada de Era III y reservar aeronaves para Era IV, accesibles a todas las clases.

## Estado

### Clasificado

- Epic Fight, Simply Swords y Nightfall por familias/tier.
- Iron's Spells por función, rareza y tier mágico.
- TaCZ default gun pack por `GunId` y tipo de arsenal.
- Create/Createaddition por complejidad tecnológica.
- Relics, Cataclysm, Block Factory's Bosses, Bosses of Mass Destruction, Mowzie's Mobs y Wither: Reincarnated por ciclo de obtención.
- Alshanex's Familiars y contenido global relevante.

### Pendiente de decisión, no de inventario

- NBT variable de skillbooks, scrolls y TaCZ.
- Tier exacto de armas únicas, relics y cada drop de boss.
- Afinidad final de Alshanex's Familiars.
- Diseño definitivo de Arcanista y balance runtime final de Metalomante.
