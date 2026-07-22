# Nexus Market — despliegue definitivo del hub (Pack 29.4)

## Propósito

Este documento es el procedimiento operativo para convertir el Nexus Market ya
construido en un hub funcional. El mapa, los schematics, las quests, los
presets y la economía permanecen independientes:

```text
mundo con Nexus Market
        +
Nexus Core 0.6.2 (protección por mundo, avisos y zona segura)
        +
16 NPCs importados manualmente desde presets
        +
Waystone colocada como bloque real
        +
spawn global vanilla
```

No existe importación automática de NPCs, detección automática del schematic ni
coordenadas hardcodeadas en código. Antes de operar sobre un servidor dedicado
o un mundo nuevo se debe hacer una copia completa del mundo con el servidor
detenido.

## Auditoría del mundo DEV actual

Auditoría local realizada el 18 de julio de 2026, sin modificar el save.

| Dato | Valor comprobado |
|---|---|
| Instancia Prism | `C:\Users\spend\AppData\Roaming\PrismLauncher\instances\NexusRealmsDEV-instance(1)` |
| Directorio Minecraft | `...\NexusRealmsDEV-instance(1)\minecraft` |
| Carpeta del mundo | `...\minecraft\saves\Mundo nuevo (5)` |
| Nombre interno | `Mundo nuevo` |
| Dimensión del mercado | `minecraft:overworld` |
| Pegado WorldEdit registrado | V6 en `(-5, 63, 20)`, 1.995.163 posiciones y 0 entidades |
| Traslación V6 verificada contra chunks | `(-20, +63, -30)` |
| Volumen del schematic en el mundo | `X=-20..160`, `Y=63..135`, `Z=-30..120` |
| Superficie principal | `Y=73` |
| Centro horizontal del Nexus | `X=70`, `Z=45` |
| Posición guardada del jugador | `78.526, 74.0, 80.587`, Overworld |

La traslación no se dedujo solamente del mensaje de pegado: se contrastaron
posiciones de `create:brass_casing`, lámparas Create Deco y props DecoCraft
raros entre el schematic y los chunks guardados. Dieciséis coincidencias
independientes dieron la misma traslación.

### Huella y radio

- La huella visible completa, incluyendo todos los bloques en la superficie o
  por encima de ella, queda dentro de un radio horizontal de `100` bloques
  alrededor de `70,45`.
- Las capas profundas de la cimentación redondeada alcanzan un máximo de
  `107.01` bloques. Un radio `108` incluye también toda esa cimentación.
- Radio definitivo de producción: `120`. Incluye edificios, plaza, Nexus,
  mercados, distritos, Waystone, NPCs, caminos y cimentación completa, con un
  margen operativo de casi trece bloques respecto al extremo auditado.

La región de Nexus Core es cilíndrica. Un radio que cubra las cuatro esquinas
del volumen rectangular protegería demasiado terreno exterior y no es
necesario.

## Artefacto de despliegue de Nexus Core 0.6.2

El repositorio contiene únicamente:

```text
mods/nexus-core-0.6.2.jar
SHA-256 F8B9760623B187F7F7D14FD4DA54DE86F51F333BEAB8F98C70B218976C11C6ED
```

No hay otro JAR de Nexus Core instalado en `mods/`.

La carga runtime de 0.6.2, sus avisos de perímetro y el filtro territorial de
spawn hostil todavía no están validados en este mundo. El mensaje esperado al
arrancar es:

```text
Nexus Core era progression, UI, and market protection loaded.
```

El save no contiene todavía:

```text
data/nexuscore_market_protection.dat
```

Esto significa que no hay configuración territorial previa que conservar. El
primer `/nexus_market status` debe mostrar protección desactivada y
configuración incompleta. Según la implementación local comprobada,
`/nexus_market enable` rechaza una configuración sin centro y radio.

## Orden recomendado de puesta en marcha

1. Desplegar el modpack en el servidor dedicado.
2. Iniciarlo una vez para generar configuraciones y cerrarlo limpiamente.
3. Colocar o importar el mundo definitivo con el servidor detenido.
4. Configurar el spawn con `/setworldspawn 70 74 20 0` y
   `/gamerule spawnRadius 0`.
