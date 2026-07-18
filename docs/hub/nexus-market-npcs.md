# Nexus Market — NPCs definitivos (Pack 28.0)

## Estado

### IMPLEMENTADO

- Easy NPC Bundle `7.2.0` para Forge `1.20.1`.
- Easy NPC Core `7.2.0`.
- Easy NPC Config UI `7.2.0`.
- Nueve presets reutilizables bajo `config/easy_npc/preset/humanoid/`.
- Nombres visibles, apariencia local, diálogo breve en español y mapping a IDs reales de FTB Quests.
- Persistencia, invulnerabilidad, inmovilidad y ausencia de generación automática.
- Trading desactivado en los nueve presets.
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
- sin loot, drops, ataques, proyectiles, empuje ni trading
- `ON_INTERACTION -> OPEN_DEFAULT_DIALOG`

Los presets no incluyen `Pos`, `Owner`, UUID de entidad ni `Navigation.Home`. Easy NPC asigna el UUID de entidad y aplica sus reglas de propietario al importar; el `PresetUUID` solo identifica la plantilla.

## Presets

| ID lógico | Nombre visible | Recurso de importación | Apariencia local | Contenido |
|---|---|---|---|---|
| `nexus_custodian` | Custodio del Nexus | `easy_npc:preset/humanoid/nexus_custodian.npc.snbt` | `KNIGHT_02`, hierro/cota, amatista y escudo | campaña y Eras |
| `chronicler` | Cronista | `easy_npc:preset/humanoid/chronicler.npc.snbt` | `PROFESSOR_01`, libro y reloj | historia y Eras |
| `guard_captain` | Capitán de la Guardia | `easy_npc:preset/humanoid/guard_captain.npc.snbt` | `KNIGHT_01`, espada y escudo | exploración, hordas y bosses |
| `warrior_master` | Maestro de Armas | `easy_npc:preset/humanoid/warrior_master.npc.snbt` | `KNIGHT_02`, espada y escudo | Guerrero |
| `arcane_master` | Maestro Arcano | `easy_npc:preset/humanoid/arcane_master.npc.snbt` | `PROFESSOR_01`, libro encantado y amatista | Mago y Arcanista |
| `metallurgist_master` | Maestro Metalomante | `easy_npc:preset/humanoid/metallurgist_master.npc.snbt` | `SECURITY_01`, cobre y brújula | Senda del Metal |
| `gunsmith` | Armero | `easy_npc:preset/humanoid/gunsmith.npc.snbt` | `SECURITY_01`, ballesta y catalejo | Pistolero |
| `explorer` | Explorador | `easy_npc:preset/humanoid/explorer.npc.snbt` | `JAYJASONBO`, mapa y brújula | exploración y viajes |
| `nexus_merchant` | Mercader del Nexus | `easy_npc:preset/humanoid/nexus_merchant.npc.snbt` | `JAYJASONBO`, esmeralda | economía futura; sin trading |

Todas las apariencias proceden de modelos incluidos en Easy NPC y objetos ya presentes en Minecraft. No se descargaron skins.

## Diálogos implementados

