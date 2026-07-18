# Nexus Market V4.1 — layout arquitectónico

## Resultado

La V4 conserva el volumen, los offsets y la periferia aprovechable de V3, y reconstruye el centro como una transición desde pueblo civil medieval hasta el Núcleo lítico-arcano.

Archivos generados:

- `generated/schematics/nexus_market_spawn_nexus_realms_v4_base.schem`
- `generated/schematics/nexus_market_spawn_nexus_realms_v4_decocraft.schem`
- `generated/schematics/nexus_market_spawn_nexus_realms_v4.schem`

El archivo base no contiene bloques DecoCraft. El overlay contiene aire y 67 colocaciones DecoCraft; debe pegarse ignorando aire. El combined se generó porque base y overlay pudieron combinarse, parsearse y validarse localmente.

## Dimensiones, origen y convención

| Campo | Valor |
|---|---:|
| Formato | Sponge schematic v2, gzip/NBT |
| DataVersion | 3465 |
| Width | 135 |
| Height | 61 |
| Length | 103 |
| Volumen | 848205 posiciones |
| NBT `Offset` | `[-8468, 67, -4935]` |
| Metadata `WEOffset` | `[-15, 0, -50]` |

Todas las coordenadas de este documento son relativas al schematic:

- `x`: 0–134, oeste a este.
- `y`: 0–60, abajo a arriba.
- `z`: 0–102, norte a sur.
- Centro arquitectónico del Nexus: `70,52` en el plano X/Z.
- Nivel principal transitable reconstruido: `y=1`; las posiciones de NPC y Waystone indican el bloque inferior que ocuparán.

## Mapa de zonas

```text
                           NORTE, z bajo

        Guerrero        Ayuntamiento       Waystone / Explorador
        x38–53          x53–82             x83–100
        z17–35          z15–32             z17–42

                  mercado norte y acceso principal

 OESTE     mercado ─── plaza / Núcleo ─── mercado     Pistolero
                      centro 70,52                     x102–119
                                                        z41–62

             Arcanista             Metalomante
             x50–67                x68–89
             z58–75                z74–90

                            SUR, z alto
```

La plaza central ocupa aproximadamente el círculo de radio 19 alrededor de `70,52`, con una reserva vertical despejada hasta `y=28` durante su reconstrucción. Tiene cuatro accesos cardinales y una conexión diagonal adicional hacia la estación Waystone.

## Plaza y Roca del Nexus

### Plaza

- Anillo peatonal de piedra, polished andesite, polished deepslate y polished blackstone.
- Cuatro accesos principales:
  - norte: `x68–72, z29–36`;
  - sur: `x68–72, z68–76`;
  - oeste: `x47–53, z50–54`;
  - este: `x87–102, z50–54`.
- Acceso diagonal a Waystone: recorrido aproximado desde `82,40` hasta `89,33`.
- Cuatro áreas de descanso alrededor de `57,39`, `83,39`, `57,65` y `83,65`.
- Los marcadores bajos del perímetro no interrumpen las líneas visuales hacia el monolito.

### Monolito

- Centro: `x=70, z=52`.
- Pedestal: `y=2–3`, radio máximo 7.
- Cuerpo lítico: `y=4–27`, altura total 24 bloques.
- Ancho principal real: aproximadamente 14 bloques por la combinación del cuerpo y las placas desplazadas.
- Materiales principales: deepslate bricks, cracked deepslate bricks, tuff, polished deepslate y polished blackstone bricks.
- Silueta irregular mediante centro desplazado por alturas, radios variables, cuatro placas de roca y corona dentada.
- Fractura principal visible en la cara sur, con profundidad de un bloque y luz oculta detrás.
- Fracturas secundarias laterales y marcas rúnicas pequeñas.
- Energía visible mediante cyan, purple y magenta stained glass, tres puntos de crying obsidian y `minecraft:light[level=12]` oculto.
- Crecimiento de amatista localizado: 7 `minecraft:amethyst_block` y 5 `minecraft:amethyst_cluster` en todo el schematic base; no se usan columnas de amatista.

### Contención Create

- Anillo estático de contención de diámetro aproximado 23 bloques.
- Cuatro pilonos en `59,52`, `81,52`, `70,41` y `70,63`.
- Arco posterior sobre `z=45`.
- Una red cinética visual compacta en la cara norte del mecanismo.
- Un circuito de instrumentación con tubería y bomba en el lateral este.
- No se usaron Nixie Tubes ni iluminación Create.

