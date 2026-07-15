# Pack 26.1 · diagnóstico del crash de memoria

## Síntomas reproducidos

- Con `-Xmx4096m`, el primer arranque terminó en `java.lang.OutOfMemoryError: Java heap space` después de generar spawn durante 67,918 s.
- Con `-Xmx10240m`, el cliente llegó al mundo y la JVM abortó a los 143,28 s por un fallo de asignación nativa.
- Antes del lote, el atlas de partículas era 8192×4096. Con el lote pasó a 32768×16384.

## Segundo crash: evidencia del hs_err

`hs_err_pid44164.log` registra:

- `Native memory allocation (malloc) failed to allocate 2159888 bytes. Error detail: Chunk::new`.
- `Out of Memory Error (arena.cpp:191)` en `C2 CompilerThread2` mientras compilaba `BlockRenderer::renderModel` de Embeddium/Sodium.
- Heap máximo 10 GiB; heap comprometido 9.30 GiB y usado 7.53 GiB.
- Metaspace usado 427.66 MiB; code cache usado ~134 MiB de ~240 MiB.
- GC G1 con regiones de 8 MiB; 195 Java threads visibles y 12 compiladores configurados.
- RAM física: 62,885 MiB, con 10,706 MiB libres.
- Límite de commit/pagefile: 75,810 MiB, con solo 5 MiB disponibles.
- Proceso Minecraft: working set 16,575 MiB y private/commit 21,052 MiB.

Conclusión: el segundo fallo no es heap Java agotado, falta de dirección virtual, límite de Metaspace ni crash del driver. Windows agotó su capacidad global de commit; una petición nativa de 2.06 MiB del compilador C2 fue la primera que no pudo satisfacerse.

## Causa del atlas

La auditoría de 24,358 PNG en 178 JAR/ZIP encontró:

| Recurso | Sprites de partículas | Suma RGBA | Mayor textura |
| --- | ---: | ---: | --- |
| FantasyWeapons 1.7.3 | 108 | 994.95 MiB | 8192×8192 |
| Epic Fight Nightfall | 152 | 49.81 MiB | 2048×2048 |
| Epic Fight | 24 | 7.31 MiB | 512×512 |
| resto individual | — | ≤5.20 MiB | ≤1024×1024 |

FantasyWeapons contiene `watcher_ring3.png` y `watcher_stream.png` a 8192×8192, además de numerosos frames 1024×1024 y 2048×2048 bajo `assets/mymod/textures/particle/`. El atlas vanilla descubre ese directorio. Su primera carga coincide con el salto registrado:

- antes del lote: 8192×4096 = 33,554,432 píxeles = 128 MiB RGBA;
- después: 32768×16384 = 536,870,912 píxeles = 2048 MiB RGBA;
- incremento: 16 veces los píxeles y +1920 MiB solo para el nivel base del atlas.

Durante stitch/upload pueden coexistir imagen CPU, textura OpenGL y reservas/copias del driver. Esto explica una parte material de los ~13.5 GiB de private bytes no ocupados por el heap Java y convierte a FantasyWeapons en la causa raíz demostrada.

## Otros candidatos

| Mod/recurso | Heap | Native/VRAM | Worldgen | Atlas | Evidencia | Riesgo |
| --- | --- | --- | --- | --- | --- | --- |
| FantasyWeapons | Alto | Alto | Bajo | Alto | ~995 MiB RGBA; atlas ×16; primer OOM y crash tras instalarlo | ALTO / CAUSA |
| PotatoShaders + Oculus | Bajo | Medio | Nulo | Nulo | Shader activo y buffers adicionales, pero sin `GL_OUT_OF_MEMORY` ni stack de driver | MEDIO, amplificador |
| DecoCraft slim | Medio | Medio | Bajo | Bloques | 6,304 PNG, 7,976 modelos; ~126 MiB RGBA; atlas de bloques 4096²→8192² | MEDIO |
| Dynamic Waters | Medio | Bajo | Alto | Nulo | Mixins en carvers/chunk generator; spawn nuevo 24–68 s; cero PNG | MEDIO para CPU/worldgen |
| Alshanex's Familiars | Bajo | Bajo | Medio | Bajo | 39 sprites, 0.59 MiB RGBA | BAJO |
| Relics | Bajo | Bajo | Bajo | Bajo | 3 sprites, 0.01 MiB RGBA | BAJO |
| Wither Reincarnated | Bajo | Bajo | Nulo fuera del boss | Bajo | 1 sprite de 3×3 | BAJO |
| QoL/tooltips/Horseman | Bajo | Bajo | Nulo | Nulo | sin evidencia cercana al fallo | DESCARTADO |

## DecoCraft

La build slim ocupa 89.95 MiB comprimidos y contiene 6,304 PNG, 7,976 modelos y 15,990 JSON. Sus PNG suman ~125.86 MiB RGBA y no contiene sprites de partículas. El atlas de bloques pasó de 4096×4096×4 a 8192×8192×4, por lo que DecoCraft aumenta recursos y tiempo de reload, pero no produjo el atlas 32768×16384.

El último log contiene 28 loot tables de DecoCraft que referencian IDs inexistentes y una textura 64×31 que desactiva mipmaps. Son defectos reales de la build, pero no coinciden con el fallo fatal de malloc.

## Dynamic Waters

Dynamic Waters no aporta PNG. Sus mixins modifican `WorldCarver`, `CanyonWorldCarver`, `NoiseBasedChunkGenerator`, estructuras, árboles y fluidos. El datapack `dynamicwaters_rivers` se activa automáticamente. Es un candidato sólido para la generación lenta y para mayor heap temporal de chunks, no para el atlas ni para un crash gráfico.

## Shaders y stack gráfico

Oculus cargó `PotatoShaders_v1.0d.zip`; Embeddium registró sus advertencias habituales de mixins y Flywheel cayó a backend `off`. No hay `GL_OUT_OF_MEMORY`, fallo de framebuffer ni stack fatal dentro de `nvoglv64.dll`. Los shaders pueden elevar la presión nativa/VRAM y acelerar el agotamiento de commit, pero la evidencia no los convierte en causa raíz.

## Corrección aplicada

Se retiró únicamente `mods/fantasyweapons.pw.toml` y se regeneró packwiz. No se modificaron Nexus Core, eras, clases, campaña, History Stages, FTB Quests ni hordas.

La copia ya descargada `fantasy-weapons-1.20.1.jar` debe quedar fuera de la carpeta `mods` de Prism antes de la prueba; packwiz no siempre borra automáticamente archivos que dejan de existir en el índice.

## Validación runtime posterior

El usuario confirmó después de retirar FantasyWeapons que Minecraft vuelve a arrancar, el mundo carga y no se observan nuevos problemas durante el juego. El crash de memoria queda cerrado con FantasyWeapons fuera del pack.

DecoCraft y Dynamic Waters permanecen instalados: la evidencia no justificó retirarlos. Las mediciones específicas de generación de chunks y rendimiento continúan siendo pruebas de optimización independientes, no bloqueantes para este diagnóstico.
