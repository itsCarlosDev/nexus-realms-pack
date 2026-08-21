# Rangos, owner y teletransporte del servidor

## Autoridad

Nexus Realms usa una sola capa adicional de permisos: FTB Ranks. No usa
LuckPerms ni listeners propios de permisos.

El único operador y administrador permitido se obtiene del `ops.json` privado:

- identidad: una sola entrada válida, no versionada;
- nivel OP: `4`;
- rango interno: `owner`
- nombre visual: `Fundador del Nexus`
- prefijo: `[Fundador del Nexus]`

`ops.json` no se distribuye con Packwiz y no existe una copia o plantilla con
la identidad real en el repositorio. Los actualizadores exigen que el archivo
efectivo contenga exactamente una entrada con nombre y UUID de Minecraft
válidos antes de aplicar una actualización. También exigen:

```properties
op-permission-level=4
```

Ningún rango concede OP. El rango `owner` se activa con la condición real
`op`; por ello la regla de un único operador lo vincula exclusivamente a la
identidad privada indicada en `ops.json`.

## Rango automático

Todo jugador recibe automáticamente:

- rango interno: `traveler`
- nombre visual: `Viajero del Nexus`
- prefijo: `[Viajero del Nexus]`
- condición: `always_active`
- power: `1`

`owner` tiene power `100`, por lo que su formato visual prevalece sobre
`traveler`. Los rangos no guardan ninguna relación con Guerrero, Mago o
Pistolero y no cambian HistoryStages.

La configuración distribuida es:

```text
defaultconfigs/ftbranks/ranks.snbt
```

La configuración efectiva es:

```text
<world>/serverconfig/ftbranks/ranks.snbt
```

Las asignaciones explícitas, si existieran, permanecen en
`<world>/serverconfig/ftbranks/players.snbt`. El actualizador solo reemplaza
la definición antigua conocida del pack. Si detecta una definición
personalizada, se detiene antes de actualizar y no la sobrescribe.

## FTB Essentials

Packwiz instala una sola versión:

```text
ftb-essentials-forge-2001.2.4.jar
```

El propio JAR declara compatibilidad con Forge `47.0.1+`, Minecraft
`1.20.1+`, FTB Library `2001.1.2+` y, opcionalmente, FTB Ranks `2001.1.3+`.
Las versiones del pack satisfacen esos mínimos. No se instaló LuckPerms.

La configuración distribuida es
`defaultconfigs/ftbessentials-server.snbt`. Para un mundo existente, la
configuración efectiva es `<world>/serverconfig/ftbessentials.snbt` y se
conserva en actualizaciones posteriores.

Los viajeros reciben:

```text
/home [nombre]
/sethome <nombre>
/delhome <nombre>
/listhomes
/tpa <jugador>
/tpahere <jugador>
/tpaccept <id>
/tpdeny <id>
/spawn
/back
```

FTB Essentials 2001.2.4 registra `/tpdeny`, no `/tpadeny`. Los mensajes TPA
incluyen botones que ejecutan `/tpaccept <id>` o `/tpdeny <id>`.

Valores configurados:

- cinco homes por jugador;
- cooldown de 10 segundos para home, spawn y TPA;
- warmup de 3 segundos para home, spawn, TPA, back y warp;
- cooldown de 30 segundos para `/back`;
- `/rtp` deshabilitado;
- warp, setwarp y delwarp denegados a `traveler`;
- comandos administrativos de Essentials denegados a `traveler`;
- el owner conserva los comandos administrativos mediante OP y
  `command = true`.

En 2001.2.4 las solicitudes TPA expiran de forma fija a los 60 segundos. El
warmup se cancela si el jugador:

- se mueve más de medio bloque;
- recibe daño;
- cambia de dimensión;
- se desconecta.

Los destinos TPA usan `EntityArgument.player()`, de modo que el objetivo debe
estar conectado. Los homes se guardan por UUID en:

```text
<world>/ftbessentials/playerdata/<uuid>.snbt
```

Los warps y otros datos globales se guardan en:

```text
<world>/ftbessentials/data.snbt
```

## JourneyMap 5.10.3

JourneyMap permanece marcado `side = "both"`.

