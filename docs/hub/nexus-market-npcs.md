# Nexus Market — NPCs del hub (Packs 29.0–33.1)

## Estado

### IMPLEMENTADO

- Easy NPC Bundle `7.2.0` para Forge `1.20.1`.
- Easy NPC Core `7.2.0`.
- Easy NPC Config UI `7.2.0`.
- Dieciséis presets reutilizables bajo `config/easy_npc/preset/humanoid/`: nueve existentes y siete nuevos.
- Nombres visibles, apariencia local, diálogo breve en español y mapping a IDs reales de FTB Quests.
- Persistencia, invulnerabilidad, inmovilidad y ausencia de generación automática.
- Trading desactivado salvo en el Mercader del Nexus, que conserva sus intercambios existentes.
- Integración FTB limitada a abrir capítulos. Ningún diálogo completa quests ni concede clases, especializaciones, Allomancy o progreso.
- Distribución packwiz mediante metadata oficial de CurseForge para los tres JARs.

### PENDIENTE DE COLOCACIÓN MANUAL EN EL MAPA FINAL

- Importar cada preset una sola vez en su emplazamiento definitivo.
- Orientar cada NPC y registrar el UUID generado.
- Abrir manualmente al menos un diálogo haciendo clic.
- Pulsar manualmente su botón.
- Confirmar visualmente que FTB Quests abre el capítulo indicado en este documento.

Los NPCs no forman parte de ningún `.schem` y no contienen coordenadas globales.

## Mod instalado y portabilidad

| Componente | Mod ID | JAR | SHA-1 | CurseForge project/file |
|---|---|---|---|---|
| Easy NPC Bundle | `easy_npc_bundle` | `easy_npc_bundle-forge-1.20.1-7.2.0.jar` | `5ec9a2f6c1fdd5947e8534e62e88bc404559a04f` | `559312 / 8440024` |
| Easy NPC Core | `easy_npc` | `easy_npc-forge-1.20.1-7.2.0.jar` | `be0d320dffe4dd52113c3a166903ddc461398aed` | `1308987 / 8440012` |
| Easy NPC Config UI | `easy_npc_config_ui` | `easy_npc_config_ui-forge-1.20.1-7.2.0.jar` | `bfc74b5255b09c2b21c1d41d95530d4ede3ac75b` | `1214728 / 8440015` |

Metafiles:

- `mods/easy-npc.pw.toml`
- `mods/easy-npc-core.pw.toml`
- `mods/easy-npc-config-ui.pw.toml`

Los tres usan `mode = "metadata:curseforge"`, contienen el hash exacto y están indexados por packwiz. Una exportación local con `packwiz curseforge export -y` produjo tres entradas independientes con `required = true` en `manifest.json`:

- `projectID=559312`, `fileID=8440024`
- `projectID=1308987`, `fileID=8440012`
- `projectID=1214728`, `fileID=8440015`

Por tanto, la fuente de distribución para instalaciones nuevas es la metadata de packwiz/CurseForge; los JARs no dependen de la copia realizada en la instancia DEV y tampoco se guardan como binarios dentro del repositorio.

Si CurseForge no estuviera disponible durante una instalación, el fallback es copiar exactamente los tres JARs anteriores y validar sus SHA-1 antes de arrancar. No deben instalarse módulos duplicados ni variantes Fabric/NeoForge.

## Arquitectura

```text
schematic sin entidades
        +
presets versionados en config/easy_npc/preset/humanoid
        |
        +-- importación manual una sola vez
        +-- UUID de entidad registrado por despliegue
        +-- diálogo ejecutado por el jugador
        `-- /ftbquests open_book <chapter_id>
