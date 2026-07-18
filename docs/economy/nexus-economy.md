# Economía del Nexus — Pack 28.1

## IMPLEMENTADO

### Arquitectura

```text
FTB Quests
    -> recompensa monedas físicas por jugador
    -> reclamación manual

Mercader del Nexus (Easy NPC)
    -> cambio neutral entre denominaciones
    -> venta de suministros globales
```

La economía no añade comprobaciones por tick, recetas, drops ni generación automática. History Stages continúa siendo la única autoridad de restricciones; el Mercader no implementa un sistema paralelo.

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

Se conserva el NPC `nexus_merchant`, su nombre, apariencia, persistencia, invulnerabilidad, inmovilidad y apertura de diálogo. El preset queda en versión `1.1.0`; sus tres botones contextuales `Comerciar` usan la acción nativa verificada `OPEN_TRADING_SCREEN` y abren el mismo catálogo.

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

Los IDs vanilla del catálogo no aparecen en las restricciones locales de History Stages. El Mercader no vende diamante, netherite, Waystones, armas, armaduras, TaCZ, grimorios, recursos de Allomancy, Lerasium, loot de bosses ni contenido de Eras futuras.

### Recompensas FTB Quests

FTB Quests instalado: `2001.4.22`.

`config/ftbquests/quests/data.snbt` mantiene:

- `default_reward_team: false`: la recompensa es individual;
- `default_autoclaim_rewards: "disabled"`: cada jugador debe reclamarla.

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
| `exploracion_y_hordas` | `2710000000002005` | Más allá del vacío | 2 Plata | milestone de exploración |
| `exploracion_y_hordas` | `2710000000002012` | Primera defensa | 2 Plata | milestone de defensa |

No se añadió moneda al capítulo `desafios_y_bosses`: las recompensas económicas directas de bosses quedan reservadas para una decisión posterior.

### Balance por campaña

Todas las cifras se expresan en bronce-equivalentes:

| Recorrido | Valor | Equivalencia |
|---|---:|---:|
| campaña principal | 406 | 4 Oro + 6 Bronce |
| Guerrero | 38 | 3 Plata + 8 Bronce |
| Pistolero | 38 | 3 Plata + 8 Bronce |
| Mago común | 18 | 1 Plata + 8 Bronce |
| Arcanista | 40 | 4 Plata |
| Metalomante | 50 | 5 Plata |
| exploración y primera defensa | 60 | 6 Plata |
| principal + Guerrero/Pistolero + exploración | 504 | 5 Oro + 4 Bronce |
| principal + Mago + Arcanista + exploración | 524 | 5 Oro + 2 Plata + 4 Bronce |
| principal + Mago + Metalomante + exploración | 534 | 5 Oro + 3 Plata + 4 Bronce |

Solo el final de campaña entrega Oro directamente. El resto del Oro posible procede de convertir, sin beneficio, el mismo valor ganado en Bronce y Plata.

### Fuentes y sumideros

Fuentes implementadas:

- las 29 recompensas item de FTB Quests enumeradas arriba.

Sumideros implementados:

- las ocho ofertas de suministros del Mercader.

Conversión:

- cuatro ofertas neutrales 10:1 y 1:10.

No hay otras fuentes o sumideros.

## Validación manual requerida

No se automatiza la GUI. Carlos debe realizar esta prueba en un mundo aislado:

1. Arrancar tras sincronizar el pack y confirmar que KubeJS no registra errores de startup.
2. Comprobar en creativo o con permisos de operador los tres IDs y sus nombres, tooltips, texturas y stack máximo de 64.
3. Abrir usos/recetas en JEI y confirmar que ninguna moneda tiene receta ni procesamiento.
4. Si el Mercader de prueba aún usa el preset 1.0.0, eliminar solo esa entidad de prueba e importar una vez:

   ```text
   /easy_npc preset import_new custom easy_npc:preset/humanoid/nexus_merchant.npc.snbt
   ```

5. Hacer clic, pulsar `Comerciar` y comprobar las 12 ofertas.
6. Probar los cuatro cambios en ambos sentidos y confirmar que las cantidades son `10:1`, `1:10`, `10:1` y `1:10`.
7. Comprar al menos un lote de pan y confirmar que descuenta exactamente 3 Bronce.
8. Reclamar una recompensa monetaria de una quest de prueba y confirmar que entrega la cantidad configurada al jugador, no a todo el equipo.
9. Reiniciar el mundo y comprobar que el Mercader conserva ofertas, invulnerabilidad, inmovilidad y persistencia sin duplicarse.

## PLANIFICADO

- tiendas o servicios específicos de `warrior_master`, `arcane_master`, `metallurgist_master`, `gunsmith` y `explorer`;
- economía propia de munición o consumibles TaCZ;
- recursos permitidos de Metalomante;
- servicios de clase;
- recompensas monetarias de bosses, solo si se aprueban y balancean en otro pack;
- nuevos sumideros y revisión de precios con telemetría real de campaña.

Nada de esta sección está implementado en Pack 28.1.