La arquitectura expresa una máquina construida para contener y estudiar el monolito; los componentes cinéticos no ocupan el conjunto como una fábrica.

## Ayuntamiento

Volumen reconstruido: `x53–82, z15–32`, con envolvente de limpieza `x52–83, z14–33`.

- Fachada monumental de deepslate, pilares de madera oscura, acceso sur de latón y remate de cobre envejecido.
- Cubierta oscura a dos aguas con cumbrera de cobre.
- Ventanas blancas estrechas e iluminación institucional cálida.
- Hall central amplio entre las alas interiores.
- Estrado del Custodio: `x65–71, z17–20`, niveles `y=2–3`.
- Archivo/Cronista: ala oeste, aproximadamente `x53–63, z17–29`.
- Zona táctica/Capitán: ala este, aproximadamente `x73–82, z17–29`.
- Recepción: `x61–75, z28–29`, con paso central libre.
- Tablón de misiones: pared de `x55–60`, entorno `z28–29`.
- Conexión directa con la plaza mediante escalones y corredor `x65–71, z33–36`.

No contiene NPCs ni lógica de misiones.

## Estación Waystone y Explorador

Zona reconstruida: `x83–100, z17–42`.

- Patio de polished andesite.
- Pedestal circular central de polished deepslate y polished blackstone.
- Cuatro pilares de deepslate con detalles de cobre y latón.
- Cubierta ligera cruciforme de madera oscura y cobre envejecido.
- Iluminación cian mediante soul lanterns.
- Bancos laterales, mesa de cartografía, lodestone y área de suministros.
- Puesto del Explorador en el sector sureste.
- Conexiones directas con plaza y Ayuntamiento.

`WAYSTONE_INSERT_POSITION = 91,2,29`

La reserva vertical `91,2,29` a `91,4,29` está vacía. El bloque Waystone funcional no está incluido en base, overlay ni combined.

## Distritos funcionales

### Guerrero

Zona `x38–53, z17–35`.

- Herrería con anvil, smithing table, crafting table y reserva metálica.
- Patio de entrenamiento con gravel, cercado y tres targets.
- Entrada amplia hacia plaza.
- Iluminación cálida.
- DecoCraft añade tres muñecos de entrenamiento y heráldica de armero, escudo y espadas.

### Arcanista

Zona `x50–67, z58–75`.

- Biblioteca de dos alas.
- Sala de estudio central.
- Ventana arcana violeta con luz oculta.
- Crecimiento cristalino pequeño y localizado.
- Iluminación con soul lanterns.
- DecoCraft añade un emblema mágico y dos crystal balls.

### Metalomante

Zona `x68–89, z74–90`.

- Laboratorio/taller de polished andesite y piedra oscura.
- Bastidor estático de andesite, copper y brass casing.
- Banco de trabajo central, anvil, smithing table y crafting table.
- No se construyó una segunda red cinética.
- Se preservó espacio interior para la integración posterior de Allomancy, sin modificarla.

### Pistolero

Zona `x102–119, z41–62`.

- Armería/taller industrial de deepslate y polished blackstone.
- Banco largo de trabajo.
- Casings Create usados como maquinaria estática.
- Dos targets y pilas de cajas de madera.
- Espacio libre para decoración TaCZ posterior.
- No se usó DecoCraft específico de armas.

### Explorador

Integrado en la estación Waystone, principalmente en `x94–98, z31–34`.

- Cartografía, lodestone, bancos y suministros.
- DecoCraft añade mapas, globos, mochila y emblema de acampada.

### Mercader

- Cuatro puestos desarrollados:
  - `x53–61, z38–44`;
  - `x79–87, z38–44`;
  - `x52–60, z61–67`;
  - `x80–88, z61–67`.
- Cubiertas alternas de madera oscura y cobre envejecido.
- Mostradores libres para circulación e interacción.
- Decoración comercial distribuida sin cerrar los cuatro accesos al Nexus.

## Posiciones NPC reservadas

Cada posición tiene una reserva libre de 3×3 bloques a la altura de interacción y no contiene ninguna Entity.

