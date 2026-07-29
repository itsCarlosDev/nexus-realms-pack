# Economía del Nexus — Packs 28.1–33.2

## IMPLEMENTADO

### Arquitectura

```text
FTB Quests
    -> recompensa monedas físicas
    -> reclamación manual
    -> algunas recompensas usan team_reward:true

Mercader del Nexus (Easy NPC)
    -> cambio neutral entre denominaciones
    -> venta de suministros globales
```

La economía no añade comprobaciones por tick, recetas, drops ni generación automática. History Stages continúa siendo la única autoridad de restricciones; el Mercader no implementa un sistema paralelo.

Las recompensas con `team_reward: true` pueden reclamarse una sola vez por equipo FTB y ciclo correspondiente. La moneda física la recibe el jugador que realiza la reclamación; no se divide automáticamente entre todos los miembros del equipo.

### Monedas

KubeJS instalado: `2001.6.5-build.26`.

| ID | Nombre visible | Valor en bronce | Stack |
|---|---|---:|---:|
| `kubejs:nexus_bronze_coin` | Moneda de Bronce del Nexus | 1 | 64 |
| `kubejs:nexus_silver_coin` | Moneda de Plata del Nexus | 10 | 64 |
| `kubejs:nexus_gold_coin` | Moneda de Oro del Nexus | 100 | 64 |

Registro: `kubejs/startup_scripts/nexus_economy_items.js`.

Las tres monedas tienen nombre y tooltip en español. No tienen receta de fabricación, fundición, compactación, reciclaje ni procesamiento. Ningún script las entrega por minería, mobs, cofres o automatización.

KubeJS genera automáticamente los modelos `minecraft:item/generated` para los items registrados y los enlaza con su textura por ID; por ello no se mantienen modelos JSON redundantes.

Texturas originales de 16 × 16 píxeles, RGBA:

- `kubejs/assets/kubejs/textures/item/nexus_bronze_coin.png`
- `kubejs/assets/kubejs/textures/item/nexus_silver_coin.png`
- `kubejs/assets/kubejs/textures/item/nexus_gold_coin.png`

El generador reproducible está en `scripts/generate-nexus-coin-textures.js`. Cada moneda usa metal, iluminación y marcas de denominación diferentes, con una runa cian/violeta común del Nexus.

### Conversión

El preset `config/easy_npc/preset/humanoid/nexus_merchant.npc.snbt` contiene estas ofertas nativas:

| Entrega | Recibe | Valor antes | Valor después |
|---|---|---:|---:|
| 10 Bronce | 1 Plata | 10 | 10 |
| 1 Plata | 10 Bronce | 10 | 10 |
| 10 Plata | 1 Oro | 100 | 100 |
| 1 Oro | 10 Plata | 100 | 100 |

Todos los ciclos conservan valor:

```text
10 B -> 1 P -> 10 B
10 P -> 1 O -> 10 P
100 B -> 10 P -> 1 O -> 10 P -> 100 B
```

No existe comisión, redondeo ni oferta que compre suministros a cambio de moneda. Por tanto, las conversiones y el catálogo no forman un ciclo con beneficio.

### Mercader del Nexus

Easy NPC: Bundle/Core/Config UI `7.2.0`, formato de preset `EasyNPCVersion:3`.

Estado: `OPERATIVO V1`, con el interior todavía en construcción. Se conserva el NPC `nexus_merchant`, su nombre, apariencia, persistencia, invulnerabilidad, inmovilidad y apertura de diálogo.

El preset está en versión `1.2.0`; sus tres botones contextuales `Comerciar` usan la acción nativa verificada `OPEN_TRADING_SCREEN` y abren el mismo catálogo.

Configuración comercial:

- tipo `BASIC`;
- 12 ofertas, que es el máximo básico expuesto por Easy NPC 7.2.0;
- 64 usos por oferta;
- reposición de usos cada 5 minutos;
- demanda `0`;
- precio especial `0`;
- multiplicador de precio `0.0`;
- XP de comercio `0`.

El preset no contiene coordenadas globales ni genera otro NPC. Para actualizar el Mercader ya colocado hay que sustituir manualmente la entidad una sola vez siguiendo el procedimiento de `docs/hub/nexus-market-npcs.md`.

### Catálogo inicial

