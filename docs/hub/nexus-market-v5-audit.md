# Nexus Market V5 — auditoría local

## Archivos generados

| Archivo | Bytes | Palette | Bloques no aire | SHA-256 |
|---|---:|---:|---:|---|
| `nexus_market_spawn_nexus_realms_v5_base.schem` | 11827 | 111 | 31286 | `a66d7d4eb2b44ba913bff53f023c730a0d9c8e37be00f70033db820894214e2d` |
| `nexus_market_spawn_nexus_realms_v5_decocraft.schem` | 1922 | 36 | 57 | `4e0e92fb61fc4fb8b93e6796d0935c81b877c5147f0cdf997dc008a9f443f16c` |
| `nexus_market_spawn_nexus_realms_v5.schem` | 12788 | 145 | 31337 | `b167b4c5639235e7942bf9b4a5f43bc045e02c53a88e0df0f1ae59d3db748db6` |

Los tres archivos V4 se conservaron con sus hashes originales. El overlay V5 contiene aire fuera de sus props y debe pegarse con `//paste -a`; el combined incluye base + DecoCraft.

## Geometría

- Dimensiones: `135 × 61 × 103` (`848205` posiciones).
- Offset NBT: `[-8468, 67, -4935]`; WEOffset: `[-15, 0, -50]`.
- Centro del Nexus: `68,52`.
- Waystone reservado, no incluido: `WAYSTONE_INSERT_POSITION = 109,4,24`.
- Bloques fuera de límites: `0`.
- Estructuras cortadas en límites: `0`.
- Edificios que alcanzan un límite del schematic: `0`.
- Solapes no aprobados entre edificios: `0`.
- Componentes flotantes detectables: `0`.
- Bloques aislados: `0`.
- Bloques Create/Create Deco flotantes: `0`.
- Anclas de caminos desconectadas: `0`.
- Distancia mínima Nexus–edificio: `12.00` bloques.
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
| West spice market | 98 | 0 |
| West provisions market | 98 | 0 |
| East textile market | 98 | 0 |
| East produce market | 98 | 0 |

## Separación del Nexus

| Edificio | Distancia mínima |
|---|---:|
| Arcanist library | 16.97 |
| Arcanist observatory | 17.00 |
| East produce market | 15.52 |
| East textile market | 15.30 |
| Explorer lodge | 26.93 |
| Gunsmith armory | 27.86 |
| Metallurgist workshop | 18.00 |
| Nether transit shrine | 44.28 |
| Town Hall central nave | 14.00 |
| Town Hall clock tower | 27.00 |
| Town Hall east wing | 20.12 |
| Town Hall entrance | 12.00 |
| Town Hall west wing | 20.12 |
| Warrior guildhall | 26.42 |
| Warrior training yard | 29.61 |
| Waystone transit pavilion | 24.70 |
| West provisions market | 15.52 |
| West spice market | 15.30 |

## Bloques de mods

| Registry ID | Cantidad |
|---|---:|
| `create:andesite_casing` | 4 |
| `create:brass_casing` | 5 |
| `create:copper_casing` | 16 |
| `createdeco:andesite_support` | 29 |
| `createdeco:blue_brass_lamp` | 9 |
| `createdeco:blue_copper_lamp` | 7 |
| `createdeco:brass_support` | 49 |
| `createdeco:copper_sheet_metal` | 56 |
| `createdeco:copper_support` | 16 |
| `createdeco:industrial_iron_sheet_metal` | 77 |
| `createdeco:industrial_iron_support` | 40 |
| `decocraft:backpack_green` | 1 |
| `decocraft:baguette_basket` | 2 |
| `decocraft:barrel_apples_mix` | 3 |
| `decocraft:barrel_carrots` | 2 |
| `decocraft:crystal_ball` | 2 |
| `decocraft:display_counter_bottom_oak` | 2 |
| `decocraft:display_counter_top_pastries` | 2 |
| `decocraft:filing_cabinet_spruce` | 3 |
| `decocraft:fruit_cart` | 2 |
| `decocraft:globe` | 1 |
| `decocraft:globe_antique` | 2 |
| `decocraft:grandfather_clock` | 1 |
| `decocraft:hanging_armorer` | 1 |
| `decocraft:hanging_camping` | 1 |
| `decocraft:hanging_magic` | 1 |
| `decocraft:hanging_produce` | 3 |
| `decocraft:hanging_shield` | 1 |
| `decocraft:hanging_swords` | 1 |
| `decocraft:modular_desk_plank_spruce` | 4 |
| `decocraft:office_chair_spruce` | 2 |
| `decocraft:paper_lantern_1_cream` | 8 |
| `decocraft:stained_glass_chandelier_embers_on` | 3 |
| `decocraft:stained_glass_hanging_lamp_embers_on` | 1 |
| `decocraft:trainingdummy` | 3 |
| `decocraft:typewriter_black` | 1 |
| `decocraft:vintage_cash_register` | 2 |
| `decocraft:world_map` | 2 |

## Posiciones NPC reservadas

| ID | Nombre | x | y | z | Orientación | Zona |
|---|---|---:|---:|---:|---|---|
| `nexus_custodian` | Custodio del Nexus | 68 | 2 | 15 | south | Ayuntamiento / hall |
| `chronicler` | Cronista | 48 | 2 | 18 | east | Ayuntamiento / archivo |
| `guard_captain` | Capitán de la Guardia | 88 | 2 | 18 | west | Ayuntamiento / táctica |
| `warrior_master` | Maestro Guerrero | 24 | 2 | 25 | south | Gremio Guerrero |
| `arcane_master` | Maestro Arcanista | 41 | 2 | 86 | east | Biblioteca Arcanista |
| `metallurgist_master` | Maestro Metalomante | 78 | 2 | 94 | north | Taller Metalomante |
| `gunsmith` | Armero | 116 | 2 | 80 | west | Armería Pistolero |
| `explorer` | Explorador | 110 | 2 | 36 | west | Lodge Explorador |
| `nexus_merchant` | Mercader del Nexus | 100 | 2 | 45 | east | Mercado este |

FramedBlocks no se serializó: sus formas necesitan BlockEntities de material/camouflage para verse correctamente y no se introdujeron placeholders opacos o potencialmente invisibles. Create Deco se usa solo en soportes, metal estructural e iluminación conectada físicamente.

## Resultado automático

- Gzip/NBT, dimensiones, DataVersion, Palette, BlockData y recuentos: válidos.
- `Entities = 0`; `BlockEntities = 0`.
- Sin Waystone funcional ni `minecraft:cauldron[level=0]`.
- Sin IDs ausentes en los JARs locales de Minecraft, Create, Create Deco y DecoCraft.
- Overlay DecoCraft limitado a la lista local de seguridad alta y sin las 28 loot tables defectuosas.
- Caminos principales conectados y cubiertas cerradas según proyección vertical.