5. Configurar Nexus Market desde el centro verificado `70,*,45` con
   `/nexus_market set_center`, `/nexus_market set_radius 120`, comprobar
   `/nexus_market status` y ejecutar `/nexus_market enable`.
6. Importar y colocar manualmente los dieciséis NPCs, reutilizando las nueve
   posiciones verificadas y sin inventar coordenadas para los siete nuevos.
7. Crear, equipar y fijar manualmente los ocho Guardianes del Nexus, sin
   activar patrullas globales.
8. Colocar y verificar la Waystone real en `125,77,6`, incluido un viaje de ida
   y vuelta y su persistencia tras reinicio.
9. Verificar que el mundo comienza en Era I y que solo el Overworld está
   disponible.
10. Probar spawn, onboarding, clase, quests, NPCs, Market y permisos con una
    cuenta nueva sin OP.
11. Activar la whitelist y admitir únicamente las cuentas previstas.
12. Detener el servidor y realizar el backup inicial completo.
13. Abrir el servidor a los jugadores autorizados.

## Protección definitiva

Todos los comandos requieren permisos de administración de nivel `2`.

### Configuración del mundo DEV auditado

El centro horizontal comprobado está dentro del monolito. Para usar exactamente
`X=70`, `Z=45`, volar por encima del Nexus manteniendo esas coordenadas; la Y
solo es una referencia administrativa y no limita el cilindro.

```text
/nexus_market status
/nexus_market enable
```

La segunda orden debe fallar por configuración incompleta.

Después:

```text
/nexus_market set_center
/nexus_market set_radius 120
/nexus_market status
```

Antes de activar, comprobar:

- centro `70,*,45`;
- dimensión `minecraft:overworld`;
- radio `120`;
- estado `DESACTIVADA`;
- configuración completa `sí`.

Probar el borde cardinal exacto y un bloque exterior. Por ejemplo, en el eje X:

```text
X=190, Z=45  -> borde incluido
X=191, Z=45  -> exterior
```

Solo después:

```text
/nexus_market enable
```

Para reajustar el radio no se borra el centro:

```text
/nexus_market set_radius <nuevo_radio>
/nexus_market status
```

Para mantenimiento arquitectónico:

```text
/nexus_market disable
```

La configuración se conserva. Tras terminar y repetir las pruebas:

```text
/nexus_market enable
```

En un servidor o mundo distinto no se deben reutilizar estas coordenadas:
colocarse sobre el centro real, medir la huella visible y repetir el mismo
procedimiento.

## NPCs definitivos

### Estado del mundo auditado

`easy_npc_index.dat` contiene tres NPCs y los tres son copias del preset
`nexus_merchant`. No hay registros de los otros quince NPCs previstos.

- Un Mercader está en `71.122, 74.0, 65.242`.
- Dos registros del Mercader están persistidos en `0,0,0`.
- La reserva definitiva del Mercader está libre en `106,74,55`.

Los tres registros son duplicados de prueba candidatos. Este documento no
versiona sus UUIDs: deben obtenerse siempre del mundo activo mediante:

```text
/easy_npc list
/easy_npc info <UUID>
```

No importar otro Mercader. Conservar una sola entidad, eliminar únicamente las
dos copias verificadas y mover la restante a la reserva definitiva:

```text
/easy_npc delete <UUID_DUPLICADO>
```

Situarse en `106,74,55`:

```text
/tp <UUID_MERCADER_CONSERVADO> @s
/easy_npc rotate <UUID_MERCADER_CONSERVADO> 90
```

Volver a ejecutar `/easy_npc list` y confirmar que queda exactamente un
Mercader.

### Tabla completa de NPCs

Las nueve posiciones existentes se comprobaron directamente en los chunks:
tienen suelo, espacio de pies y al menos dos bloques de altura libres. Los siete
NPCs nuevos no tienen una posición verificada; deben colocarse manualmente en su
zona y no se les asigna ninguna coordenada desde el preset.

Yaw usados: sur `0`, oeste `90`, norte `180`, este `-90`.