| Coste | Producto | Categoría |
|---:|---|---|
| 3 Bronce | 4 panes | supervivencia |
| 5 Bronce | 4 pollos cocinados | supervivencia |
| 4 Bronce | 16 antorchas | supervivencia / exploración |
| 5 Bronce | 16 tablones de roble | construcción |
| 4 Bronce | 16 adoquines | construcción |
| 6 Bronce | 8 bloques de cristal | construcción |
| 8 Bronce | 1 bote de roble | exploración |
| 1 Plata | 2 riendas | exploración |

Los IDs vanilla del catálogo no aparecen en las restricciones locales de History Stages.

El Mercader no vende diamante, netherite, Waystones, armas, armaduras, TaCZ, grimorios, recursos de Allomancy, Lerasium, loot de bosses ni contenido de Eras futuras.

### Recompensas FTB Quests — base hasta Pack 31.1

FTB Quests instalado: `2001.4.22`.

`config/ftbquests/quests/data.snbt` mantiene:

- `default_reward_team: false`;
- `default_autoclaim_rewards: "disabled"`.

Las quests que declaran explícitamente `team_reward: true` aplican esa configuración a su recompensa concreta.

Las recompensas monetarias son secundarias. No se eliminaron recompensas, dependencias, tareas ni texto existentes.

| Capítulo | Quest ID | Quest | Recompensa | Motivo |
|---|---|---|---:|---|
| `00_comienzo` | `2700000000000003` | Elige tu senda | 8 Bronce | decisión inicial de clase |
| `00_comienzo` | `4E58504552413031` | Preparados para la Edad del Hierro | 1 Plata | primer hito global |
| `01_era_supervivencia` | `2700000000000102` | Un lugar al que volver | 6 Bronce | asentamiento funcional |
| `01_era_supervivencia` | `2700000000000103` | Defensa del asentamiento | 5 Bronce | preparación básica |
| `01_era_supervivencia` | `2700000000000104` | Horizontes nuevos | 3 Plata | final de Era I |
| `02_era_expansion` | `4E58504552413032` | Hito II — Edad del Diamante | 2 Plata | apertura de Era II |
| `02_era_expansion` | `2710000000000206` | Frontera infernal | 12 Bronce | expedición relevante |
| `02_era_expansion` | `2700000000000204` | Umbral arcano-industrial | 4 Plata | final de Era II |
| `03_era_arcano_industrial` | `4E58504552413033` | Hito III — Arcano e Industria | 3 Plata | apertura de Era III |
| `03_era_arcano_industrial` | `2700000000000303` | Convergencia de disciplinas | 15 Bronce | consolidación de clase |
| `03_era_arcano_industrial` | `2700000000000304` | Preparación del Nexus | 5 Plata | final de Era III |
| `04_era_nexus` | `4E58504552413034` | Hito IV — Era del Nexus | 5 Plata | apertura de Era IV |
| `04_era_nexus` | `2700000000000402` | Maestría de clase | 3 Plata | progresión final de clase |
| `04_era_nexus` | `2700000000000404` | El Nexus despierto | 1 Oro | final de campaña |
| `clase_guerrero` | `2710000000001005` | Dominio del combate | 8 Bronce | entrenamiento intermedio |
| `clase_guerrero` | `2700000000001004` | Campeón del Nexus | 3 Plata | final de senda |
| `clase_mago` | `2700000000001103` | Taller del Mago | 8 Bronce | infraestructura de clase |
| `clase_mago` | `2700000000001104` | Dos sendas | 1 Plata | elección de especialización |
| `clase_pistolero` | `2710000000001305` | Disciplina de tiro | 8 Bronce | entrenamiento intermedio |
| `clase_pistolero` | `2700000000001304` | Arsenal del Nexus | 3 Plata | final de senda |
| `especializacion_arcanista` | `2700000000001202` | Dominio del maná | 1 Plata | milestone de especialización |
| `especializacion_arcanista` | `2700000000001203` | Arcanista del Nexus | 3 Plata | final de especialización |
| `senda_del_metal` | `4E584D4554513031` | El arte de los metales | 1 Plata | desbloqueo existente de la senda |
| `senda_del_metal` | `2710000000001403` | Los ocho metales | 1 Plata | dominio de metales básicos |
| `senda_del_metal` | `2710000000001408` | Nacido de la bruma | 3 Plata | final de especialización |
| `exploracion_y_hordas` | `2710000000002002` | Cartografía de frontera | 8 Bronce | preparación de ruta |
| `exploracion_y_hordas` | `2710000000002003` | Bajo aguas hostiles | 12 Bronce | expedición relevante |
| `exploracion_y_hordas` | `2710000000002005` | Ecos bajo el Overworld | 2 Plata | exploración avanzada del Overworld |
| `exploracion_y_hordas` | `2710000000002012` | Primera defensa | 2 Plata | milestone de defensa |
| `pesca_del_nexus` | `2720000000003102` | Primer aparejo | 3 Bronce | inicio opcional de pesca |
| `pesca_del_nexus` | `2720000000003103` | Primera captura | 3 Bronce | primera especie común |
| `pesca_del_nexus` | `2720000000003104` | Habitantes de agua dulce | 4 Bronce | colección pequeña |
| `pesca_del_nexus` | `2720000000003106` | Pesca paciente | 5 Bronce | capturas comunes acumuladas |
| `pesca_del_nexus` | `2720000000003110` | Colección inicial completada | 1 Plata | cierre opcional V1 |
| `pesca_del_nexus` | `2720000000003111` | Colección de aguas templadas | 3 Bronce | colección única de agua dulce |
| `pesca_del_nexus` | `2720000000003112` | Colección costera | 4 Bronce | colección única costera |
| `pesca_del_nexus` | `2720000000003113` | Aguas de clima seco | 3 Bronce | exploración acuática única |
| `pesca_del_nexus` | `2720000000003114` | Ríos de la jungla | 3 Bronce | exploración acuática única |
| `pesca_del_nexus` | `2720000000003115` | Humedales vivos | 3 Bronce | exploración acuática única |
| `pesca_del_nexus` | `2720000000003117` | Dominio de las aguas | 4 Bronce | cierre opcional V2 |
| `pesca_del_nexus` | `2720000000003118` | Contrato: capturas comunes | 2 Bronce | repetible cada 24 h; consume 8 bluegill + 8 minnow |
| `pesca_del_nexus` | `2720000000003119` | Contrato: cesta variada | 3 Bronce | repetible cada 24 h; consume 5 perch + 5 carp + 3 brown trout |
| `pesca_del_nexus` | `2720000000003120` | Contrato: remesa costera | 4 Bronce | repetible cada 48 h; consume 6 atlantic herring + 3 jellyfish |

