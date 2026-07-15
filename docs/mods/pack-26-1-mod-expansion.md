# Pack 26.1 — expansión controlada de mods

Auditoría realizada para Minecraft 1.20.1, Forge 47.4.10 y Java 17. Las versiones instaladas están fijadas mediante packwiz; no hay JAR nuevos guardados manualmente en el repositorio.

| Mod | Proyecto exacto | Forge 1.20.1 | Versión | Dependencias | Estado | Observaciones |
| --- | --- | --- | --- | --- | --- | --- |
| Clumps | Modrinth `Wnxd13zP` | Sí | 12.0.0.4 | Ninguna nueva | YA PRESENTE | QoL/rendimiento global. |
| Enchantment Descriptions | CurseForge 250419 / file 7612607 | Sí | 17.1.21 | Bookshelf 20.2.15 | INSTALADO · ARRANQUE VALIDADO | Autor DarkhaxDev; tooltips, cliente y servidor. |
| Shulker Box Tooltip | CurseForge 315811 / file 4611155 | Sí | 4.0.4+1.20.1 | Cloth Config 11.1.136 ya presente | INSTALADO · ARRANQUE VALIDADO | Revisión específica con JEI/Inventario pendiente. |
| Cut Through | CurseForge 969423 / file 5137980 | Sí | 8.0.2 | Puzzles Lib 8.1.33 ya presente | INSTALADO · ARRANQUE VALIDADO | Autor Fuzs; prueba específica con Epic Fight y Punchy pendiente. |
| Alshanex's Familiars | CurseForge 1171602 / file 7481428 | Sí | 3.8 HOTFIX | FamiliarsLib 1.6; Iron's Spells ya presente | INSTALADO · ARRANQUE VALIDADO | Añade mobs, sonido mágico e isla de origen; worldgen nuevo pendiente. |
| Relics | CurseForge 445274 / file 7708970 | Sí | 0.8.0.13 | OctoLib 0.5.0.1 y Curios 5.14.1 | INSTALADO · ARRANQUE VALIDADO | Obtención/exploración y datos aleatorios; no restringido todavía. |
| Wither: Reincarnated | CurseForge 1309246 / file 6835382 | Sí | 1.0.5 | Ninguna declarada por packwiz | INSTALADO · ARRANQUE VALIDADO | Reemplaza comportamiento, modelo y fases del Wither; candidato Era IV. |
| Horseman | CurseForge 1082085 / file 8299151 | Sí | 1.3.16 | Ninguna declarada por packwiz | INSTALADO · ARRANQUE VALIDADO | Proyecto inequívoco de mortuusars; QoL de caballos, cliente y servidor. |
| FantasyWeapons | CurseForge 1224935 / file 7996972 | Sí | 1.7.3 | Ninguna declarada por packwiz | OMITIDO POR INCOMPATIBILIDAD | Retirado tras reproducir OOM heap y agotamiento de commit nativo: sus texturas de partículas fuerzan un atlas 32768×16384 de 2 GiB RGBA. |
| Dynamic Waters | CurseForge 1505834 / file 8353651 | Sí | 11.1.1 | Ninguna declarada por packwiz | INSTALADO · ARRANQUE VALIDADO | Worldgen de ríos. Requiere mundo nuevo; chunks existentes no se regeneran. |
| Abyssal Corrupter | CurseForge 1512622 | Metadata contradictoria | Sin instalar | — | OMITIDO POR INCOMPATIBILIDAD | CurseForge ofrece un archivo etiquetado 1.20.1 Forge, pero la descripción y requisitos declaran 1.21.1 NeoForge. |
| DecoCraft | CurseForge 79616 / file 7092533 | Sí | 3.0.4 slim | Ninguna declarada por packwiz | INSTALADO · ARRANQUE VALIDADO | Forge, ~90 MB. PTRLib no fue añadido. Pruebas específicas de Decobench y persistencia pendientes. |
| Create Aeronautics | CurseForge 676721 | No | 1.3.0 solo 1.21.1 NeoForge | Sable y Create | NO DISPONIBLE PARA FORGE 1.20.1 | No se modificaron Create 6.0.8 ni sus addons. Clasificación de riesgo E. |

