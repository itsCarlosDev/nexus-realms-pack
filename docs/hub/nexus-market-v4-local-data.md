# Nexus Market V4 — datos locales verificados

## Fuentes locales

- Repositorio: `C:\Users\spend\Documents\Proyectos_Github\NexusRealms_dev`
- Rama comprobada: `dev`
- Instancia: `C:\Users\spend\AppData\Roaming\PrismLauncher\instances\NexusRealmsDEV-instance(1)\minecraft`
- Schematic analizado: `C:\Users\spend\Desktop\nexus_market_spawn_nexus_realms_v3.schem`
- SHA-256 del schematic: `ada57e923137a638c8bdbb04ad83359e53886469bed6768c5050fe71e091bd10`
- Cliente local: Minecraft `1.20.1`, `world_version` `3465`

La seguridad aproximada con WorldEdit se clasifica así:

- **Alta**: bloque estático sin BlockEntity.
- **Media**: bloque con BlockEntity o estado funcional que debe reconstruirse/sincronizarse al pegar.
- **Baja**: bloque incompleto, estado inválido o datos NBT imprescindibles ausentes.

## `nexus_market_spawn_nexus_realms_v3.schem`

### Cabecera y dimensiones

| Dato | Valor |
|---|---:|
| Formato Sponge | `Version = 2` |
| `DataVersion` guardado | `2730` |
| Ancho | `135` |
| Alto | `61` |
| Largo | `103` |
| Volumen | `848205` bloques |
| `Offset` | `[-8468, 67, -4935]` |
| WorldEdit offset | `[-15, 0, -50]` |
| FAWE version guardada | `402` |
| Bytes de `BlockData` | `853425` |
| Índices decodificados | `848205` |

`DataVersion = 2730` no corresponde al cliente instalado: Minecraft `1.20.1` declara `world_version = 3465`.

### Palette

| Dato | Valor |
|---|---:|
| `PaletteMax` | `366` |
| Entradas reales | `366` |
| Rango de índices | `0..365` |
| Índices contiguos | Sí |
| Índices usados | `323` |
| Entradas no usadas | `43` |
| Índices de bloque inválidos en `BlockData` | `0` |
| Estados `minecraft` | `358` |
| Estados `create` | `7` |
| Estados `waystones` | `1` |
| IDs base únicos | `168` |
| IDs base sin blockstate local | `0` |
| Aire | `817719` |
| Bloques no aire | `30486` |

Los `168` IDs base se cruzaron con los blockstates de los JARs locales de Minecraft, Create y Waystones. Todos tienen recurso de blockstate.

### Bloques modded usados

| Índice | Estado exacto | Cantidad |
|---:|---|---:|
| 333 | `waystones:waystone` | 1 |
| 338 | `create:brass_casing` | 41 |
| 339 | `create:andesite_casing` | 17 |
| 340 | `create:large_cogwheel[axis=z]` | 4 |
| 346 | `create:shaft[axis=y]` | 4 |
| 347 | `create:cogwheel[axis=y]` | 9 |
| 348 | `create:fluid_pipe` | 12 |
| 360 | `create:large_cogwheel[axis=y]` | 1 |

Totales por ID base:

| ID | Cantidad |
|---|---:|
| `create:andesite_casing` | 17 |
| `create:brass_casing` | 41 |
| `create:cogwheel` | 9 |
| `create:fluid_pipe` | 12 |
| `create:large_cogwheel` | 5 |
| `create:shaft` | 4 |
| `waystones:waystone` | 1 |

### BlockEntities y Entities

Hay `49` BlockEntities y `0` Entities.

| BlockEntity ID | Cantidad |
|---|---:|
| `minecraft:barrel` | 14 |
| `minecraft:sign` | 8 |
| `minecraft:blast_furnace` | 6 |
| `minecraft:end_portal` | 4 |
| `minecraft:banner` | 4 |
| `minecraft:bed` | 4 |
| `minecraft:ender_chest` | 3 |
| `minecraft:campfire` | 2 |
| `minecraft:smoker` | 2 |
| `minecraft:lectern` | 1 |
| `minecraft:enchanting_table` | 1 |