| NPC | Preset | Función | Zona | Quest/capítulo asociado | Estado | Posición/orientación verificada | Comando exacto de importación |
|---|---|---|---|---|---|---|---|
| Custodio del Nexus | `nexus_custodian` | Campaña principal | Ayuntamiento | `00_comienzo` `4E5850524F475549` | operativo | `70,75,-12`; sur `0` | `/easy_npc preset import_new custom easy_npc:preset/humanoid/nexus_custodian.npc.snbt ~ ~ ~` |
| Cronista | `chronicler` | Historia y Eras | Ayuntamiento | Eras I-IV | operativo | `50,75,-9`; este `-90` | `/easy_npc preset import_new custom easy_npc:preset/humanoid/chronicler.npc.snbt ~ ~ ~` |
| Capitán de la Guardia | `guard_captain` | Defensa, hordas y grandes amenazas | Ayuntamiento | exploración/hordas `4E584558504C4F31`; bosses `4E58424F53534553` | operativo | `90,75,-9`; oeste `90` | `/easy_npc preset import_new custom easy_npc:preset/humanoid/guard_captain.npc.snbt ~ ~ ~` |
| Maestro de Armas | `warrior_master` | Senda del Guerrero | Tienda 1 | Guerrero `4E58434C41535731` | OPERATIVA V1; interior en construcción | `6,75,8`; sur `0` | `/easy_npc preset import_new custom easy_npc:preset/humanoid/warrior_master.npc.snbt ~ ~ ~` |
| Maestro Arcano | `arcane_master` | Magia y Arcanista | Tienda 2 | Mago `4E58434C41534D47`; Arcanista `4E58415243414E31` | OPERATIVA V1; interior en construcción | `50,75,97`; este `-90` | `/easy_npc preset import_new custom easy_npc:preset/humanoid/arcane_master.npc.snbt ~ ~ ~` |
| Maestro Metalomante | `metallurgist_master` | Senda del Metal y orientación de Allomancy | Tienda 3 | Senda del Metal `4E584D4554414C31` | OPERATIVA V1; interior en construcción | `100,75,103`; norte `180` | `/easy_npc preset import_new custom easy_npc:preset/humanoid/metallurgist_master.npc.snbt ~ ~ ~` |
| Armero | `gunsmith` | Capítulo Pistolero y orientación de armas/munición | Tienda 4 | Pistolero `4E5847554E534C31` | OPERATIVA V1; interior en construcción | `136,75,95`; oeste `90` | `/easy_npc preset import_new custom easy_npc:preset/humanoid/gunsmith.npc.snbt ~ ~ ~` |
| Explorador | `explorer` | Overworld, estructuras, amenazas y Hordas | Tienda 5 | exploración/hordas `4E584558504C4F31` | OPERATIVA V1; interior en construcción | `126,75,18`; oeste `90` | `/easy_npc preset import_new custom easy_npc:preset/humanoid/explorer.npc.snbt ~ ~ ~` |
| Mercader del Nexus | `nexus_merchant` | Cambio neutral y ocho ofertas de suministros básicos | Tienda 6 | ninguno; trading nativo | OPERATIVA V1; interior en construcción | `106,74,55`; oeste `90` | `/easy_npc preset import_new custom easy_npc:preset/humanoid/nexus_merchant.npc.snbt ~ ~ ~` |
| Pescador del Nexus | `nexus_fisher` | Pesca, colecciones, retos y contratos acuáticos | Lago | Pesca del Nexus `4E58464953483031` | OPERATIVO V2; embarcadero en construcción | sin verificar | `/easy_npc preset import_new custom easy_npc:preset/humanoid/nexus_fisher.npc.snbt ~ ~ ~` |
| Maestre de Obras | `market_foreman` | Entregas y seguimiento de proyectos comunitarios | Oficina de Proyectos del Nexus | Proyectos del Nexus `4E5850524F4A3031` | OPERATIVA V1; interior en construcción | sin verificar | `/easy_npc preset import_new custom easy_npc:preset/humanoid/market_foreman.npc.snbt ~ ~ ~` |
| Agrimensora del Nexus | `market_surveyor` | Investigación del Nexus, dimensiones conocidas y descubrimientos | Observatorio del Nexus | Observatorio del Nexus `4E584F4253455231` | OPERATIVO V1; interior en construcción | sin verificar | `/easy_npc preset import_new custom easy_npc:preset/humanoid/market_surveyor.npc.snbt ~ ~ ~` |
| Enlace del Nexus | `nexus_liaison` | Recolección, caza, exploración y apoyo opcional | Casa de Contratos | Contratos del Nexus `4E58434F4E545231` | OPERATIVA V1; interior en construcción | sin verificar | `/easy_npc preset import_new custom easy_npc:preset/humanoid/nexus_liaison.npc.snbt ~ ~ ~` |
| Intendente del Distrito | `district_steward` | Logística y necesidades colectivas futuras | Intendencia del Nexus | ninguno; logística comunitaria futura | EN CONSTRUCCIÓN | sin verificar | `/easy_npc preset import_new custom easy_npc:preset/humanoid/district_steward.npc.snbt ~ ~ ~` |
| Conservadora del Mercado | `market_curator` | Trofeos, reliquias y descubrimientos permanentes | Museo del Nexus | Museo del Nexus `4E584D5553455531` | OPERATIVA V1; interior en construcción | sin verificar | `/easy_npc preset import_new custom easy_npc:preset/humanoid/market_curator.npc.snbt ~ ~ ~` |
| Expedicionario del Nexus | `nether_expeditionary` | Expediciones dimensionales y guía de Realms | Acceso/expedición dimensional | Nether `4E584E4554483031`; Aether `4E58414554483031` | OPERATIVO V1 | sin verificar | `/easy_npc preset import_new custom easy_npc:preset/humanoid/nether_expeditionary.npc.snbt ~ ~ ~` |