| NPC | Texto |
|---|---|
| Custodio del Nexus | «Soy el Custodio del Nexus. Vigilo su despertar y guío la campaña que une a este asentamiento. Consulta el comienzo o el estado de las Eras cuando lo necesites.» |
| Custodio, diálogo de Eras | «Cada Era abre un nuevo horizonte para todo el mundo. Puedo mostrarte su capítulo, pero el progreso debe ganarse.» |
| Cronista | «Soy el Cronista. Conservo lo aprendido en cada Era y registro cómo cambia Nexus Realms. Elige el capítulo histórico que quieras consultar.» |
| Capitán de la Guardia | «Soy el Capitán de la Guardia. Coordino la defensa del asentamiento y registro las amenazas que exigen una fuerza preparada. Revisa aquí las hordas o las grandes cacerías.» |
| Maestro de Armas | «Soy el Maestro de Armas. La fuerza sin disciplina solo abre huecos en una formación. Si sigues la senda del Guerrero, aquí encontrarás tu entrenamiento.» |
| Maestro Arcano | «Soy el Maestro Arcano. Enseño a escuchar el maná antes de intentar dominarlo. Puedo mostrarte la senda del Mago o los estudios del Arcanista.» |
| Maestro Metalomante | «Soy el Maestro Metalomante. Los metales amplifican lo que ya llevas dentro, pero exigen estudio y medida. Puedo mostrarte la Senda del Metal; su desbloqueo depende de tu progreso, no de mis palabras.» |
| Armero | «Soy el Armero. Un arma fiable empieza en el banco de trabajo y termina en manos de alguien que sabe cuándo no disparar. Consulta aquí la senda del Pistolero.» |
| Explorador | «Soy el Explorador. Trazo rutas, comparo mapas y preparo a quienes cruzan la frontera. Antes de partir, revisa los objetivos de exploración y defensa.» |
| Mercader del Nexus | «Soy el Mercader del Nexus. Observo qué necesita el mercado y preparo futuras rutas de intercambio. Aún no negocio: cuando la economía esté lista, este puesto abrirá con reglas claras.» |

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

Mapping por NPC:

| NPC | Botones FTB |
|---|---|
| Custodio del Nexus | `00_comienzo` y las cuatro Eras |
| Cronista | las cuatro Eras |
| Capitán de la Guardia | `exploracion_y_hordas`, `desafios_y_bosses` |
| Maestro de Armas | `clase_guerrero` |
| Maestro Arcano | `clase_mago`, `especializacion_arcanista` |
| Maestro Metalomante | `senda_del_metal` |
| Armero | `clase_pistolero` |
| Explorador | `exploracion_y_hordas` |
| Mercader del Nexus | ninguno |

El Maestro Metalomante solo abre `senda_del_metal`. No ejecuta `allomancy add`, no cambia clases y no concede `nexus_specialization_metallurgist`. El desbloqueo continúa perteneciendo a la quest y al sistema de progresión existente.

## Despliegue manual

Los comandos comprobados pertenecen al árbol `/easy_npc`. La gestión de presets requiere nivel de permiso `2`.

### Importar

1. Situarse en la posición final del NPC.
2. Ejecutar `/easy_npc list` y confirmar que ese NPC todavía no existe.
3. Importar una sola vez:

```text
/easy_npc preset import_new custom easy_npc:preset/humanoid/<archivo>.npc.snbt
```

Ejemplo:

```text
/easy_npc preset import_new custom easy_npc:preset/humanoid/nexus_custodian.npc.snbt
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
- UUID de entidad generado: `447e794c-9169-42c7-9a29-2b42789d092c`;
- archivo persistido por Easy NPC tras guardar;
- reinicio del mundo con `Initialized with 1 tracked NPC entities`;
- `Invulnerable:1b` e `EntityAttribute.IsInvulnerable:1b`;
- `PersistenceRequired:1b`;
- velocidad `0.0` y ausencia de objetivos de paseo;
- una sola entidad tras el reinicio;
- los nueve SNBT aceptados por el `TagParser` real de Minecraft `1.20.1`.

Pendiente de prueba manual:

- hacer clic para abrir el diálogo;
- pulsar un botón;
- confirmar visualmente que se abre el chapter correcto de FTB Quests.

Durante la sesión de validación se produjo un crash de cliente ajeno al preset. La primera causa fue `Simple Voice Chat 1.20.1-2.6.20`: su `MicrophoneThread` intentó usar OpenAL sin una instancia `ALCapabilities`. Easy NPC no aparece en la traza causal. No se modificó ni corrigió Voice Chat por quedar fuera del alcance del Pack 28.

## Limitaciones

- La colocación final, orientación y registro de UUIDs son operaciones manuales sobre el mapa terminado.
- No se probó interacción simultánea con más de un cliente.
- La apertura visual del diálogo y del chapter FTB queda pendiente de la prueba manual indicada.
- El Mercader no tiene ofertas ni comandos económicos.
- Los presets no reaccionan visualmente a etapas de progresión; no se añadió lógica paralela.
- Una indisponibilidad de CurseForge durante una instalación requiere el fallback manual verificado por SHA-1.