Todos los BlockEntities están dentro de las dimensiones y coinciden con un bloque compatible en su posición. Los ocho carteles usan el formato NBT antiguo `Text1`–`Text4`, coherente con el `DataVersion` guardado, no el formato `front_text` de 1.20.1.

### Errores y datos incompletos comprobados

1. `minecraft:cauldron[level=0]`
   - Cantidad: `1`.
   - Coordenada interna: `[88, 1, 35]`.
   - `minecraft:cauldron` es `CauldronBlock` y no registra la propiedad `level`. La propiedad pertenece a `LayeredCauldronBlock`.
   - Seguridad WorldEdit: **baja**.

2. `waystones:waystone`
   - Cantidad: `1`.
   - Coordenada interna: `[84, 2, 36]`.
   - La palette omite propiedades, por lo que usa el estado por defecto local: `facing=north`, `half=lower`, `origin=unknown`, `waterlogged=false`.
   - No existe la mitad `upper`.
   - No existe BlockEntity Waystones en `BlockEntities`.
   - El bloque local es doble y elimina una mitad si la otra no está presente durante una actualización de vecinos.
   - Si llegara a cargar sin NBT, su BlockEntity inicializa un Waystone nuevo con UUID nuevo; no conserva nombre, propietario ni identidad previa.
   - Seguridad WorldEdit: **baja**.

No se encontraron IDs base inexistentes. Los defectos comprobados son un estado inválido, un multibloque incompleto sin NBT y la discrepancia entre `DataVersion 2730` y Minecraft `1.20.1 / 3465`.

## DecoCraft

### JAR real

| Dato | Valor |
|---|---|
| Archivo | `decocraft-3.0.4-1.20.1-slim.jar` |
| Ruta | `C:\Users\spend\AppData\Roaming\PrismLauncher\instances\NexusRealmsDEV-instance(1)\minecraft\mods\decocraft-3.0.4-1.20.1-slim.jar` |
| Tamaño | `94319937` bytes |
| SHA-1 | `5e98ca7929590361bee24c64a0c140447e67ea78` |
| `modId` | `decocraft` |
| Versión de manifiesto | `3.0.4-1.20.1` |
| Blockstates | `3987` |
| Nombres `block.decocraft.*` | `3987` |

BlockEntity types registrados por el JAR:

- `decocraft:decocraft`
- `decocraft:decocraft_animated`
- `decocraft:decocraft_decobench`
- `decocraft:decocraft_decomposer`

Los bloques estáticos normales solo crean `decocraft:decocraft` cuando tienen `script.trigger` o más de una imagen de flipbook. Los tipos `animated`, `decobench` y `decomposer` siempre crean su BlockEntity específico.

### Mercado

| Objeto local | ID exacto | BlockEntity | Seguridad WorldEdit |
|---|---|---:|---|
| Fruit Cart | `decocraft:fruit_cart` | No | Alta |
| Barrel Apples Mix | `decocraft:barrel_apples_mix` | No | Alta |
| Barrel Carrots | `decocraft:barrel_carrots` | No | Alta |
| Baguette Basket | `decocraft:baguette_basket` | No | Alta |
| Vintage Cash Register | `decocraft:vintage_cash_register` | No | Alta |
| Display Counter Bottom Oak | `decocraft:display_counter_bottom_oak` | No | Alta |
| Display Counter Top Pastries | `decocraft:display_counter_top_pastries` | No | Alta |
| Sign Produce | `decocraft:hanging_produce` | No | Alta |

### Ayuntamiento

| Objeto local | ID exacto | BlockEntity | Seguridad WorldEdit |
|---|---|---:|---|
| Modular Desk Plank Spruce | `decocraft:modular_desk_plank_spruce` | No | Alta |
| Office Chair Spruce | `decocraft:office_chair_spruce` | No | Alta |
| Filing Cabinet Spruce | `decocraft:filing_cabinet_spruce` | No | Alta |
| Antique Globe | `decocraft:globe_antique` | No | Alta |
| World Map | `decocraft:world_map` | No | Alta |
| Grandfather Clock | `decocraft:grandfather_clock` | No | Alta |
| Typewriter Black | `decocraft:typewriter_black` | No | Alta |