La Oficina de Proyectos usa FTB Quests para registrar entregas consumibles y
compartir su progreso entre miembros del mismo equipo FTB. Cada recompensa es
única para el equipo y la recibe quien la reclama. Este seguimiento no es un
contador global de todo el servidor: equipos distintos mantienen progresos
independientes.

Completar un proyecto solo registra la contribución. No ejecuta WorldEdit,
comandos de construcción, schematics ni cambios de bloques. Carlos debe revisar
los proyectos completados y aplicar manualmente cualquier cambio físico en el
Market cuando corresponda.

La Casa de Contratos ofrece ocho encargos repetibles de Era I mediante FTB
Quests. Sus cooldowns son nativos, su progreso se comparte dentro del mismo
equipo FTB y cada recompensa solo puede reclamarla una vez el equipo. No concede
stages, teleports ni acceso dimensional. Los futuros contratos por Era,
cacerías especiales, cadenas semanales, reputación y recompensas cosméticas no
forman parte de la V1.

El Museo del Nexus registra posesión de nueve trofeos, reliquias y hallazgos sin
consumirlos. No coloca vitrinas, pedestales, cabezas, objetos decorativos ni
entidades. Carlos puede preparar manualmente estas representaciones físicas
cuando diseñe el interior, tomando el progreso de FTB Quests como referencia.
Las futuras secciones de Nether, Aether, Otherside, dragones y otros Realms deben
ampliar el mismo capítulo sin automatizar la decoración.

El Observatorio registra instrumentos, muestras comunes y fenómenos de los cinco
Realms conocidos sin consumir los objetos. Sus dependencias siguen las Eras, pero
no ejecuta teleports, portales, concesiones de stages ni comandos de desbloqueo:
History Stages conserva toda la autoridad dimensional. Las instalaciones físicas
y cualquier representación de las investigaciones se preparan manualmente.

Estado consolidado verificado: Oficina de Proyectos, Casa de Contratos, Museo y
Observatorio están operativos en V1. La Intendencia permanece en construcción;
el Pack 32.4 no está aplicado en el árbol actual, su preset declara que todavía
no ofrece servicios y no existe un capítulo funcional asociado.

La Expedición al Nether queda disponible desde Era II mediante el Expedicionario
y el capítulo `expedicion_al_nether`. La Expedición al Aether se abre desde el
mismo NPC y su capítulo `expedicion_al_aether` depende de Era III. Los botones
solo abren FTB Quests. La entrada real usa los portales nativos y las
restricciones `minecraft:the_nether` y `aether:the_aether` ya configuradas en
History Stages; no hay teleports, listeners, stages concedidos ni portales
alternativos. La V1 del Aether cubre preparación, recursos, criaturas y sus
tres dungeons nativos. End y Otherside permanecen reservados para Era IV.

En el mundo auditado, el Mercader es la única excepción operativa: no debe
importarse otra copia, sino conservarse y moverse la entidad indicada en la
sección anterior. La tabla mantiene su comando exacto para mundos nuevos.

