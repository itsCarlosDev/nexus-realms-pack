# Especialización Mago → Metalurgista

## Estado de identificación

No existe en el repositorio una URL, un project ID, un file ID ni una nota histórica que permita identificar inequívocamente el proyecto de Allomancy previsto. La expresión «Allomancy Mod Showcase» tampoco identifica por sí sola un mod. La búsqueda oficial devuelve al menos tres candidatos distintos para Forge 1.20.1:

| Proyecto | Autor | Project ID | Build Forge 1.20.1 observada | Diferencia relevante |
| --- | --- | ---: | --- | --- |
| Allomancy | legobmw99 | 256282 | `allomancy-6.1.0-backport3.jar` | Proyecto clásico; metales base y worldgen configurable. |
| Allomancer | leafreynolds | 678468 | `CosmereAllomancy-1.20.1-47.3.0-0.7.113.jar` | Proyecto Cosmere en alpha; Misting/Mistborn y Curios requerido. |
| Mistborn: Metal Arts | noah_hester | 1555831 | `mistborn_metal_arts-0.1.0.jar` | Beta nueva con Allomancy, Feruchemy, Hemalurgy, máquinas y estructuras. |

Por esta ambigüedad no se instala ningún mod, no se añaden dependencias y no se inventan comandos o APIs nativas. Falta una URL oficial o el project/file ID del proyecto que Carlos había previsto.

## Arquitectura implementada independiente del mod

- Clase principal: `mage`.
- Especialización persistente: `player.persistentData.nexus_specialization = metallurgist`.
- Stage individual adicional: `nexus_specialization_metallurgist`.
- Un Metalurgista conserva simultáneamente `nexus_class_mage` y `nexus_specialization_metallurgist`.
- Guerrero, Pistolero y jugadores sin clase no pueden conservar la especialización.
- El login reconcilia una sola vez persistentData y History Stages; no hay comprobación por tick.
- Resetear o abandonar Mago limpia la especialización y el stage sin tocar inventarios.

El stage existe vacío hasta identificar el namespace y los objetos reales. No aplica restricciones ficticias.

## Desbloqueo

`/nexus_specialization unlock metallurgist [player]` exige:

1. clase principal Mago;
2. Era III o superior;
3. que el hito «La Senda del Metal» ejecute la recompensa.

La quest depende del hito global de Era III. Alcanzar el día 14 o entrar en Era III no concede por sí solo la especialización. La operación es idempotente.

Comandos administrativos:

- `/nexus_specialization get [player]`
- `/nexus_specialization unlock metallurgist [player]`
- `/nexus_specialization reset [player]`

Todos requieren nivel de operador 2. `nexus_class_status` también muestra la especialización y la coherencia del stage.

## Integración nativa pendiente

No se ha auditado ni implementado todavía:

- capability/attachment o estado nativo del jugador;
- comandos oficiales para conceder o revocar poderes;
- persistencia tras muerte y reconexión propia del mod;
- objetos, viales, flakes, metales, poderes o recetas registrados;
- sincronización cliente/servidor nativa;
- starter oficial.

La selección del proyecto debe preceder a cualquiera de estos cambios. Si el proyecto elegido no permite revocar poderes de forma segura, el cambio de clase no se simulará con listeners propios.

## Clasificación y balance previsto

No hay objetos del mod clasificados porque no hay un mod seleccionado ni instalado. Los materiales vanilla (`iron_ingot`, `gold_ingot`, `copper_ingot` y sus bloques) permanecen libres para economía, construcción, Create y herrería.

### Era III · Metalurgista

- introducción a la mecánica nativa;
- recipiente o herramienta inicial real del mod;
- metales comunes y poderes fundamentales;
- aprendizaje mediante «La Senda del Metal».

### Era IV · Metalurgista avanzado

- metales raros;
- combinaciones y poderes avanzados;
- contenido nativo equivalente a endgame.

Las restricciones futuras se aplicarán solo a objetos cuyo uso active Allomancy, conservando pickup, loot y almacenamiento cuando History Stages lo permita. No se bloqueará todo el namespace.

## Pruebas bloqueadas

La persistencia Nexus y el stage pueden probarse ya. El acceso real, revocación, metales, poderes y compatibilidad dedicada quedan bloqueados hasta aportar el proyecto oficial exacto.