No se añadió moneda al capítulo `desafios_y_bosses`: las recompensas económicas directas de bosses quedan reservadas para una decisión posterior.

### Balance por campaña

Todas las cifras se expresan en bronce-equivalentes.

Las primeras filas representan las rutas base anteriores a las ampliaciones comunitarias y dimensionales posteriores:

| Recorrido | Valor | Equivalencia |
|---|---:|---:|
| campaña principal | 406 | 4 Oro + 6 Bronce |
| Guerrero | 38 | 3 Plata + 8 Bronce |
| Pistolero | 38 | 3 Plata + 8 Bronce |
| Mago común | 18 | 1 Plata + 8 Bronce |
| Arcanista | 40 | 4 Plata |
| Metalomante | 50 | 5 Plata |
| exploración y primera defensa | 60 | 6 Plata |
| pesca V2 opcional, recompensas únicas | 45 | 4 Plata + 5 Bronce |
| principal + Guerrero/Pistolero + exploración | 504 | 5 Oro + 4 Bronce |
| principal + Mago + Arcanista + exploración | 524 | 5 Oro + 2 Plata + 4 Bronce |
| principal + Mago + Metalomante + exploración | 534 | 5 Oro + 3 Plata + 4 Bronce |
| ruta máxima anterior + pesca V2 única | 579 | 5 Oro + 7 Plata + 9 Bronce |
| ruta máxima única tras Pack 33.2 | 751 | 7 Oro + 5 Plata + 1 Bronce |

El valor de `751 B` mantiene el mismo criterio acumulativo usado desde Pack 32.1: supone que un mismo miembro del equipo reclama todas las recompensas únicas añadidas a la ruta máxima anterior cuando esas quests son compatibles y completables.

No representa la suma de todas las ramas excluyentes del modpack.

Solo el final de campaña entrega Oro directamente. El resto del Oro posible procede de convertir, sin beneficio, el mismo valor ganado en Bronce y Plata.

### Fuentes y sumideros

Fuentes monetarias implementadas en el estado Pack 33.2:

- 114 definiciones de recompensa monetaria de FTB Quests;
- 101 recompensas únicas;
- 13 recompensas repetibles controladas.