`office_chair_spruce` es de tipo `seat`: el bloque no tiene BlockEntity; la entidad de asiento se crea al usarlo y no forma parte del bloque copiado.

### Guerrero

| Objeto local | ID exacto | BlockEntity | Seguridad WorldEdit |
|---|---|---:|---|
| Training Dummy | `decocraft:trainingdummy` | No | Alta |
| Sign Armorer | `decocraft:hanging_armorer` | No | Alta |
| Sign Shield | `decocraft:hanging_shield` | No | Alta |
| Sign Swords | `decocraft:hanging_swords` | No | Alta |

### Arcanista

| Objeto local | ID exacto | BlockEntity | Seguridad WorldEdit |
|---|---|---:|---|
| Sign Magic Shop | `decocraft:hanging_magic` | No | Alta |
| Crystal Ball | `decocraft:crystal_ball` | No | Alta |
| Spellbook, frame inicial | `decocraft:spellbook_flipbook.00` | Sí, `decocraft:decocraft` | Media |
| Witch Cauldron, frame inicial | `decocraft:witch_cauldron_flipbook.00` | Sí, `decocraft:decocraft` | Media |

`spellbook_flipbook.00` emite luz `15`. `witch_cauldron_flipbook.00` emite luz `10`.

### Metalomante

| Objeto local | ID exacto | BlockEntity | Seguridad WorldEdit |
|---|---|---:|---|
| Sign Blacksmith | `decocraft:hanging_blacksmith` | No | Alta |
| Decobench | `decocraft:decobench` | Sí, `decocraft:decocraft_decobench` | Media |
| Decomposer | `decocraft:decomposer` | Sí, `decocraft:decocraft_decomposer` | Media |

El catálogo local no contiene props llamados anvil, forge, furnace, hammer, gear o tool rack. La única referencia explícita a herrería es `hanging_blacksmith`.

### Pistolero

No se encontró ningún bloque del catálogo local cuyo nombre o registry ID identifique pistola, revólver, rifle, escopeta, munición, arma de fuego, sheriff, saloon o blanco de tiro. No hay un ID DecoCraft directo comprobado para esta categoría.

`decocraft:004_dpop_bulletphase` existe, pero es una figura Patreon llamada “DecoPop BulletPhase 004”, no un objeto de armamento.

### Explorador

| Objeto local | ID exacto | BlockEntity | Seguridad WorldEdit |
|---|---|---:|---|
| Sign Camping | `decocraft:hanging_camping` | No | Alta |
| Backpack Green | `decocraft:backpack_green` | No | Alta |
| World Map | `decocraft:world_map` | No | Alta |
| Globe | `decocraft:globe` | No | Alta |
| Antique Globe | `decocraft:globe_antique` | No | Alta |

No se encontraron bloques llamados tent, compass, binoculars o telescope.

### Iluminación

| Objeto local | ID exacto | Luz | BlockEntity | Seguridad WorldEdit |
|---|---|---:|---:|---|
| Stained Glass Chandelier Embers On | `decocraft:stained_glass_chandelier_embers_on` | 15 | No | Alta |
| Stained Glass Sconce Embers On | `decocraft:stained_glass_sconce_embers_on` | 15 | No | Alta |
| Stained Glass Hanging Lamp Embers On | `decocraft:stained_glass_hanging_lamp_embers_on` | 15 | No | Alta |
| Stained Glass Table Lamp Embers On | `decocraft:stained_glass_table_lamp_embers_on` | 15 | No | Alta |
| Paper Lantern Cream | `decocraft:paper_lantern_1_cream` | 15 | No | Alta |
| Chandelier Medieval, frame inicial | `decocraft:chandelier_medieval.00` | 15 | Sí, `decocraft:decocraft` | Media |
| Candle Holder Wall 1 Gold, frame inicial | `decocraft:candle_holder_wall_1_gold_flipbook.00` | 15 | Sí, `decocraft:decocraft` | Media |

