# Roles y permisos del servidor Nexus Realms

## Implementado

Nexus Realms usa FTB Ranks como única capa adicional de roles. No se ha creado un sistema paralelo en Nexus Core ni en KubeJS.

- Mod: `ftbranks`
- Archivo: `ftb-ranks-forge-2001.1.7.jar`
- Minecraft: 1.20.1
- Loader: Forge
- Dependencias obligatorias ya presentes: Architectury API y FTB Library
- Configuración distribuida: `defaultconfigs/ftbranks/ranks.snbt`
- Configuración efectiva por mundo: `<world>/serverconfig/ftbranks/ranks.snbt`
- Asignaciones por mundo: `<world>/serverconfig/ftbranks/players.snbt`

El archivo de `defaultconfigs` crea la configuración inicial de cada mundo. Si un mundo ya tiene `serverconfig/ftbranks/ranks.snbt`, ese archivo del mundo es la fuente efectiva y debe actualizarse de forma deliberada con el servidor detenido.

FTB Ranks genera nodos de comandos con el formato real `command.<ruta Brigadier>`. Cuando no existe un nodo explícito, conserva la comprobación de permisos original del comando. Esto es importante para que una recompensa interna elevada de FTB Quests pueda ejecutar `/give @s` sin conceder `/give` al jugador.

## Jerarquía

FTB Ranks 2001.1.7 no usa una propiedad `parent`. La herencia efectiva se consigue acumulando rangos activos: PLAYER está siempre activo y el rango asignado de mayor `power` aporta permisos adicionales.

| Rango | Power | Activación | Capacidades |
| --- | ---: | --- | --- |
| PLAYER | 1 | `always_active` | Gameplay normal; ningún permiso administrativo añadido |
| MODERATOR | 50 | Asignación manual | PLAYER + `/kick` |
| ADMIN | 80 | Asignación manual | PLAYER + moderación ampliada y administración Nexus seleccionada |
| OWNER | 100 | `op` | Administración completa |

ADMIN no se asigna automáticamente. OWNER tampoco contiene un nombre de usuario: se activa para operadores. Por tanto, Carlos debe ser el único OP permanente.

## Permisos configurados

PLAYER no recibe nodos `command.*`. Los comandos públicos siguen funcionando mediante sus requisitos originales. Los comandos vanilla y modded administrativos siguen denegados a un jugador sin OP porque FTB Ranks conserva su comprobación original.

MODERATOR recibe únicamente:

```text
command.kick = true
```

MODERATOR no recibe `gamemode`, `give`, `item`, WorldEdit, administración de rangos ni comandos destructivos del mundo.

ADMIN recibe:

```text
command.kick
command.ban
command.ban-ip
command.pardon
command.pardon-ip
command.whitelist
command.nexus_market
command.nexus_resetclass
command.nexus_resetclass_clean
command.nexus_era.set
command.nexus_era.advance
command.nexus_era.request
command.nexus_era.sync
command.nexus_campaign.start
command.nexus_campaign.pause
command.nexus_campaign.resume
command.nexus_campaign.restart
command.nexus_campaign.set_day
command.nexus_specialization.unlock
```

ADMIN no recibe creativo, `/give`, `/item`, WorldEdit, `/op`, `/ftbranks`, `/execute`, `/function`, `/summon`, `/setblock`, `/fill`, `/clone` ni `/stop`.

OWNER recibe:

```text
command = true
```

Este nodo padre concede todos los comandos registrados. Solo debe aplicarse a Carlos mediante su condición de único OP.

## Presentación

PLAYER no muestra prefijo. Los demás rangos usan el nodo real `ftbranks.name_format`:

```text
MODERATOR  &8[&7MOD&8]&r {name}
ADMIN      &8[&3ADMIN&8]&r {name}
OWNER      &8[&5OWNER&8]&r {name}
```

Son prefijos discretos y no introducen un sistema de chat adicional.

## Comandos Nexus auditados

### Públicos

- `/nexus_select <warrior|mage|gunslinger>`
- `/nexus_class_help`
- `/nexus_class_status`
- `/nexus_class_menu`
- `/nexus_specialization status`
- `/nexus_specialization select arcanist`
- `/nexus_specialization select metallurgist`
- `/nexus_specialization reset` para el propio jugador
- `/nexus_era get`
- `/nexus_campaign get`

La selección de clase y especialización continúa usando sus comprobaciones de progresión existentes. El reset de especialización propio no entrega objetos ni salta requisitos; no se cambió su lógica.

### Administrativos en la implementación existente