Fuentes repetibles implementadas:

- pesca: tres contratos, con techo sostenido equivalente a `7 B/día`;
- Casa de Contratos: ocho contratos, con techo sostenido equivalente a `9 B/día`;
- Intendencia: dos reservas avanzadas de `4 B`, cada una repetible cada 24 horas, con techo de `8 B/día`.

El techo teórico combinado de las fuentes repetibles implementadas es:

```text
7 B/día + 9 B/día + 8 B/día = 24 B/día
```

Este máximo presupone completar todos los ciclos disponibles y no implica que sea sostenible sin coste de materiales o tiempo de juego.

Sumideros implementados:

- las ocho ofertas de suministros del Mercader.

Conversión:

- cuatro ofertas neutrales 10:1 y 1:10.

No hay otras fuentes automáticas de moneda.

### Auditoría histórica Pack 30.5

- Las 29 recompensas económicas continuaban siendo únicas y estaban repartidas en 11 capítulos.
- La suma de todas las ramas era `650 B`, pero no constituía una ruta jugable: las clases son excluyentes y Arcanista/Metalomante también lo son.
- La ruta máxima era Mago + Metalomante + campaña + exploración: `534 B` (`5 O + 3 P + 4 B`).
- Ninguna quest monetaria estaba marcada como repetible y no había IDs de recompensa duplicados.
- Las tres monedas carecían de recetas o fuentes automáticas. Fuera de las quests, el único sistema que las aceptaba o entregaba era el Mercader.
- Los ocho suministros vendidos eran vanilla y no figuraban en las restricciones locales de clase o Era.

### Ampliación Packs 31.0–31.1

- `pesca_del_nexus` incluye once recompensas monetarias únicas por `45 B` en total y tres recompensas repetibles controladas.
- La economía quedó en 43 definiciones de recompensa monetaria repartidas en 12 capítulos: 40 únicas y 3 repetibles.
- La suma teórica de todas las recompensas únicas pasó a `695 B` y la ruta máxima jugable, incluyendo la pesca opcional, a `579 B` (`5 O + 7 P + 9 B`).
- Los contratos repetibles consumen todos sus peces. Dos tienen cooldown de 24 horas y uno de 48 horas: una pasada de los tres paga `9 B` y el techo sostenido es `14 B` cada 48 horas, con una media máxima de `7 B` al día.
- Las otras recompensas de pesca son gusanos y carbón vegetal: recursos básicos sin valor de reventa en el Mercader.
- La rama y sus contratos no entregan Neptunium, equipo, armas ni objetos de Eras posteriores.

### Proyectos comunitarios Pack 32.1

- `proyectos_del_nexus` añade seis recompensas monetarias únicas por `32 B` en total: `4 + 4 + 5 + 5 + 6 + 8 B`.
- Cada recompensa usa `team_reward: true`: se reclama una sola vez por equipo FTB y la recibe quien la reclama; no se multiplica por miembros conectados.
- Las 21 tareas consumen los materiales aportados. Ningún proyecto es repetible y ninguna recompensa entrega objetos avanzados.
- La economía queda en 49 definiciones monetarias repartidas en 13 capítulos: 46 únicas y 3 repetibles. La suma teórica de recompensas únicas es `727 B`.
- El techo de ruta que añade todas las recompensas únicas de proyectos a la ruta máxima anterior sería `611 B` (`6 O + 1 P + 1 B`), únicamente si el mismo miembro del equipo reclama las seis.
- El premio es simbólico frente al coste comunitario de las entregas; no cambia ratios, ofertas del Mercader ni fuentes repetibles de moneda.

### Casa de Contratos Pack 32.2

- `contratos_del_nexus` añade ocho recompensas repetibles: seis encargos de 24 horas y dos de 48 horas.
- Una pasada completa paga `10 B`; el techo sostenido es `18 B` cada 48 horas, equivalente a una media máxima de `9 B` al día frente a los `7 B` diarios de la pesca repetible.
- Cada recompensa usa `team_reward: true`, de modo que solo existe un pago por equipo FTB y ciclo. Los materiales de los seis contratos de entrega se consumen.
- Los contratos con recursos vendidos por el Mercader siempre arrojan pérdida si se compran para entregarlos: no existe un bucle de compra y cobro rentable.
- La economía queda en 57 definiciones monetarias repartidas en 14 capítulos: 46 únicas y 11 repetibles. La suma de recompensas únicas permanece en `727 B`.
- No se entregan armas, equipo, loot raro ni objetos restringidos; tampoco cambian monedas, ratios o las doce ofertas del Mercader.

