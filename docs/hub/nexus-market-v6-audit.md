# Nexus Market V6 — auditoría local

## Archivos generados

| Archivo | Bytes | Palette | Bloques no aire | SHA-256 |
|---|---:|---:|---:|---|
| `nexus_market_spawn_nexus_realms_v6_base.schem` | 20893 | 129 | 289338 | `c77c0cc7c7d3ea9716b4db298ba7432b16fa8fdb2591c1719224dfe15f978ca8` |
| `nexus_market_spawn_nexus_realms_v6_decocraft.schem` | 3267 | 49 | 104 | `43141f481f1d1948b853981c03f3dc49e346098d2479ca82e7cf6dcefe5807a0` |
| `nexus_market_spawn_nexus_realms_v6.schem` | 23186 | 177 | 289436 | `a6811a17aefe9eeef021d5df153fe9ec3961986bdaad60afb1524c34e910a449` |

Los tres archivos V4 y los tres V5 se conservaron con sus hashes originales. El overlay V6 contiene aire fuera de sus props y debe pegarse con `//paste -a`; el combined incluye base + DecoCraft.

## Geometría

- Dimensiones: `181 × 73 × 151` (`1995163` posiciones).
- Offset NBT: `[-8468, 67, -4935]`; WEOffset: `[-15, 0, -50]`.
- Centro del Nexus: `90,75`.
- Superficie del terreno incluido: `y=10`; cimentación continua hasta `y=0`.
- Waystone reservado, no incluido: `WAYSTONE_INSERT_POSITION = 145,14,36`.
- Bloques fuera de límites: `0`.
- Estructuras cortadas en límites: `0`.
- Edificios que alcanzan un límite del schematic: `0`.
- Solapes no aprobados entre edificios: `0`.
- Distancia mínima entre edificios no relacionados: `9.00` bloques.
- Columnas sin cimentación continua: `0`.
- Suelos o accesos sin apoyo inferior: `0`.
- Puertas incompletas o bloqueadas: `0`.
- Destinos interiores del Ayuntamiento inaccesibles desde la entrada: `0`.
- Componentes flotantes detectables: `0`.
- Bloques aislados: `0`.
- Bloques Create/Create Deco flotantes: `0`.
- Anclas de caminos desconectadas: `0`.
- Distancia mínima Nexus–edificio: `18.11` bloques.
- BlockEntities: `0`; Entities: `0`.
- IDs inválidos contra JARs locales: `0`.
- Blockstates inválidos contra recursos locales: `0`.
- Colisiones overlay/base no aprobadas: `0`.
- Reservas NPC con problemas de espacio o suelo: `0`.

## Continuidad de cubiertas

| Estructura | Celdas auditadas | Sin cubierta |
|---|---:|---:|
| Town Hall central nave | 682 | 0 |
| Town Hall west wing | 240 | 0 |
| Town Hall east wing | 240 | 0 |
| Town Hall entrance | 135 | 0 |
| Town Hall clock tower | 110 | 0 |
| Warrior guildhall | 500 | 0 |
| Waystone transit pavilion | 483 | 0 |
| Explorer lodge | 240 | 0 |
| Arcanist library | 552 | 0 |
| Arcanist observatory | 182 | 0 |
| Metallurgist workshop | 580 | 0 |
| Gunsmith armory | 621 | 0 |
| West spice market | 165 | 0 |
| West provisions market | 165 | 0 |
| East textile market | 165 | 0 |
| East produce market | 165 | 0 |

## Separación del Nexus

| Edificio | Distancia mínima |
|---|---:|
| Arcanist library | 29.41 |
| Arcanist observatory | 32.25 |
| East produce market | 19.70 |
| East textile market | 18.11 |
| Explorer lodge | 43.32 |
| Gunsmith armory | 52.80 |
| Metallurgist workshop | 34.79 |
| Nether arcane gateway | 46.87 |
| Town Hall central nave | 34.00 |
| Town Hall clock tower | 47.00 |
| Town Hall east wing | 38.47 |
| Town Hall entrance | 32.00 |
| Town Hall west wing | 38.90 |
| Warrior guildhall | 48.37 |
| Warrior training yard | 50.96 |
| Waystone transit pavilion | 41.18 |
| West provisions market | 20.62 |
| West spice market | 19.00 |