## Dependencias añadidas

- Bookshelf `20.2.15` — CurseForge 228525 / file 7612389.
- FamiliarsLib `1.6` — CurseForge 1316458 / file 7696453.

Dependencias ya existentes y reutilizadas sin cambiar versión ni proveedor final:

- Cloth Config `11.1.136`.
- Puzzles Lib `8.1.33`.
- OctoLib `0.5.0.1`.
- Curios `5.14.1`.
- Iron's Spells `3.16.1`.

## Create Aeronautics

Estado **E: no existe build estable apropiada** para esta arquitectura. El proyecto oficial actual solo publica Minecraft 1.21.1 NeoForge y requiere Sable y Create. Nexus usa Minecraft 1.20.1 Forge, Create 6.0.8 y Create Crafts & Additions 1.3.3. No se instalaron builds antiguas, forks ni artefactos de Discord.

Si aparece una build oficial Forge 1.20.1, deberá validarse primero contra Create 6.0.8, Create Crafts & Additions, Oculus/Embeddium y servidor dedicado. Aeronautics tiene además problemas visuales declarados con Iris; Oculus requiere una prueba equivalente.

## Mundo y servidor

- Dynamic Waters solo afecta correctamente a mundos nuevos. Para el mundo existente, el contenido aparecería únicamente en terreno nuevo y el autor desaconseja esa combinación.
- Alshanex's Familiars añade worldgen para Origin Island; comprobar mundo nuevo y chunks nuevos.
- Wither: Reincarnated modifica globalmente el Wither y debe probarse junto a otros mods de bosses.
- FantasyWeapons fue retirado antes de la prueba dedicada: el problema está en sus recursos cliente y no en una dependencia de servidor.
- DecoCraft, Dynamic Waters, Familiars, Relics, Horseman y Wither deben estar en cliente y servidor.

## Rendimiento esperado

- DecoCraft es el mayor coste cliente: ~90 MB y una gran cantidad de modelos/recursos, con impacto probable en RAM y tiempo de inicio.
- Alshanex's Familiars añade ~22 MB, entidades animadas y worldgen.
- FantasyWeapons comprimía ~39 MB, pero sus 108 texturas de partículas sumaban ~995 MiB RGBA y forzaban un atlas de partículas de 2 GiB; fue retirado.
- Wither: Reincarnated añade ~12 MB y lógica de boss, pero no carga continua fuera del combate.
- Dynamic Waters añade generación y caché regional; el coste principal estará al generar chunks.
- Clumps debería reducir entidades de orbes de experiencia.
- Los tres mods de tooltip y Cut Through tienen impacto esperado bajo.

## Estado runtime y checklist específica

Tras retirar FantasyWeapons, el usuario confirmó arranque, carga de mundo y juego normal sin problemas observados. Esto cierra la compatibilidad base del lote; no sustituye las siguientes pruebas funcionales específicas:

1. Cerrar Minecraft y sincronizar la instancia por el instalador packwiz.
2. Arrancar hasta menú, revisar errores de dependencias y entrar en un mundo existente.
3. Crear un mundo nuevo para Dynamic Waters y Alshanex's Familiars.
4. Revisar JEI y un objeto representativo de cada mod.
5. DecoCraft: Decobench, Decomposer, Decobrush, colocar/rotar/interactuar/romper y reiniciar.
6. Cut Through: probar hierba alta con combate vanilla, Punchy y Epic Fight.
7. Relics: equipar mediante Curios, guardar y reconectar.
8. Horseman: montar, desmontar y usar riendas.
9. Wither: invocación controlada en mundo de prueba, nunca en el mundo principal.
10. Servidor dedicado: arranque, mundo nuevo, conexión, desconexión y reinicio.
11. Buscar `ERROR`, `FATAL`, `Exception`, `Mixin`, `Missing dependency`, `NoClassDefFoundError`, `Registry`, `Duplicate` y `Failed to load`.

FantasyWeapons permanece excluido y no debe volver a añadirse sin corregir previamente sus recursos de partículas.