### Museo del Nexus Pack 32.3

- `museo_del_nexus` añade nueve recompensas monetarias únicas por `18 B`: tres trofeos de `3 B`, tres reliquias de `2 B` y tres descubrimientos de `1 B`.
- Las recompensas usan `team_reward: true` y ninguna colección es repetible. El Museo no añade ingreso sostenido.
- Los objetivos solo comprueban posesión con `consume_items: false`; no entregan copias ni destruyen trofeos, equipamiento o reliquias.
- La economía queda en 66 definiciones monetarias repartidas en 15 capítulos: 55 únicas y 11 repetibles. La suma teórica de recompensas únicas es `745 B`.
- Si un mismo miembro reclamara todas las colecciones, el techo de la ruta única anterior pasaría de `611 B` a `629 B` (`6 O + 2 P + 9 B`).
- No cambian las monedas, los ratios, los cooldowns ni las doce ofertas del Mercader.

### Intendencia del Nexus Pack 32.4

- `intendencia_del_nexus` añade cinco recompensas monetarias: tres únicas por `10 B` en total (`3 + 4 + 3 B`) y dos repetibles de `4 B` cada una.
- Las tres requisiciones únicas cubren reserva básica, suministros de guarnición y logística de expediciones. Las dos reservas avanzadas son repetibles cada 24 horas.
- Todas usan `team_reward: true`, por lo que cada recompensa existe una sola vez por equipo FTB y ciclo correspondiente.
- La economía queda en 71 definiciones monetarias repartidas en 16 capítulos: 58 únicas y 13 repetibles. La suma teórica de recompensas únicas pasa a `755 B`.
- El techo de ruta única anterior pasa de `629 B` a `639 B` (`6 O + 3 P + 9 B`) si un mismo miembro reclama las tres recompensas únicas.
- Las requisiciones repetibles no modifican los ratios del Mercader ni entregan equipo, loot raro o contenido restringido.

### Observatorio del Nexus Pack 32.5

- `observatorio_del_nexus` añade ocho recompensas monetarias únicas por `9 B`: siete investigaciones de `1 B` y el informe final de `2 B`.
- Todas usan `team_reward: true`, ninguna es repetible y las tareas de objetos comprueban posesión con `consume_items: false`.
- La economía queda en 79 definiciones monetarias repartidas en 17 capítulos: 66 únicas y 13 repetibles. La suma teórica de recompensas únicas es `764 B`.
- Si un mismo miembro reclamara todas las investigaciones, el techo de la ruta única anterior pasaría de `639 B` a `648 B` (`6 O + 4 P + 8 B`).
- No se entrega equipo, loot avanzado ni objetos dimensionales como recompensa; tampoco cambian monedas, ratios, cooldowns o las doce ofertas del Mercader.

### Expedición al Nether Pack 33.0

- `expedicion_al_nether` añade once recompensas monetarias únicas por `30 B`.
- Todas usan `team_reward: true`; ninguna quest es repetible y ninguna recompensa entrega objetos del Nether, equipo o contenido de Eras posteriores.
- La economía queda en 90 definiciones monetarias repartidas en 18 capítulos: 77 únicas y 13 repetibles. La suma teórica de recompensas únicas es `794 B`.
- Si un mismo miembro reclamara toda la expedición, el techo de la ruta única anterior pasaría de `648 B` a `678 B` (`6 O + 7 P + 8 B`).
- No cambian monedas, ratios, cooldowns, contratos repetibles ni las doce ofertas del Mercader.

### Expedición al Aether Pack 33.1

- `expedicion_al_aether` añade catorce recompensas monetarias únicas por `43 B`.
- Todas usan `team_reward: true`; ninguna quest es repetible y ninguna recompensa entrega armas, armaduras, accesorios, llaves de dungeon o loot excepcional del Aether.
- La economía queda en 104 definiciones monetarias repartidas en 19 capítulos: 91 únicas y 13 repetibles. La suma teórica de recompensas únicas es `837 B`.
- Si un mismo miembro reclamara toda la expedición, el techo de la ruta única anterior pasaría de `678 B` a `721 B` (`7 O + 2 P + 1 B`).
- No cambian monedas, ratios, cooldowns, contratos repetibles ni las doce ofertas del Mercader.