### Procedimiento por NPC

1. Situarse exactamente en la posición libre.
2. Ejecutar `/easy_npc list`.
3. Si el NPC ya existe, no ejecutar `import_new`: obtener su UUID y moverlo.
4. Si no existe, ejecutar una sola vez el comando de la tabla con `~ ~ ~`.
5. Ejecutar `/easy_npc list` e identificar el nuevo UUID.
6. Aplicar `/easy_npc rotate <UUID> <yaw>`.
7. Comprobar nombre, diálogo, inmovilidad e invulnerabilidad.
8. Alejarse y confirmar que deja al menos dos bloques útiles de circulación.

No colocar NPCs en escaleras, puertas, bloques interactivos ni sobre la
Waystone. No incluir UUIDs de mundo dentro de presets o documentación
versionada.

### Actualización de un preset

`import_new` siempre crea otra entidad. Para actualizar:

1. Hacer copia del mundo.
2. `/easy_npc list`.
3. `/easy_npc info <UUID_ANTIGUO>`.
4. Registrar posición y yaw fuera del preset.
5. `/easy_npc delete <UUID_ANTIGUO>`.
6. Importar el preset nuevo una sola vez.
7. Registrar el UUID nuevo y restaurar orientación.
8. Reiniciar y confirmar que existe exactamente una entidad.

Este mismo flujo permite la evolución prevista sin añadir un sistema dinámico:

- v1: preset con diálogo de edificio en construcción;
- v2: actualizar el preset cuando existan las primeras funciones;
- v3: actualizarlo de nuevo cuando el interior y su contenido estén completos.

En cada salto de versión se elimina e importa de nuevo una sola entidad; nunca
se ejecuta `import_new` sobre una copia todavía existente.

## Guardia del Nexus

La primera dotación usa exclusivamente Guard Villagers `1.6.18`, ya instalado.
No forma parte de Easy NPC y no se inserta en schematics. Las posiciones exactas
se decidirán manualmente sobre el mapa terminado.

| Puesto previsto | Función | Tipo | Equipamiento recomendado |
|---|---|---|---|
| Acceso principal A | Interceptar amenazas que entren desde el exterior | melee | espada de hierro, escudo y armadura de hierro |
| Acceso principal B | Cobertura del segundo acceso | ranged | ballesta, flechas de reserva y armadura de hierro |
| Plaza/centro A | Respuesta cercana alrededor del Nexus | melee | espada de hierro, escudo y armadura de hierro |
| Plaza/centro B | Cobertura cruzada de la plaza | ranged | ballesta, flechas de reserva y armadura de hierro |
| Ayuntamiento A | Protección cercana del edificio y sus NPCs | melee | espada de hierro, escudo y armadura de hierro |
| Ayuntamiento B | Cobertura a distancia del entorno del Ayuntamiento | ranged | ballesta, flechas de reserva y armadura de hierro |
| Zona comercial | Cobertura de las seis tiendas | ranged | ballesta, flechas de reserva y armadura de hierro |
| Acceso dimensional/Nether | Contención inmediata del acceso | melee | espada de hierro, escudo y armadura de hierro |

### Creación y configuración manual

La versión instalada permite convertir un aldeano adulto desempleado al hacer
clic derecho sobre él con un objeto incluido en
`guardvillagers:convertible_guard_items`: una espada o una ballesta compatible
con el tag Forge de ballestas. El guardia conserva como arma el objeto usado por
el reclutador y le concede a ese jugador la reputación necesaria para abrir su
inventario.

1. Llevar un aldeano adulto desempleado al puesto definitivo.
2. Usar una espada de hierro para un guardia melee o una ballesta vanilla para uno ranged.
3. Abrir la interfaz del guardia y completar la armadura de hierro.
4. Para melee, colocar espada en mano principal y escudo en secundaria; para ranged, mantener la ballesta y añadir flechas de reserva.
5. Con el guardia situado exactamente en el puesto, activar en su interfaz el botón de puesto/patrulla. Guard Villagers guarda su posición actual como punto de retorno.
6. No activar el botón de seguimiento del jugador.
7. Repetir hasta tener exactamente ocho guardias y comprobar visualmente cada puesto.