- `/nexus_market set_center`
- `/nexus_market set_radius <radius>`
- `/nexus_market enable`
- `/nexus_market disable`
- `/nexus_market status`
- `/nexus_testkit`
- `/nexus_givekit`
- `/nexus_resetclass`
- `/nexus_resetclass_clean`
- `/nexus_era set`
- `/nexus_era advance`
- `/nexus_era request`
- `/nexus_era sync`
- `/nexus_campaign start`
- `/nexus_campaign pause`
- `/nexus_campaign resume`
- `/nexus_campaign restart confirm`
- `/nexus_campaign set_day`
- `/nexus_specialization unlock metallurgist`
- variantes administrativas de estado/reset que apuntan a otro jugador

Todos estos comandos ya exigen nivel de permiso 2 en Nexus Core o KubeJS. ADMIN recibe únicamente el subconjunto operativo indicado arriba. Los comandos de prueba y entrega arbitraria de kits quedan reservados a OWNER.

## Administración de rangos

Los comandos reales de FTB Ranks 2001.1.7 requieren administración:

```text
/ftbranks add <players> <rank>
/ftbranks remove <players> <rank>
/ftbranks list_ranks_of <player>
/ftbranks list_players_with <rank>
/ftbranks reload
```

Ejemplos:

```text
/ftbranks add Nombre moderator
/ftbranks remove Nombre moderator
/ftbranks add Nombre admin
/ftbranks remove Nombre admin
```

No se asigna OWNER con `ftbranks add`. OWNER representa al único OP. Para revocar acceso total:

```text
/deop Nombre
```

Después se debe comprobar:

```text
/ftbranks list_ranks_of Nombre
```

La edición dinámica de nodos existe con:

```text
/ftbranks node add <rank> <node> <value>
/ftbranks node remove <rank> <node>
/ftbranks node list <rank>
```

Los cambios permanentes del pack deben reflejarse también en `defaultconfigs/ftbranks/ranks.snbt`; no deben quedar solo en un mundo.

## Seguridad de creativo y generación de objetos

Configuración recomendada para el servidor dedicado definitivo:

```properties
gamemode=survival
force-gamemode=true
op-permission-level=4
```

No existe un `server.properties` versionado en el repositorio ni en la instancia integrada local auditada, por lo que estos valores no se han escrito automáticamente.

Se recomienda `force-gamemode=true`: cada conexión vuelve a aplicar el modo supervivencia configurado. Esto también devuelve a supervivencia a Carlos al reconectar; como OWNER puede cambiar su modo después cuando haga tareas administrativas.

Medidas del servidor:

- PLAYER y MODERATOR permanecen sin OP.
- Solo Carlos debe figurar en `ops.json`.
- No se conceden `command.gamemode`, `command.give` ni `command.item`.
- `/op`, `/deop`, `/execute`, `/function`, `/summon`, `/setblock`, `/fill`, `/clone` y `/stop` mantienen su requisito vanilla.
- WorldEdit 7.2.15 conserva sus comprobaciones de servidor; no se conceden permisos WorldEdit a PLAYER, MODERATOR ni ADMIN.
- El modo cheat de JEI es una interfaz cliente: no evita la autorización del servidor. Un jugador supervivencia sin permisos no puede generar el objeto.
- Las recompensas de comando de FTB Quests usan `elevate_perms: true`. Al no imponer una denegación absoluta sobre `command.give`, siguen pudiendo ejecutar su recompensa interna; el jugador normal continúa sin poder usar `/give` manualmente.
- Reiniciar el proceso del servidor no es un comando vanilla disponible para jugadores. El acceso al panel o servicio de hosting debe protegerse fuera de Minecraft.

## Despliegue

1. Instalar/actualizar el pack mediante packwiz.
2. Arrancar el mundo una vez para crear `serverconfig/ftbranks`.
3. Confirmar que el archivo efectivo coincide con `defaultconfigs/ftbranks/ranks.snbt`.
4. Configurar `gamemode=survival` y `force-gamemode=true` en el servidor dedicado.
5. Dejar únicamente a Carlos en `ops.json`.
6. Asignar MODERATOR o ADMIN solo con los comandos anteriores.
7. Ejecutar `/ftbranks reload` tras una edición controlada del archivo efectivo.
8. Probar con una cuenta real sin OP, no con Carlos degradado temporalmente dentro de la misma sesión.

## Checklist runtime pendiente

- PLAYER: `/gamemode creative`, `/give`, `/item`, `/op`, `/execute` y WorldEdit son rechazados.
- PLAYER: selección de clase, especialización, Easy NPC, trading, Waystones y FTB Quests funcionan.
- PLAYER: una recompensa FTB Quests con `elevate_perms: true` entrega su objeto.
- MODERATOR: `/kick` funciona y creativo, `/give` y WorldEdit siguen rechazados.
- ADMIN: moderación y comandos Nexus configurados funcionan; creativo y generación de objetos siguen rechazados.
- OWNER: Carlos conserva administración total.
- Reinicio: rangos y asignaciones persisten en `serverconfig/ftbranks`.

Estas comprobaciones requieren un servidor o mundo integrado arrancado con FTB Ranks y dos identidades de jugador. No se han simulado mediante GUI.