### Errores locales de loot tables

El `latest.log` local registra `28` loot tables de DecoCraft que no se pueden parsear porque intentan usar variantes sin item registrado:

- `china_cabinet_open_birch`
- `china_cabinet_open_black`
- `china_cabinet_open_cherry`
- `china_cabinet_open_ebony`
- `china_cabinet_open_oak`
- `china_cabinet_open_palm`
- `china_cabinet_open_spruce`
- `china_cabinet_open_white`
- `laptop_closed_black`
- `laptop_closed_pink`
- `laptop_closed_silver`
- `picnic_basket`
- `picnic_basket_closed`
- `school_desk_open_black`
- `school_desk_open_blue`
- `school_desk_open_cyan`
- `school_desk_open_gray`
- `school_desk_open_green`
- `school_desk_open_light_blue`
- `school_desk_open_light_gray`
- `school_desk_open_lime`
- `school_desk_open_magenta`
- `school_desk_open_orange`
- `school_desk_open_pink`
- `school_desk_open_purple`
- `school_desk_open_red`
- `school_desk_open_white`
- `school_desk_open_yellow`

Estas variantes no se han incluido como candidatos seguros.

## Create y Create Crafts & Additions

### JARs reales

| Mod | Archivo | Hash comprobado |
|---|---|---|
| Create | `create-1.20.1-6.0.8.jar` | SHA-1 `b13d912b9247a38d66d11598c121442585a1c1e9` |
| Create Crafts & Additions | `createaddition-1.20.1-1.3.3.jar` | SHA-512 `a34f5c3b0226069d2882a3e23ba0e364a78bc5d26983b0cecea8d998718f454d3238ab7c5b4b3ef1749b6f2b26a4e427839c7c32468558fa7a8edb0edc727d10` |

### IDs verificados

| Grupo | ID exacto | BlockEntity | Seguridad WorldEdit |
|---|---|---:|---|
| Engranaje | `create:cogwheel` | Sí | Media |
| Engranaje grande | `create:large_cogwheel` | Sí | Media |
| Engranaje encased | `create:andesite_encased_cogwheel` | Sí | Media |
| Engranaje encased | `create:brass_encased_cogwheel` | Sí | Media |
| Eje | `create:shaft` | Sí | Media |
| Eje encased | `create:andesite_encased_shaft` | Sí | Media |
| Eje encased | `create:brass_encased_shaft` | Sí | Media |
| Casing | `create:andesite_casing` | No | Alta |
| Casing | `create:brass_casing` | No | Alta |
| Casing | `create:copper_casing` | No | Alta |
| Casing | `create:railway_casing` | No | Alta |
| Tubería | `create:fluid_pipe` | Sí | Media |
| Tubería | `create:encased_fluid_pipe` | Sí | Media |
| Tubería | `create:glass_fluid_pipe` | Sí | Media |
| Tubería | `create:smart_fluid_pipe` | Sí | Media |
| Bomba | `create:mechanical_pump` | Sí | Media |
| Motor creativo | `create:creative_motor` | Sí | Media |
| Motor eléctrico | `createaddition:electric_motor` | Sí | Media |
| Nixie naranja/base | `create:nixie_tube` | Sí | Media |
| Nixie negro | `create:black_nixie_tube` | Sí | Media |
| Nixie azul | `create:blue_nixie_tube` | Sí | Media |
| Nixie marrón | `create:brown_nixie_tube` | Sí | Media |
| Nixie cian | `create:cyan_nixie_tube` | Sí | Media |
| Nixie gris | `create:gray_nixie_tube` | Sí | Media |
| Nixie verde | `create:green_nixie_tube` | Sí | Media |
| Nixie azul claro | `create:light_blue_nixie_tube` | Sí | Media |
| Nixie gris claro | `create:light_gray_nixie_tube` | Sí | Media |
| Nixie lima | `create:lime_nixie_tube` | Sí | Media |
| Nixie magenta | `create:magenta_nixie_tube` | Sí | Media |
| Nixie rosa | `create:pink_nixie_tube` | Sí | Media |
| Nixie morado | `create:purple_nixie_tube` | Sí | Media |
| Nixie rojo | `create:red_nixie_tube` | Sí | Media |
| Nixie blanco | `create:white_nixie_tube` | Sí | Media |
| Nixie amarillo | `create:yellow_nixie_tube` | Sí | Media |
| Lámpara | `create:rose_quartz_lamp` | No | Alta |
| Conector luminoso | `createaddition:small_light_connector` | Sí | Media |