La configuración generada real de la versión 5.10.3 no contiene propiedades
con los nombres literales “Allow All Teleporting”, “Waypoint Only
Teleporting” ni “Dimension Teleport”. Los campos operativos reales son:

```json
"journeymapEnabled": "true"
"allowWaypoints": "true"
"teleportEnabled": "false"
```

La interfaz de 5.10.3 denomina `teleportEnabled` como “Waypoint
Teleporting”, pero la validación del JAR 5.10.3 demuestra que el mismo
permiso añade “Teleport” al menú contextual del mapa y acepta un paquete con
coordenadas arbitrarias. El servidor comprueba las dimensiones de origen y
destino, pero no comprueba que el destino corresponda a un waypoint guardado.
Por ello no existe un modo seguro de habilitar solo waypoint-teleport para
viajeros.

La configuración global efectiva está fuera del mundo:

```text
journeymap/server/5.10/journeymap.server.global.config
```

Los archivos de dimensión heredan la configuración global mientras tengan
`"enabled": "false"`. Si un archivo tiene un override de dimensión activo,
el actualizador conserva el override y desactiva `teleportEnabled` en él.

La administración de JourneyMap sí usa la configuración Forge del mundo:

```text
<world>/serverconfig/journeymap-server.toml
```

`opAccess` permanece activo. La configuración pública usa `serverAdmins = []`;
durante la actualización, el wrapper escribe en la configuración efectiva
únicamente el UUID derivado del `ops.json` privado. Dado que no existe otro OP,
solo esa identidad dispone del panel y del teletransporte administrativo.

Los viajeros pueden usar JourneyMap y gestionar waypoints personales, pero
no pueden teletransportarse con JourneyMap. Usan `/home`, `/spawn`, `/back`
y TPA como alternativas seguras, sin recibir `/tp` vanilla.

## Separación de permisos

Los jugadores normales no reciben `command.tp`, `command.gamemode`,
`command.give`, `command.execute` ni un nivel general de permisos. Esos
comandos conservan su requisito vanilla y fallan para usuarios sin OP.

No se añaden denegaciones absolutas de FTB Ranks sobre comandos vanilla. Esto
preserva las recompensas internas de FTB Quests que ejecutan comandos con
`elevate_perms: true`, sin hacer que el comando quede disponible para el
jugador.

## Actualizaciones y datos preservados

`.packwizignore` excluye explícitamente:

```text
ops.json
server.properties
world/
journeymap/server/
```

El actualizador PowerShell:

1. valida `ops.json` y `op-permission-level=4`;
2. comprueba que `index.toml` no gestiona rutas operativas;
3. toma una instantánea en memoria de `ops.json` y `server.properties`;
4. restaura ambos y aborta si Packwiz modifica cualquiera;
5. conserva el mundo completo, incluyendo playerdata, entidades,
   FTB Essentials, FTB Ranks y serverconfigs;
6. crea o ajusta solo los campos necesarios de JourneyMap;
7. no reemplaza configuraciones de rangos personalizadas.

El helper Bash también deriva y valida el owner desde `ops.json`, protege byte
por byte `ops.json` y `server.properties`, y sincroniza JourneyMap sin publicar
la identidad.

## Pruebas runtime

Las comprobaciones estáticas no sustituyen una sesión con dos identidades.
Antes de producción se debe probar:

1. La identidad única de `ops.json` conserva OP 4 y el formato Fundador del Nexus tras reiniciar.
2. Un jugador real sin OP recibe Viajero del Nexus y no puede ejecutar
   `/tp`, `/gamemode`, `/give` ni `/execute`.
3. El mismo jugador crea cinco homes y el sexto falla con
   `Can't add any more homes!`.
4. TPA requiere aceptación, caduca a los 60 segundos y se cancela durante
   el warmup por movimiento o daño.
5. JourneyMap permite crear y gestionar waypoints; solo el único OP puede usar
   su teleport, incluso entre dimensiones habilitadas.
6. FTB Quests, FTB Teams, HistoryStages, clases y protección del mercado
   continúan funcionando.
7. `latest.log` no contiene errores o warnings repetitivos nuevos.

Hasta completar esas pruebas: **Not runtime-tested.**