La configuración local ya mantiene `Have guards patrol the village regularly? = false`.
Debe seguir así: el botón individual de puesto es suficiente y evita habilitar
una patrulla global de aldeas. Tampoco debe usarse la orden masiva de seguimiento
mediante campanas para esta dotación fija.

Prueba de aceptación: cada guardia vuelve a su puesto después de combatir, ataca
un hostil que cruza desde fuera y responde a los invasores de una Horda sin
abandonar permanentemente su sector.

## Waystone definitiva

`waystones.dat` contiene cuatro Waystones naturales en el Overworld:

```text
-160,72,320
-96,65,336
304,63,336
352,70,224
```

Ninguna está dentro de Nexus Market. Tampoco existe ningún bloque
`waystones:*` en los chunks del mercado.

La reserva definitiva comprobada es:

```text
125,77,6
```

En esa posición hay pedestal de `minecraft:polished_blackstone_bricks` debajo
y tres bloques verticales libres. Para crear una Waystone válida:

1. Usar en creativo el objeto real `waystones:waystone`.
2. Colocarlo manualmente sobre el pedestal en `125,77,6`.
3. No usar schematic, clonación de NBT ni una copia procedente de otro mundo.
4. Abrir su interfaz y asignar la identidad propia de este mundo.
5. Activarla y realizar un viaje de ida y vuelta.
6. Reiniciar.
7. Confirmar que el bloque sigue presente, abre su interfaz y conserva su
   entrada propia en `data/waystones.dat`.

La colocación mediante el objeto real permite que Waystones cree su estructura,
BlockEntity e identificador. Si ya existiese una Waystone funcional en otro
despliegue, no se reemplaza.

## Spawn global

El spawn actual guardado es:

```text
0,64,32
spawnRadius = 10
```

Tras pegar V6, ese Y queda dentro de la cimentación, cuya superficie está en
`Y=73`. No es un spawn final seguro.

La zona de llegada comprobada recomendada es:

```text
70,74,20
```

El bloque inferior es `minecraft:polished_andesite`, existen tres bloques de
aire vertical y está a 25 bloques del centro protegido, sin coincidir con
ninguna reserva NPC. Mirando al sur presenta el Nexus al jugador.

Después de una última comprobación visual manual:

```text
/setworldspawn 70 74 20 0
/gamerule spawnRadius 0
```

Probar con un jugador sin OP o un jugador nuevo. Debe aparecer con los pies en
`Y=74`, sin caída, sin colisión y dentro de la futura región protegida. Camas u
otros puntos personales de reaparición siguen teniendo prioridad para
jugadores que ya los tengan.

En otro mundo se debe elegir una superficie de recepción equivalente y no
copiar estas coordenadas.

## Recorrido recomendado del jugador nuevo

El recorrido es orientativo y no una cadena rígida:

```text
Spawn
→ Custodio
→ 00_comienzo
→ Cronista y explicación de Eras
→ selector único de clase
→ maestro de clase
→ Mercader
→ Explorador o Capitán
→ Expedicionario
```

El Ayuntamiento reúne al Custodio, Cronista y Capitán. Las seis tiendas alojan
a los maestros, el Mercader y el Explorador. El lago, los cinco edificios
adicionales y parte del acceso dimensional siguen en desarrollo y se abrirán
con la evolución del servidor. Ningún NPC es obligatorio para desplazarse o
jugar; sus diálogos y botones sirven como guía hacia sistemas existentes.

## Matriz runtime final

### Nexus Core 0.6.2

- [ ] El log contiene `Nexus Core era progression, UI, and market protection loaded.`
- [ ] No existe ni se carga `nexus-core-0.6.0.jar`.
- [ ] `/nexus_market status` existe y empieza desactivado.
- [ ] `/nexus_market enable` con configuración incompleta falla.
- [ ] No aparecen excepciones `MarketProtection` ni errores al guardar
      `nexuscore_market_protection.dat`.

### Protección

- [ ] Centro, dimensión y radio de `status` son correctos.
- [ ] Jugador normal dentro: romper está bloqueado.
- [ ] Jugador normal dentro: colocar está bloqueado.
- [ ] Agua y lava están bloqueadas.
- [ ] Encender fuego directamente está bloqueado.
- [ ] Puerta, botón y palanca funcionan.
- [ ] Contenedor e interfaz de máquina funcionan.
- [ ] Waystone funciona.
- [ ] Easy NPC, diálogo, trading y botón FTB funcionan.
- [ ] Jugador normal fuera: romper y colocar funcionan.
- [ ] OP nivel 2 puede editar dentro.
- [ ] En explosión parcialmente solapada sobreviven los bloques interiores y
      pueden romperse los exteriores.