```

No existe un spawner custom, comprobación por tick ni importación al iniciar servidor. `import_new` crea una entidad nueva cada vez que se ejecuta, por lo que la prevención de duplicados es operacional: listar primero, importar una vez y conservar el UUID.

## Propiedades comunes de los presets

Todos los presets usan `easy_npc:humanoid`, formato `EasyNPCVersion:3` y:

- `PersistenceRequired:1b`
- `Invulnerable:1b`
- `EntityAttribute.IsInvulnerable:1b`
- `minecraft:generic.movement_speed = 0.0`
- objetivos limitados a `LOOK_AT_PLAYER` y `LOOK_AT_RESET`
- sin objetivo de paseo
- `CustomNameVisible:1b`
- `NAME_VISIBILITY = ALWAYS`
- sin loot, drops, ataques, proyectiles ni empuje; solo el Mercader conserva trading
- `ON_INTERACTION -> OPEN_DEFAULT_DIALOG`

Los presets no incluyen `Pos`, `Owner`, UUID de entidad, `PresetUUID` ni `Navigation.Home`. Easy NPC genera el `PresetUUID` ausente al importar y asigna el UUID propio de la entidad; ninguno queda hardcodeado en el repositorio.

## Presets

| ID lógico | Nombre visible | Recurso de importación | Apariencia local | Contenido |
|---|---|---|---|---|
| `nexus_custodian` | Custodio del Nexus | `easy_npc:preset/humanoid/nexus_custodian.npc.snbt` | `KNIGHT_02`, hierro/cota, amatista y escudo | campaña principal |
| `chronicler` | Cronista | `easy_npc:preset/humanoid/chronicler.npc.snbt` | `PROFESSOR_01`, libro y reloj | historia y Eras |
| `guard_captain` | Capitán de la Guardia | `easy_npc:preset/humanoid/guard_captain.npc.snbt` | `KNIGHT_01`, espada y escudo | exploración, hordas y bosses |
| `warrior_master` | Maestro de Armas | `easy_npc:preset/humanoid/warrior_master.npc.snbt` | `KNIGHT_02`, espada y escudo | Guerrero |
| `arcane_master` | Maestro Arcano | `easy_npc:preset/humanoid/arcane_master.npc.snbt` | `PROFESSOR_01`, libro encantado y amatista | Mago y Arcanista |
| `metallurgist_master` | Maestro Metalomante | `easy_npc:preset/humanoid/metallurgist_master.npc.snbt` | `SECURITY_01`, cobre y brújula | Senda del Metal |
| `gunsmith` | Armero | `easy_npc:preset/humanoid/gunsmith.npc.snbt` | `SECURITY_01`, ballesta y catalejo | Pistolero |
| `explorer` | Explorador | `easy_npc:preset/humanoid/explorer.npc.snbt` | `JAYJASONBO`, mapa y brújula | exploración y viajes |
| `nexus_merchant` | Mercader del Nexus | `easy_npc:preset/humanoid/nexus_merchant.npc.snbt` | `JAYJASONBO`, esmeralda | cambio de moneda y suministros básicos |
| `nexus_fisher` | Pescador del Nexus | `easy_npc:preset/humanoid/nexus_fisher.npc.snbt` | `JAYJASONBO`, caña y prismarina | pesca del lago y acceso a `pesca_del_nexus` |
| `market_foreman` | Maestre de Obras | `easy_npc:preset/humanoid/market_foreman.npc.snbt` | `SECURITY_01`, hacha y andamio | Oficina de Proyectos del Nexus |
| `market_surveyor` | Agrimensora del Nexus | `easy_npc:preset/humanoid/market_surveyor.npc.snbt` | `PROFESSOR_01`, brújula y papel | Observatorio del Nexus |
| `nexus_liaison` | Enlace del Nexus | `easy_npc:preset/humanoid/nexus_liaison.npc.snbt` | `JAYJASONBO`, libro y amatista | Casa de Contratos |
| `district_steward` | Intendente del Distrito | `easy_npc:preset/humanoid/district_steward.npc.snbt` | `KNIGHT_01`, farol y papel | Intendencia del Nexus |
| `market_curator` | Conservadora del Mercado | `easy_npc:preset/humanoid/market_curator.npc.snbt` | `PROFESSOR_01`, libro y pincel | Museo del Nexus |
| `nether_expeditionary` | Expedicionario del Nexus | `easy_npc:preset/humanoid/nether_expeditionary.npc.snbt` | `SECURITY_01`, brújula y carga ígnea | Expediciones al Nether y Aether; guía dimensional por Eras |

Todas las apariencias proceden de modelos incluidos en Easy NPC y objetos ya presentes en Minecraft. No se descargaron skins.

## Seis tiendas — estado funcional V1

El estado describe el servicio disponible: las seis tiendas son `OPERATIVA V1`, aunque sus interiores permanecen `EN CONSTRUCCIÓN`. Completar el interior o ampliar servicios corresponde a packs futuros y no cambia la identidad ni el preset del NPC.

| Tienda | NPC | Función disponible en V1 | Contenido futuro | Capítulo asociado | Estado |
|---|---|---|---|---|---|
| Guerrero | Maestro de Armas (`warrior_master`) | Acceso a quests y orientación sobre combate cuerpo a cuerpo, resistencia, escudo y dominio de armas | Interior definitivo, servicios avanzados, posible entrenamiento y posible comercio especializado | `clase_guerrero` (`4E58434C41535731`) | OPERATIVA V1 |
| Mago / Arcanista | Maestro Arcano (`arcane_master`) | Consulta de Mago y Arcanista | Estudio completo y servicios arcanos ampliados | `clase_mago` (`4E58434C41534D47`), `especializacion_arcanista` (`4E58415243414E31`) | OPERATIVA V1 |
| Metalomante | Maestro Metalomante (`metallurgist_master`) | Senda del Metal y orientación sobre la progresión de Allomancy | Interior definitivo, servicios especializados, posible comercio de recursos y contenido avanzado | `senda_del_metal` (`4E584D4554414C31`) | OPERATIVA V1 |
| Pistolero | Armero (`gunsmith`) | Capítulo Pistolero y orientación sobre armas, munición y progresión por Eras | Interior definitivo, comercio de armas y munición, attachments y servicios especializados | `clase_pistolero` (`4E5847554E534C31`) | OPERATIVA V1 |
| Exploración | Explorador (`explorer`) | Overworld, estructuras, criaturas, amenazas y preparación para Hordas | Expediciones y contratos del mundo abierto | `exploracion_y_hordas` (`4E584558504C4F31`) | OPERATIVA V1 |
| Economía | Mercader del Nexus (`nexus_merchant`) | Bronce/Plata/Oro con valor 1/10/100: cuatro cambios y ocho ofertas de suministros (doce en total) | Nuevos comerciantes, sinks, servicios, contratos, cosméticos y economía avanzada | Ninguno; trading de Easy NPC | OPERATIVA V1 |

El Explorador cubre Overworld, descubrimiento y mundo abierto. El Expedicionario del Nexus conserva por separado la guía narrativa hacia Nether, Aether, End y Otherside; ninguna tienda desbloquea dimensiones.

## Lago del Nexus — pesca V2

Estado: `OPERATIVO V2`, con el embarcadero todavía en construcción. El Pescador del Nexus abre `pesca_del_nexus` (`4E58464953483031`), una rama opcional de veinte quests disponible desde Era I. El lago es el inicio narrativo; las colecciones posteriores fomentan recorrer aguas dulces, costas, zonas secas, junglas y humedales del Overworld sin exigir dimensiones.

Aquaculture 2 `2.5.7` aporta el sistema real. Los peces utilizados se clasificaron desde las loot tables del JAR local, sin convertir sus pesos internos en probabilidades:

| Grupo práctico | Registry IDs verificados | Uso en V2 |
|---|---|---|
| comunes | `aquaculture:bluegill`, `aquaculture:minnow`, `aquaculture:perch`, `aquaculture:carp`, `aquaculture:smallmouth_bass`, `aquaculture:brown_trout` | inicio, colecciones y contratos de agua dulce |
| asociados a zonas | `aquaculture:rainbow_trout`, `aquaculture:atlantic_herring`, `aquaculture:jellyfish`, `aquaculture:red_grouper`, `aquaculture:synodontis`, `aquaculture:boulti`, `aquaculture:piranha`, `aquaculture:tambaqui`, `aquaculture:leech` | costas, clima seco, jungla y humedales |
| poco frecuentes | `aquaculture:gar`, `aquaculture:pink_salmon`, `aquaculture:atlantic_cod`, `aquaculture:muskellunge` | solo `gar` se exige una vez; ninguno forma parte de contratos |
| especiales o descartados | tortugas, shroomas, capturas de peso local muy bajo, cajas, cofres y botín de Neptunium | no son requisitos ni recompensas de la rama |

La V2 conserva las diez quests iniciales y añade diez: dos de colección, tres de exploración acuática, dos desafíos de cierre y tres contratos repetibles. Las recompensas monetarias únicas de pesca suman 45 Bronce-equivalentes. Los contratos consumen las capturas entregadas, tienen cooldowns nativos de 24/24/48 horas y pagan 9 Bronce por una pasada de los tres; su techo sostenido es 14 Bronce cada 48 horas (7 al día de media). No crean venta automática de peces.

Neptunium puede aparecer como botín muy raro según la configuración predeterminada verificada dentro del JAR. Sus herramientas, armas, armadura, caña y cuchillo de filetear quedan bajo `nexus_era_3_arcane_industrial`; los peces y los aparejos básicos permanecen accesibles en Era I.

Posibilidades futuras, no implementadas: torneos o eventos de pesca, capturas estacionales, recompensas cosméticas, ranking o colección completa y peces de otros Realms únicamente si existe contenido compatible real.

## Cinco edificios adicionales — identidad definitiva

Pack 32.0 fijó la identidad de los cinco edificios. La Oficina de Proyectos, la Casa de Contratos, el Museo y el Observatorio están `OPERATIVA V1` aunque sus interiores sigan en construcción. La Intendencia permanece `EN CONSTRUCCIÓN`: su Pack 32.4 no está aplicado en el árbol actual y su preset todavía declara que no ofrece servicios.

| Edificio | NPC | Función | Separación arquitectónica | Estado |
|---|---|---|---|---|
| Oficina de Proyectos del Nexus | Maestre de Obras (`market_foreman`) | entregas comunitarias y seguimiento de futuras mejoras físicas | registra proyectos; no construye, no gestiona logística continua ni contratos | OPERATIVA V1; interior en construcción |
| Casa de Contratos | Enlace del Nexus (`nexus_liaison`) | ocho encargos opcionales repetibles de Era I | trabajos secundarios; no sustituye campaña, clases, Hordas, exploración principal ni contratos de pesca | OPERATIVA V1; interior en construcción |
| Museo del Nexus | Conservadora del Mercado (`market_curator`) | nueve registros permanentes de trofeos, reliquias y descubrimientos | conserva memoria material; el Capitán gestiona combates y el Cronista historia/Eras | OPERATIVA V1; interior en construcción |
| Intendencia del Nexus | Intendente del Distrito (`district_steward`) | logística, suministros, entregas colectivas y posibles resource sinks | atiende necesidades comunitarias; el Mercader mantiene el intercambio personal | EN CONSTRUCCIÓN |
| Observatorio del Nexus | Agrimensora del Nexus (`market_surveyor`) | investigación del Nexus, dimensiones conocidas y descubrimientos | investiga conocimiento; Cronista narra, Explorador recorre, Expedicionario prepara viajes y Museo conserva trofeos | OPERATIVO V1; interior en construcción |

Los especialistas podrán originar futuras propuestas temáticas, pero la Casa de Contratos será el punto general de publicación y seguimiento. Los contratos de pesca ya existentes permanecen exclusivamente con el Pescador.

### Oficina de Proyectos — V1

`proyectos_del_nexus` contiene siete quests: una presentación y seis entregas
consumibles. Era I reúne materiales para tiendas, iluminación/caminos y
defensas; Era II prepara reservas de expedición; Era III registra
infraestructura arcano-industrial; Era IV reserva materiales para un anclaje
avanzado del Nexus. Las seis recompensas suman `32 B` y cada una usa
`team_reward: true`: se reclama una sola vez por equipo y la recibe el jugador
que completa la entrega.

FTB Quests comparte tareas y progreso entre miembros del mismo equipo de FTB
Teams. No existe un contador global entre equipos independientes; Pack 32.1 no
añade almacenamiento comunitario ni infraestructura paralela para simularlo.

Completar una quest representa el registro del proyecto. No ejecuta comandos,
WorldEdit, schematics ni cambios de bloques. Carlos revisa los proyectos
completados y aplica manualmente las obras físicas cuando correspondan.

### Casa de Contratos — V1

`contratos_del_nexus` contiene una presentación y ocho contratos repetibles de
Era I: dos de recolección, dos de caza, dos de exploración mediante muestras y
dos de apoyo al asentamiento. Seis tienen cooldown de 24 horas y dos de 48
horas. Una pasada completa entrega `10 B`; el techo sostenido es `18 B` cada 48
horas, equivalente a `9 B` diarios.

Los contratos son opcionales, consumen todas las entregas y no conceden stages,
acceso dimensional ni recompensas avanzadas. Skeleton y spider son objetivos
vanilla comunes verificados localmente; `minecraft:zombie` no se utiliza. Las
recompensas usan `team_reward: true` para evitar multiplicarlas por cada miembro
conectado.

FTB Quests comparte progreso dentro del mismo equipo FTB. Por ello, un jugador
sin equipo compartido conserva contratos individuales, mientras que los
miembros de un equipo coordinan el mismo progreso y una sola recompensa. No se
añade almacenamiento, reputación ni temporización KubeJS.

### Museo del Nexus — V1

`museo_del_nexus` contiene una presentación y nueve registros permanentes: tres
trofeos de bosses, tres reliquias y tres descubrimientos. Los trofeos dependen de
las victorias reales ya registradas en `desafios_y_bosses`; el Museo no vuelve a
pedir la muerte del boss. Todos los objetivos usan tareas de posesión con
`consume_items: false`, por lo que ni los objetos valiosos ni las piezas únicas
se entregan o destruyen.

Los drops seleccionados fueron verificados en los JAR locales: el Wroughtnaut
entrega su yelmo al morir a manos de un jugador, Maze Mother entrega entre dos y
cuatro amatistas abisales y Ender Guardian entrega su guantelete. Los tres son
fiables y quedan tras dependencias de Era II, III y IV respectivamente.

La colección añade `18 B` únicos y simbólicos por equipo. Carlos puede reflejar
después los registros mediante pedestales, vitrinas, cabezas, objetos decorativos
o áreas temáticas, pero FTB Quests no coloca bloques, entidades ni interiores.
Futuras ampliaciones podrán añadir secciones de Nether, Aether, Otherside,
dragones y nuevos Realms únicamente cuando exista contenido confirmado.

### Observatorio del Nexus — V1

`observatorio_del_nexus` contiene una presentación y ocho investigaciones: los
instrumentos de observación, seis muestras o fenómenos representativos y un
informe final de convergencia. Todas las tareas de objetos usan
`consume_items: false`; el Observatorio registra conocimiento y no retiene las
muestras, a diferencia del Museo, que cataloga trofeos y reliquias.

La progresión sigue exactamente las Eras existentes: Overworld en Era I;
`minecraft:the_nether` en Era II; `aether:the_aether` en Era III; y
`minecraft:the_end` más `deeperdarker:otherside` en Era IV. Las dependencias del
capítulo organizan las investigaciones, pero History Stages continúa siendo la
única autoridad dimensional. No hay teleports, concesiones de stages, comandos
de desbloqueo, listeners KubeJS ni sustitución de portales.

El Cronista explica la historia y las Eras; el Explorador guía el trabajo de
campo del Overworld; el Expedicionario prepara los viajes; el Museo conserva
pruebas materiales. El Observatorio estudia el comportamiento del Nexus y
relaciona muestras comunes de cada Realm. Sus ocho recompensas simbólicas suman
`9 B` únicos por equipo.

Quedan pendientes el interior definitivo, investigaciones avanzadas del Nexus,
Hordas y aperturas dimensionales, anomalías nuevas, dragones y futuros Realms
solo cuando estén confirmados. Macabre no se documenta como contenido
confirmado.

### Expedición al Nether — V1

`expedicion_al_nether` contiene doce quests de Era II: presentación,
preparación, entrada real en `minecraft:the_nether`, recursos básicos, muestras
de cuatro ambientes, exploración de `betterfortresses:fortress`, progresión
alquímica, tres grupos de peligros y cierre de expedición. La tarea de dimensión
y la de estructura pertenecen a FTB Quests; no se añadió detección KubeJS.

La mezcla V1 utiliza recursos y criaturas vanilla junto al mosquito carmesí de
Alex's Mobs y la fortaleza configurada por YUNG. No exige drops de baja
probabilidad, bosses ni estructuras de Cataclysm. Sus once recompensas únicas
suman `30 B` por equipo y no entregan equipo, materiales avanzados o acceso a
otras dimensiones.

El capítulo depende del hito existente de Era II, pero no concede
`nexus_era_2_diamond`. El portal continúa siendo vanilla y History Stages sigue
siendo la única autoridad que impide entrar durante Era I. Aether, End y
Otherside no forman parte de esta expedición.

### Expedición al Aether — V1

`expedicion_al_aether` contiene quince quests de Era III: preparación, entrada
real en `aether:the_aether`, recursos básicos, altar, gravitita encantada,
criaturas skyroot y los dungeons nativos de bronce, plata y oro con sus tres
guardianes. Las tareas de dimensión y estructura son nativas de FTB Quests; no
se añadió detección KubeJS.

El capítulo selecciona contenido verificado en The Aether 1.5.2 y evita exigir
drops aleatorios de sus cofres. Slider, Reina Valquiria y Espíritu del Sol ya
disponen de llaves garantizadas en sus loot tables; las quests solo registran
las victorias y no duplican las llaves ni el loot. Sus catorce recompensas
únicas suman `43 B` por equipo y no entregan armas, armaduras, accesorios o
contenido de Era IV.

La expedición depende del hito existente de Era III, pero no concede
`nexus_era_3_arcane_industrial`. History Stages conserva la autoridad sobre
`aether:the_aether`; End y Otherside no forman parte de esta rama. El
Observatorio mantiene una única investigación de zanita como contexto y no
duplica la aventura práctica.

La auditoría de bytecode y loot local identifica como equipo de atención el set
completo de Valquiria (vuelo ascendente limitado), la capa de invisibilidad, la
piedra de regeneración y las armaduras Neptune/Phoenix/Gravitite con habilidades
ambientales. Permanecen detrás de Era III y del loot natural de sus dungeons;
ninguno concede stages, teleports o acceso a otra dimensión. No se añadieron
restricciones de Era IV sin una evidencia estática de bypass dimensional o de
clase, y la V1 nunca los entrega como recompensa. Su balance final queda
pendiente de pruebas manuales.

### Evolución prevista

| Pack | Área que podrá ampliarse | Límite actual |
|---|---|---|
| 30.1 | Guerrero | V1 operativa con quests y orientación; entrenamiento y comercio especializado siguen pendientes |
| 30.2 | Mago / Arcanista | Sin añadir todavía lecciones, servicios ni quests |
| 30.3 | Metalomante | V1 operativa con Senda del Metal y orientación; servicios especializados y balance final siguen pendientes |
| 30.4 | Pistolero | V1 operativa con capítulo y orientación; comercio, attachments, servicios y balance final siguen pendientes |
| 30.5 | Mercader / economía | V1 operativa y auditada; precios, monedas y doce ofertas preservados; expansión y balance final pendientes |
| 30.6 | Explorador | V1 operativa con orientación de Overworld/Hordas; expediciones y contratos siguen pendientes |
| 32.1 | Oficina de Proyectos | V1 operativa con siete quests, entregas consumibles y progreso compartido por equipo; cambios físicos manuales |
| 32.2 | Casa de Contratos | V1 operativa con ocho contratos repetibles de Era I; contratos por Era, raros y semanales pendientes |
| 32.3 | Museo del Nexus | V1 operativa con nueve registros permanentes; interior, exposiciones físicas y nuevas secciones pendientes |
| 32.4 | Intendencia del Nexus | Pack no aplicado en el árbol actual; identidad fijada, sin capítulo, entregas, comercio ni logística funcional |
| 32.5 | Observatorio del Nexus | V1 operativa con nueve entradas de investigación; interior e investigaciones avanzadas pendientes |
| 33.0 | Expedición al Nether | V1 operativa con doce quests de Era II; ampliaciones avanzadas pendientes |
| 33.1 | Aether | V1 integrada con quince quests de Era III; ampliaciones y balance final pendientes |
| 33.2 | Otherside | Expedición futura; no implementada |
| 33.3 | Progresión dimensional consolidada | Integración futura; no implementada |

## Diálogos implementados

| NPC | Texto |
|---|---|
| Custodio del Nexus | «Bienvenido a Nexus Market. El asentamiento aún está creciendo, pero el Nexus ya nos reúne. Abre conmigo la campaña; después, el Cronista te explicará las Eras y el capítulo inicial te guiará para elegir clase.» |
| Cronista | «Soy el Cronista. Conservo lo aprendido en cada Era y registro cómo cambia Nexus Realms. Elige el capítulo histórico que quieras consultar.» |
| Capitán de la Guardia | «La Guardia del Nexus mantiene seguro el asentamiento y cubre sus accesos. Pero durante una verdadera incursión del Nexus, hasta nuestras defensas pueden ser puestas a prueba. Revisa aquí las hordas o las grandes cacerías.» |
| Maestro de Armas | «La armería sigue en obras, pero el entrenamiento básico ya está disponible en la senda del Guerrero. Combate cuerpo a cuerpo, resistencia y dominio de armas —con el escudo como aliado— definen la clase. Los servicios avanzados llegarán con el local completo.» |
| Maestro Arcano | «El estudio todavía no está preparado para lecciones completas; hasta el maná necesita un espacio estable. Mientras tanto, consulta aquí la senda del Mago o los estudios del Arcanista.» |
| Maestro Metalomante | «El taller aún completa sus medidas de seguridad. La Metalomancia es una senda avanzada del Mago y solo responde cuando tu progreso lo permite: primero dominarás los ocho metales fundamentales; los poderes avanzados llegarán después. Cuando el taller esté completo ofrecerá más servicios.» |
| Armero | «El taller aún se está acondicionando, pero este capítulo ya es la guía principal del Pistolero. Armas de fuego, munición y preparación definen la senda; el equipo avanzado llegará con las Eras. La venta y los servicios especializados esperan a que el local esté completo.» |
| Explorador | «El puesto aún se está acondicionando, pero ya puedo orientarte sobre rutas, estructuras, criaturas y amenazas del Overworld, incluidas las Hordas. Más adelante prepararé expediciones y contratos de mundo abierto; para Nether, Aether, End u Otherside, habla con el Expedicionario del Nexus.» |
| Mercader del Nexus | «La tienda sigue terminándose, pero el mostrador ya está abierto. Cambio moneda sin comisión y ofrezco suministros comunes; nada de poder, reliquias ni atajos.» |
| Pescador del Nexus | «El embarcadero aún se está acondicionando, pero la pesca ya está abierta. En Pesca del Nexus encontrarás colecciones, retos y encargos periódicos; empieza en este lago y explora otras aguas del Overworld.» |
| Maestre de Obras | «Nexus Market sigue creciendo. Reúne recursos para nuestros proyectos comunitarios: el registro refleja cada entrega y las obras reales aparecerán progresivamente en el asentamiento.» |
| Agrimensora del Nexus | «El Nexus conecta mundos distintos y aquí estudiamos sus anomalías. Nuevos descubrimientos aparecerán con las Eras, aunque varias instalaciones del Observatorio todavía siguen en construcción.» |
| Enlace del Nexus | «La Casa de Contratos ya publica encargos opcionales según las necesidades del asentamiento. Completa trabajos de recolección, caza, exploración o apoyo para recibir recompensas modestas.» |
| Intendente del Distrito | «La Intendencia continúa en obras. Aquí coordinaremos logística, suministros y necesidades colectivas del Nexus; para compras personales, acude al Mercader. Todavía no ofrecemos servicios.» |
| Conservadora del Mercado | «El Museo ya cataloga hallazgos y trofeos de grandes victorias. La colección crecerá con cada Realm, aunque las salas y exposiciones físicas todavía se están preparando.» |
| Expedicionario del Nexus | «El Nexus abre rutas por Eras: Nether en la II y Aether en la III. Prepara cada expedición antes de cruzar; End y Otherside permanecerán fuera de alcance hasta Era IV.» |

## Mapping FTB Quests

Versión comprobada: FTB Quests `2001.4.22`.

Los botones usan exclusivamente:

```text
/ftbquests open_book <chapter_id>
```

con `ExecAsUser:1b` y `PermLevel:0`. No hay acciones `change_progress`.

| Contenido | Chapter ID | Quest de entrada | Tarea comprobada representativa |
|---|---|---|---|
| `00_comienzo` | `4E5850524F475549` | `2700000000000001` | `27B0000000000001` — Comprender la campaña |
| Era I — Supervivencia | `4E58303145524131` | `2700000000000101` | `27B0000000000103` — Preparar un escudo |
| Era II — Expansión | `4E58303245524132` | `4E58504552413032` | `4E58505441533232` — Encontrar diamante |
| Era III — Arcano-Industrial | `4E58303345524133` | `4E58504552413033` | `4E58505441533333` — Presentar un foco arcano |
| Era IV — Nexus | `4E58303445524134` | `4E58504552413034` | `4E58505441533434` — Forjar netherite |
| `clase_guerrero` | `4E58434C41535731` | `2700000000001001` | `27B0000000001002` — Empuñar una guja de hierro |
| `clase_mago` | `4E58434C41534D47` | `2700000000001101` | `27B0000000001102` — Reunir 8 esencias arcanas |
| `especializacion_arcanista` | `4E58415243414E31` | `2700000000001201` | `271B000000001204` — Preparar un grimorio de cobre |
| `senda_del_metal` | `4E584D4554414C31` | `4E584D4554513031` | `271B000000001402` — Construir un molino alomántico |
| `clase_pistolero` | `4E5847554E534C31` | `2700000000001301` | `27B0000000001302` — Dominar la Glock 17 |
| `exploracion_y_hordas` | `4E584558504C4F31` | `2710000000002001` | `271B000000002002` — Preparar un mapa |
| `desafios_y_bosses` | `4E58424F53534553` | `2710000000002101` | `271B000000002102` — Derrotar al Ferrous Wroughtnaut |
| `pesca_del_nexus` | `4E58464953483031` | `2720000000003101` | `272B000000003103` — Capturar un bluegill |
| `proyectos_del_nexus` | `4E5850524F4A3031` | `2730000000003201` | `273B000000003202` — Entregar 128 tablones de roble |
| `contratos_del_nexus` | `4E58434F4E545231` | `2740000000003201` | `274B000000003206` — Eliminar 12 esqueletos |
| `museo_del_nexus` | `4E584D5553455531` | `2750000000003301` | `275B000000003302` — Registrar el yelmo del Wroughtnaut |
| `observatorio_del_nexus` | `4E584F4253455231` | `2760000000003501` | `276B000000003506` — Analizar una gema de zanita |
| `expedicion_al_nether` | `4E584E4554483031` | `2770000000003601` | `277B000000003614` — Entrar en una fortaleza del Nether |
| `expedicion_al_aether` | `4E58414554483031` | `2780000000003701` | `278B000000003706` — Entrar al Aether |

Mapping por NPC:

| NPC | Botones FTB |
|---|---|
| Custodio del Nexus | `00_comienzo` |
| Cronista | las cuatro Eras |
| Capitán de la Guardia | `exploracion_y_hordas`, `desafios_y_bosses` |
| Maestro de Armas | `clase_guerrero` |
| Maestro Arcano | `clase_mago`, `especializacion_arcanista` |
| Maestro Metalomante | `senda_del_metal` |
| Armero | `clase_pistolero` |
| Explorador | `exploracion_y_hordas` |
| Mercader del Nexus | ninguno |
| Pescador del Nexus | `pesca_del_nexus` |
| Maestre de Obras | `proyectos_del_nexus` (`4E5850524F4A3031`) |
| Agrimensora del Nexus | `observatorio_del_nexus` (`4E584F4253455231`) |
| Enlace del Nexus | `contratos_del_nexus` (`4E58434F4E545231`) |
| Intendente del Distrito | ninguno |
| Conservadora del Mercado | `museo_del_nexus` (`4E584D5553455531`) |
| Expedicionario del Nexus | `expedicion_al_nether` (`4E584E4554483031`), `expedicion_al_aether` (`4E58414554483031`) |

El Maestro Metalomante solo abre `senda_del_metal`. No ejecuta `allomancy add`, no cambia clases y no concede `nexus_specialization_metallurgist`. El desbloqueo continúa perteneciendo a la quest y al sistema de progresión existente.

## Despliegue manual

Los comandos comprobados pertenecen al árbol `/easy_npc`. La gestión de presets requiere nivel de permiso `2`.

### Importar

1. Situarse en la posición final del NPC.
2. Ejecutar `/easy_npc list` y confirmar que ese NPC todavía no existe.
3. Importar una sola vez:

```text
/easy_npc preset import_new custom easy_npc:preset/humanoid/<archivo>.npc.snbt ~ ~ ~
```

Ejemplo:

```text
/easy_npc preset import_new custom easy_npc:preset/humanoid/nexus_custodian.npc.snbt ~ ~ ~
```

El identificador de recurso conserva el prefijo `easy_npc:preset/humanoid/` y la extensión `.npc.snbt`.

### Registrar y orientar

Después de importar:

```text
/easy_npc list
/easy_npc info <UUID>
/easy_npc rotate <UUID> <yaw>
```

Guardar el UUID junto al emplazamiento operativo del servidor. No escribirlo en el preset.

### Mover

`/easy_npc position` modifica partes del modelo, no la posición de la entidad. Para mover un NPC existente, situarse en el nuevo punto y usar el teletransporte vanilla hacia el jugador:

```text
/tp <UUID_NPC> <jugador>
```

Después se aplica `/easy_npc rotate`.

### Sustituir o actualizar

1. Exportar desde una copia de trabajo si se ha editado mediante Config UI:

```text
/easy_npc preset export custom <UUID> <nombre>
```

2. Validar y versionar el `.npc.snbt` resultante.
3. En el mapa final, comprobar el UUID antiguo.
4. Eliminarlo:

```text
/easy_npc delete <UUID>
```

5. Ejecutar una sola vez `preset import_new custom ...`.
6. Registrar el nuevo UUID y volver a orientar.

No ejecutar `import_new` como mecanismo de actualización: crea otra entidad y produciría un duplicado.

## Validación local

Mundo aislado utilizado: `Pack28_EasyNPC_Test`, creado como copia de un mundo creativo con comandos.

Resultado comprobado con `nexus_custodian`:

- importación custom correcta;
- UUID de entidad generado en runtime y no incorporado al preset;
- archivo persistido por Easy NPC tras guardar;
- reinicio del mundo con `Initialized with 1 tracked NPC entities`;
- `Invulnerable:1b` e `EntityAttribute.IsInvulnerable:1b`;
- `PersistenceRequired:1b`;
- velocidad `0.0` y ausencia de objetivos de paseo;
- una sola entidad tras el reinicio;
- los dieciséis SNBT aceptados por el `TagParser` real de Minecraft `1.20.1`.

Pendiente de prueba manual:

- hacer clic para abrir el diálogo;
- pulsar un botón;
- confirmar visualmente que se abre el chapter correcto de FTB Quests.

Durante la sesión de validación se produjo un crash de cliente ajeno al preset. La primera causa fue `Simple Voice Chat 1.20.1-2.6.20`: su `MicrophoneThread` intentó usar OpenAL sin una instancia `ALCapabilities`. Easy NPC no aparece en la traza causal. No se modificó ni corrigió Voice Chat por quedar fuera del alcance del Pack 28.

## Limitaciones

- La colocación final, orientación y registro de UUIDs son operaciones manuales sobre el mapa terminado.
- No se probó interacción simultánea con más de un cliente.
- La apertura visual del diálogo y del chapter FTB queda pendiente de la prueba manual indicada.
- El Mercader conserva sus ofertas nativas existentes; los otros quince presets no añaden economía.
- Los presets no reaccionan visualmente a etapas de progresión; no se añadió lógica paralela.
- Una indisponibilidad de CurseForge durante una instalación requiere el fallback manual verificado por SHA-1.