| ID | Nombre visible propuesto | x | y | z | Orientación | Zona |
|---|---|---:|---:|---:|---|---|
| `nexus_custodian` | Custodio del Nexus | 68 | 3 | 19 | south | Ayuntamiento / estrado |
| `chronicler` | Cronista | 59 | 2 | 22 | east | Ayuntamiento / archivo |
| `guard_captain` | Capitán de la Guardia | 77 | 2 | 22 | west | Ayuntamiento / zona táctica |
| `warrior_master` | Maestro Guerrero | 46 | 2 | 25 | south | Distrito Guerrero |
| `arcane_master` | Maestro Arcanista | 59 | 2 | 67 | east | Distrito Arcanista |
| `metallurgist_master` | Maestro Metalomante | 78 | 2 | 82 | north | Distrito Metalomante |
| `gunsmith` | Armero | 110 | 2 | 52 | west | Distrito Pistolero |
| `explorer` | Explorador | 95 | 2 | 33 | west | Estación Waystone |
| `nexus_merchant` | Mercader del Nexus | 57 | 2 | 42 | east | Mercado central |

## Iluminación

La iluminación no es uniforme; se concentra por función:

- Nexus: cyan/violeta detrás de vidrio tintado, soul lanterns periféricas y fracturas con luz oculta.
- Mercado: lanterns y lámparas DecoCraft cálidas.
- Ayuntamiento: lanterns y DecoCraft cálido institucional.
- Arcanista: soul lanterns, violeta y turquesa suave.
- Metalomante: lanterns cálidas sobre cobre/latón.
- Pistolero: lanterns industriales cálidas.
- Waystone: cuatro soul lanterns.

Recuentos del base completo:

| ID | Cantidad |
|---|---:|
| `minecraft:lantern` | 33 |
| `minecraft:soul_lantern` | 7 |
| `minecraft:light[level=12,waterlogged=false]` | 24 |
| `minecraft:crying_obsidian` | 3 |

De los 24 bloques `minecraft:light`, 22 están dentro de las fracturas del Nexus, uno detrás del display táctico del Ayuntamiento y uno detrás de la ventana del Arcanista. Se eliminó un `minecraft:light[level=0]` heredado de V3.

Iluminación del overlay:

| ID | Cantidad |
|---|---:|
| `decocraft:paper_lantern_1_cream` | 8 |
| `decocraft:stained_glass_chandelier_embers_on` | 2 |
| `decocraft:stained_glass_hanging_lamp_embers_on` | 5 |
| `decocraft:stained_glass_sconce_embers_on` | 6 |
| `decocraft:stained_glass_table_lamp_embers_on` | 1 |

## Create utilizado

| Registry ID | Cantidad | Uso |
|---|---:|---|
| `create:andesite_casing` | 101 | anillo, pilonos, arco y laboratorios |
| `create:brass_casing` | 34 | acentos de contención y distritos |
| `create:copper_casing` | 48 | pilonos, Waystone y Metalomante |
| `create:cogwheel` | 4 | red cinética visual |
| `create:large_cogwheel` | 2 | red cinética visual |
| `create:shaft` | 2 | red cinética visual |
| `create:fluid_pipe` | 10 | instrumentación lateral |
| `create:mechanical_pump` | 1 | instrumentación lateral |
| `create:creative_motor` | 1 | origen visual de la red cinética |

BlockEntities Create serializadas en el schematic: **0**.

Bloques Create capaces de crear BlockEntity al cargarse:

- `create:creative_motor[facing=south]`: `62,7,43`.
- `create:shaft[axis=z]`: `62,7,44` y `78,7,44`.
- `create:large_cogwheel[axis=z]`: `62,7,45` y `78,7,45`.
- `create:cogwheel[axis=z]`: `65,9,45`, `67,9,45`, `73,9,45` y `75,9,45`.
- `create:mechanical_pump[facing=up]`: `81,6,50`.
- `create:fluid_pipe`: `81,4,50`, `81,5,50`, `81,7,50`, `81,8,50` y `x76–81, y9, z50`.

La geometría y los blockstates están validados contra el JAR local. El funcionamiento cinético y la reconstrucción runtime de sus BlockEntities no se afirman sin una prueba dentro de Minecraft.

## DecoCraft utilizado

El overlay contiene exclusivamente IDs clasificados con seguridad WorldEdit alta en `docs/hub/nexus-market-v4-local-data.md`.