- [ ] Se prueba por separado propagación de fuego desde fuera; es una
      limitación conocida de Pack 28.2.

### NPCs y Mercader

- [ ] `/easy_npc list` devuelve exactamente dieciséis NPCs.
- [ ] Hay exactamente uno de cada nombre y función.
- [ ] Los dieciséis son inmóviles, persistentes e invulnerables.
- [ ] Los ocho NPCs de contenido abren el capítulo correcto.
- [ ] El Mercader abre trading.
- [ ] Funcionan `10 Bronce -> 1 Plata` y `1 Plata -> 10 Bronce`.
- [ ] Funcionan `10 Plata -> 1 Oro` y `1 Oro -> 10 Plata`.
- [ ] Funciona al menos una compra de suministro.
- [ ] Ningún ciclo de cambio produce beneficio.

### Waystone y spawn

- [ ] La Waystone se activa, permite viajar y conserva su identidad al
      reiniciar.
- [ ] El spawn no está dentro de bloques, sobre NPCs ni fuera de protección.
- [ ] `spawnRadius` evita dispersiones hacia edificios u obstáculos.

### Reinicio

- [ ] La protección conserva estado, dimensión, centro y radio.
- [ ] Persisten exactamente dieciséis NPCs y no aparecen duplicados.
- [ ] Persisten diálogos y trading.
- [ ] Persiste la Waystone.
- [ ] El spawn sigue siendo seguro.

## Revisión de logs

Después de la sesión final buscar:

```text
Nexus Core
MarketProtection
nexus_market
Easy NPC
FTB Quests
Waystones
KubeJS
```

### Errores nuevos del hub

En el log auditado no se puede evaluar Pack 28.2 porque corresponde a Nexus
Core 0.5.0. No hay errores de Easy NPC, FTB Quests o Waystones asociados a las
operaciones comprobadas, pero existen los tres Mercaderes duplicados descritos.

Cualquier excepción nueva que incluya `MarketProtection`, el comando
`nexus_market`, el SavedData, uno de los dieciséis presets o la Waystone del mercado
debe tratarse como error nuevo del hub.

### Warnings y errores preexistentes ajenos

El último log ya contiene, antes de la validación 0.6.1:

- `nexus_era_calendar.js`: redeclaración de `var era`;
- `nexus_horde_presentation.js`: redeclaración de `var data`;
- errores de loot tables defectuosas de DecoCraft;
- warnings de modelos de otros mods;
- warnings de BlockEntities de `minecraft:smithing_table`;
- `Skipping Entity with id` sin identificador.

No se corrigen ni se atribuyen a Pack 28.3.

## Mantenimiento y recuperación

### Actualización del modpack

1. Detener servidor y respaldar mundo.
2. Sincronizar el pack.
3. Confirmar un solo JAR de Nexus Core y los tres módulos Easy NPC esperados.
4. Arrancar y revisar versiones.
5. Ejecutar `/nexus_market status`.
6. Ejecutar `/easy_npc list`.
7. Probar un diálogo, una compra y la Waystone.
8. Reiniciar y repetir `status` y `list`.

### Reinstalación o servidor dedicado

Copiar el mundo conserva SavedData, NPCs y Waystones. No copiar únicamente
archivos NPC aislados ni `waystones.dat`. Tras instalar el pack:

1. verificar JARs;
2. abrir el mundo;
3. comprobar `status`, `list`, Waystone y spawn;
4. importar solo los NPCs realmente ausentes.

### Recuperación ante duplicados

1. No volver a importar.
2. `/easy_npc list`.
3. Inspeccionar cada candidato con `/easy_npc info <UUID>`.
4. Conservar la entidad correcta.
5. Eliminar una a una las copias confirmadas.
6. Reiniciar y comprobar el total.

Nunca borrar a ciegas la carpeta `easy_npc`, editar archivos `.dat` del mundo o
reutilizar UUIDs de otro save.