### Expedición al Otherside Pack 33.2

- `expedicion_al_otherside` añade diez recompensas monetarias únicas por `30 B`.
- El reparto real es `2 + 3 + 3 + 3 + 4 + 4 + 3 + 3 + 3 + 2 B = 30 B`.
- Las tres quests sin recompensa monetaria son la introducción, la orientación para abrir el portal nativo y el cierre final.
- Todas las recompensas monetarias usan `team_reward: true`; ninguna quest es repetible.
- La quest del `Heart of the Deep` comprueba posesión con `consume_items: false`, por lo que no destruye el objeto necesario para la progresión nativa.
- Ninguna recompensa entrega el `Heart of the Deep`, equipo avanzado, loot del `Ancient Temple` ni objetos excepcionales de Deeper and Darker.
- La economía queda en 114 definiciones monetarias repartidas en 20 capítulos: 101 únicas y 13 repetibles. La suma teórica de recompensas únicas pasa a `867 B`.
- Si un mismo miembro reclamara toda la expedición, el techo de la ruta única anterior pasaría de `721 B` a `751 B` (`7 O + 5 P + 1 B`).
- No cambian monedas, ratios, cooldowns, contratos repetibles ni las doce ofertas del Mercader.

### Estado económico consolidado tras Pack 33.2

| Métrica | Estado |
|---|---:|
| Definiciones monetarias | 114 |
| Recompensas únicas | 101 |
| Recompensas repetibles | 13 |
| Capítulos con recompensas monetarias | 20 |
| Suma teórica de recompensas únicas | 867 B |
| Techo de ruta única acumulada usado por el documento | 751 B |
| Techo repetible teórico combinado | 24 B/día |

El total de `867 B` es una suma teórica de todas las recompensas únicas y no representa una ruta jugable completa, porque existen ramas de clase y especialización mutuamente excluyentes.

El valor de `751 B` sigue el criterio histórico del documento para la ruta máxima compatible, añadiendo las nuevas recompensas únicas implementadas desde Pack 32.1.

Los `24 B/día` representan un techo teórico de los sistemas repetibles actuales:

- `7 B/día` de pesca;
- `9 B/día` de Casa de Contratos;
- `8 B/día` de Intendencia.

No incluye posibles recompensas futuras de Hordas, bosses, dragones ni otros Realms.

## Validación manual requerida

No se automatiza la GUI. Carlos debe realizar esta prueba en un mundo aislado:

1. Arrancar tras sincronizar el pack y confirmar que KubeJS no registra errores de startup.
2. Comprobar en creativo o con permisos de operador los tres IDs y sus nombres, tooltips, texturas y stack máximo de 64.
3. Abrir usos/recetas en JEI y confirmar que ninguna moneda tiene receta ni procesamiento.
4. Si el Mercader de prueba aún usa el preset 1.0.0, eliminar solo esa entidad de prueba e importar una vez:

   ```text
   /easy_npc preset import_new custom easy_npc:preset/humanoid/nexus_merchant.npc.snbt ~ ~ ~
   ```

5. Hacer clic, pulsar `Comerciar` y comprobar las 12 ofertas.
6. Probar los cuatro cambios en ambos sentidos y confirmar que las cantidades son `10:1`, `1:10`, `10:1` y `1:10`.
7. Comprar al menos un lote de pan y confirmar que descuenta exactamente 3 Bronce.
8. Reclamar una recompensa monetaria de una quest de prueba y confirmar que entrega la cantidad configurada al jugador que reclama y respeta `team_reward` cuando corresponda.
9. Probar al menos una recompensa repetible de pesca, Casa de Contratos e Intendencia y confirmar su cooldown real.
10. Abrir los capítulos de Nether, Aether y Otherside y confirmar que sus recompensas coinciden con la configuración documentada.
11. Reiniciar el mundo y comprobar que el Mercader conserva ofertas, invulnerabilidad, inmovilidad y persistencia sin duplicarse.

## PENDIENTE

- tiendas especializadas y comerciantes por Era;
- nuevos sumideros de moneda;
- nuevos servicios y contratos avanzados;
- objetos cosméticos;
- economía avanzada;
- balance económico final con datos reales de campaña;
- evaluación económica final de Hordas, bosses, dragones y Realms futuros.

Nada de esta sección está implementado en los Packs 28.1–33.2 salvo que se documente explícitamente en una sección anterior.