| Registry ID | Cantidad |
|---|---:|
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
| `decocraft:stained_glass_chandelier_embers_on` | 2 |
| `decocraft:stained_glass_hanging_lamp_embers_on` | 5 |
| `decocraft:stained_glass_sconce_embers_on` | 6 |
| `decocraft:stained_glass_table_lamp_embers_on` | 1 |
| `decocraft:trainingdummy` | 3 |
| `decocraft:typewriter_black` | 1 |
| `decocraft:vintage_cash_register` | 2 |
| `decocraft:world_map` | 2 |

Total: 29 IDs y 67 colocaciones.

No se usó ningún objeto de seguridad media ni ninguna de las 28 variantes con loot tables defectuosas. Una lámpara de araña en `68,7,23` sustituye intencionadamente una lantern de la base; por eso el combined gana 66 bloques netos frente a los 67 bloques no aire del overlay.

## Correcciones técnicas respecto a V3

- `DataVersion` actualizado de 2730 a 3465.
- Eliminado `minecraft:cauldron[level=0]` de la posición relativa `88,1,35`.
- Eliminado el `waystones:waystone` incompleto de `84,2,36`.
- Eliminado el residuo `minecraft:light[level=0,waterlogged=false]` de `81,4,100`.
- Waystone funcional ausente de los tres archivos.
- `Entities = 0` en los tres archivos.
- No se introdujeron IDs sin recurso blockstate en los JARs locales.
- Los estados de cristal nuevos usan orientaciones ya presentes y verificadas localmente.
- Las BlockEntities heredadas incompatibles con las zonas reconstruidas no se copiaron.
- Se conservaron únicamente dos signs compatibles en `48,3,64` y `48,3,65`, normalizadas al formato de texto 1.20.1.
- DecoCraft queda completamente separado del base.

## Validación automática final

| Archivo | Bytes | Palette | Bloques no aire | BlockEntities | Entities | Resultado |
|---|---:|---:|---:|---:|---:|---|
| `nexus_market_spawn_nexus_realms_v4_base.schem` | 13052 | 146 | 32772 | 2 signs | 0 | válido |
| `nexus_market_spawn_nexus_realms_v4_decocraft.schem` | 1780 | 30 | 67 | 0 | 0 | válido |
| `nexus_market_spawn_nexus_realms_v4.schem` | 13898 | 175 | 32838 | 2 signs | 0 | válido |

SHA-256:

- base: `a5e187bad7f36ae3f2b93dbdc86dfafe709f97248c23b6725806e1fc0cbaaadf`
- overlay: `7ca2becc6d968b6857f18922e7f9a60457b30a19bdbd73a808e87c9b68b2ed14`
- combined: `adfd40b53db4a543e32248541427449f52e102ebb920e88bc1cb7d4084de2b2c`

Comprobaciones superadas en los tres archivos:

- descompresión gzip;
- parseo NBT completo;
- dimensiones y volumen;
- `DataVersion = 3465`;
- Palette contigua;
- todos los índices de BlockData presentes en Palette;
- 848205 índices de bloque;
- recursos blockstate comprobados contra los JARs locales de Minecraft, Create y DecoCraft;
- ausencia de Waystone;
- ausencia de `minecraft:cauldron[level=0]`;
- ausencia de Entities;
- BlockEntities dentro de límites y compatibles;
- base sin DecoCraft;
- overlay limitado a la lista segura;
- ausencia de variantes DecoCraft con loot tables defectuosas;
- parseo y validación del combined.

La transformación cambia 14521 posiciones respecto a V3. La periferia no incluida en las zonas reconstruidas se conserva.

## Revisión runtime pendiente

No se realizó un pegado dentro de un mundo: requiere una sesión Minecraft/WorldEdit interactiva, y no se modificó ningún save local existente para evitar alterar archivos ajenos.

Revisión manual pendiente:

- confirmar que Create reconstruye correctamente las BlockEntities de motor, bomba, engranajes, ejes y tuberías al pegar;
- verificar visualmente conexiones y rotación de la única red cinética;
- comprobar orientación visual y caja de colisión de los 67 props DecoCraft;
- comprobar que el overlay se pega ignorando aire;
- revisar logs runtime de WorldEdit, Create y DecoCraft durante ese pegado;
- insertar y validar posteriormente el Waystone real en `91,2,29`.

No se afirma funcionamiento runtime de Create ni del futuro Waystone hasta completar esa prueba.