## Bloques de mods

| Registry ID | Cantidad |
|---|---:|
| `create:brass_casing` | 1 |
| `createdeco:andesite_support` | 5 |
| `createdeco:blue_brass_lamp` | 5 |
| `createdeco:blue_copper_lamp` | 3 |
| `createdeco:brass_support` | 21 |
| `createdeco:industrial_iron_sheet_metal` | 78 |
| `createdeco:industrial_iron_support` | 40 |
| `decocraft:backpack_green` | 3 |
| `decocraft:baguette_basket` | 10 |
| `decocraft:barrel_apples_mix` | 6 |
| `decocraft:barrel_carrots` | 4 |
| `decocraft:crystal_ball` | 2 |
| `decocraft:display_counter_bottom_oak` | 3 |
| `decocraft:display_counter_top_pastries` | 3 |
| `decocraft:filing_cabinet_spruce` | 5 |
| `decocraft:fruit_cart` | 5 |
| `decocraft:globe` | 1 |
| `decocraft:globe_antique` | 4 |
| `decocraft:grandfather_clock` | 2 |
| `decocraft:hanging_armorer` | 1 |
| `decocraft:hanging_camping` | 1 |
| `decocraft:hanging_magic` | 1 |
| `decocraft:hanging_produce` | 8 |
| `decocraft:hanging_shield` | 1 |
| `decocraft:hanging_swords` | 1 |
| `decocraft:modular_desk_plank_spruce` | 4 |
| `decocraft:office_chair_spruce` | 4 |
| `decocraft:paper_lantern_1_cream` | 4 |
| `decocraft:stained_glass_chandelier_embers_on` | 5 |
| `decocraft:stained_glass_hanging_lamp_embers_on` | 1 |
| `decocraft:stained_glass_sconce_embers_on` | 10 |
| `decocraft:stained_glass_table_lamp_embers_on` | 2 |
| `decocraft:trainingdummy` | 3 |
| `decocraft:typewriter_black` | 3 |
| `decocraft:vintage_cash_register` | 4 |
| `decocraft:world_map` | 3 |

## Posiciones NPC reservadas

| ID | Nombre | x | y | z | Orientación | Zona |
|---|---|---:|---:|---:|---|---|
| `nexus_custodian` | Custodio del Nexus | 90 | 12 | 18 | south | Ayuntamiento / hall |
| `chronicler` | Cronista | 70 | 12 | 21 | east | Ayuntamiento / archivo |
| `guard_captain` | Capitán de la Guardia | 110 | 12 | 21 | west | Ayuntamiento / táctica |
| `warrior_master` | Maestro Guerrero | 26 | 12 | 38 | south | Gremio Guerrero |
| `arcane_master` | Maestro Arcanista | 70 | 12 | 127 | east | Biblioteca Arcanista |
| `metallurgist_master` | Maestro Metalomante | 120 | 12 | 133 | north | Taller Metalomante |
| `gunsmith` | Armero | 156 | 12 | 125 | west | Armería Pistolero |
| `explorer` | Explorador | 146 | 12 | 48 | west | Lodge Explorador |
| `nexus_merchant` | Mercader del Nexus | 126 | 11 | 85 | west | Mercado este |

FramedBlocks no se serializó: sus formas necesitan BlockEntities de material/camouflage para verse correctamente y no se introdujeron placeholders opacos o potencialmente invisibles. Create Deco se usa solo en soportes, metal estructural e iluminación conectada físicamente.

## Resultado automático

- Gzip/NBT, dimensiones, DataVersion, Palette, BlockData y recuentos: válidos.
- `Entities = 0`; `BlockEntities = 0`.
- Sin Waystone funcional ni `minecraft:cauldron[level=0]`.
- Sin IDs ausentes en los JARs locales de Minecraft, Create, Create Deco y DecoCraft.
- Overlay DecoCraft limitado a la lista local de seguridad alta y sin las 28 loot tables defectuosas.
- Caminos principales conectados y cubiertas cerradas según proyección vertical.
- Ayuntamiento con puertas dobles funcionales, umbral, controles y circulación interior auditada.
- Crying obsidian integrado en Nexus y portal como fuente de partículas nativas sin entidades.