Los bloques cinéticos, tuberías, bomba, motores y Nixie usan BlockEntities. Al pegarlos, Create debe recalcular redes cinéticas, conexiones de fluidos y contenido visual. Los casings y `rose_quartz_lamp` son bloques sin BlockEntity.

## FTB Quests

### Versión real

| Dato | Valor |
|---|---|
| Archivo | `ftb-quests-forge-2001.4.22.jar` |
| Tamaño | `1255469` bytes |
| SHA-1 | `70f3bd771ab3b5921ce1ff5f14166fab694ca1aa` |
| `modId` | `ftbquests` |
| Versión de manifiesto | `2001.4.22` |

### Árbol de comandos registrado

- `/ftbquests editing_mode`
- `/ftbquests editing_mode <enabled>`
- `/ftbquests editing_mode <enabled> <player>`
- `/ftbquests locked`
- `/ftbquests locked <enabled>`
- `/ftbquests locked <enabled> <player>`
- `/ftbquests delete_empty_reward_tables`
- `/ftbquests change_progress <players> reset <quest_object>`
- `/ftbquests change_progress <players> complete <quest_object>`
- `/ftbquests export_reward_table_to_chest <reward_table>`
- `/ftbquests export_reward_table_to_chest <reward_table> <pos>`
- `/ftbquests import_reward_table_from_chest <name>`
- `/ftbquests import_reward_table_from_chest <name> <pos>`
- `/ftbquests generate_chapter_with_all_items_in_game`
- `/ftbquests reload`
- `/ftbquests block_rewards`
- `/ftbquests block_rewards <enabled>`
- `/ftbquests block_rewards <enabled> <player>`
- `/ftbquests open_book`
- `/ftbquests open_book <quest_object>`
- `/ftbquests clear_item_display_cache`

## EasyNPC

EasyNPC no está instalado:

- no existe descriptor `mods/easynpc.pw.toml`;
- no existe JAR cuyo nombre contenga `easynpc` o `easy-npc` en la carpeta de mods de la instancia;
- el listado local de mods no contiene otro JAR identificado como EasyNPC.

## Waystones

### Versión real

| Dato | Valor |
|---|---|
| Archivo | `waystones-forge-1.20.1-14.1.20.jar` |
| Tamaño | `533738` bytes |
| SHA-1 | `cde06d0f1e9042fb2e0b536a4d2c5443d129dd51` |
| `modId` | `waystones` |
| Versión de manifiesto | `14.1.20` |

### Comportamiento en schematic

`waystones:waystone` es un bloque doble con BlockEntity `WaystoneBlockEntity`.

- Estado por defecto: `facing=north`, `half=lower`, `origin=unknown`, `waterlogged=false`.
- La mitad inferior necesita una mitad superior compatible; una actualización de vecinos puede convertirla en aire si falta.
- Sin UUID NBT, el BlockEntity crea y registra un Waystone nuevo con UUID aleatorio al cargar en servidor.
- Con UUID NBT, intenta enlazar con el Waystone existente del `WaystoneManager`.
- El schematic V3 solo contiene la mitad inferior y no contiene NBT Waystones.

Resultado local comprobado para este V3: no copia una identidad de Waystone existente y no representa un Waystone doble válido. Seguridad WorldEdit: **baja**.
