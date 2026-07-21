# Nexus Realms — configuración de producción (Pack 29.5)

## Alcance

Esta guía prepara un servidor dedicado sin modificar ningún save ni incluir
secretos. No existe un `server.properties` versionado en el repositorio; los
valores siguientes deben aplicarse al archivo generado por la instalación de
producción. En DEV puede mantenerse `force-gamemode=false`.

## `server.properties` recomendado

```properties
gamemode=survival
force-gamemode=true
difficulty=normal
hardcore=false
allow-flight=true
spawn-protection=0
op-permission-level=4
online-mode=true
enforce-secure-profile=true
white-list=true
enforce-whitelist=true
enable-rcon=false
enable-query=false
```

`allow-flight=true` evita expulsiones incorrectas cuando una mecánica legítima
o modded mantiene al jugador en el aire. `spawn-protection=0` deja la protección
territorial en Nexus Core. No se fijan aquí distancias de simulación, límites de
entidades ni otros parámetros de rendimiento sin una prueba multiplayer.

## Roles y permisos

La fuente distribuida es `defaultconfigs/ftbranks/ranks.snbt`; en un mundo ya
creado, la fuente efectiva es `serverconfig/ftbranks/ranks.snbt` dentro del
directorio del mundo.

| Rol | Política de producción |
|---|---|
| PLAYER | Gameplay, FTB Quests, Easy NPC y comandos Nexus públicos. Sin permisos administrativos. |
| MODERATOR | PLAYER más `/kick`. Sin creativo, `/give`, WorldEdit o administración Nexus crítica. |
| ADMIN | Moderación ampliada y el subconjunto Nexus declarado expresamente en FTB Ranks. Sin creativo, `/give`, WorldEdit, `/op` ni árbol completo de comandos. |
| OWNER | Condición `op` y árbol completo de comandos. Reservado al único OP permanente previsto. |

No se deben añadir denegaciones globales sobre `/give`: las recompensas de FTB
Quests con `elevate_perms: true` necesitan ejecutar internamente sus comandos
sin conceder `/give` interactivo al jugador. `/nexus_testkit` y
`/nexus_givekit` conservan su requisito de nivel 2 y no están concedidos a
ADMIN; solo OWNER satisface su acceso en la política distribuida.

## Seguridad y acceso

- Mantener `online-mode=true` y `enforce-secure-profile=true`.
- Mantener la whitelist activada mientras el servidor sea privado.
- Conservar una sola entrada permanente en `ops.json`: Carlos. No versionar su
  nombre de cuenta, UUID ni el contenido del archivo.
- Asignar MODERATOR y ADMIN mediante FTB Ranks, nunca mediante `/op`.
- Mantener RCON desactivado. Si una operación futura lo requiere, habilitarlo
  temporalmente en una red restringida, usar un secreto fuera del repositorio
  y volver a desactivarlo.
- Mantener Query desactivado salvo que una herramienta de monitorización lo
  necesite de forma demostrada.
- No publicar puertos de RCON, Query, panel de hosting, SSH o consola. Exponer
  únicamente el puerto de juego necesario.
- Restringir la consola y el panel del servidor a Carlos y a operadores de
  infraestructura expresamente autorizados; usar credenciales individuales y
  segundo factor cuando el proveedor lo permita.
- No guardar IPs, contraseñas, tokens, claves ni copias de `ops.json` o
  `whitelist.json` en el repositorio.

## Backups

No se ha encontrado un mod, script o servicio de backups configurado en el
repositorio. La estrategia inicial debe ser externa al proceso de Minecraft:
snapshot del proveedor, tarea del sistema operativo o herramienta de backup del
host. No se añade un mod para esta función.

Alcance mínimo de cada copia:

- directorio completo del mundo, incluyendo `level.dat`, regiones,
  dimensiones, `data/`, `playerdata/`, estadísticas y avances;
- datos de Nexus Core, incluida la protección de Market bajo los datos del
  mundo;
- progreso de FTB Quests, equipos, History Stages, calendario y jugadores,
  conservados al copiar el mundo completo;
- `serverconfig/` del mundo, incluidos rangos y asignaciones FTB Ranks;
- `server.properties`, `config/`, `defaultconfigs/`, `kubejs/`, `mods/`,
  `pack.toml` e `index.toml` del despliegue.

Frecuencia y retención recomendadas:

- una copia automática cada seis horas mientras el servidor esté activo;
- conservar las últimas ocho copias de seis horas, catorce copias diarias y
  ocho copias semanales;
- crear una copia manual antes de actualizar mods, Nexus Core, configuraciones
  de History Stages o reglas de progresión/Eras;
- conservar cada copia previa a actualización hasta completar pruebas y al
  menos treinta días;
- realizar una restauración de prueba mensual en una ubicación aislada.

La copia consistente preferida se realiza con el servidor detenido. Si el
proveedor solo permite snapshots en caliente, ejecutar primero `save-all
flush`, confirmar el guardado y evitar cambios de configuración durante la
captura.

## Orden de despliegue de producción

1. Desplegar el modpack.
2. Iniciar una vez y cerrar limpiamente.
3. Colocar o importar el mundo definitivo con el servidor detenido.
4. Configurar `/setworldspawn 70 74 20 0` y `/gamerule spawnRadius 0`.
5. Desde `X=70`, `Z=45`, configurar `/nexus_market set_center`,
   `/nexus_market set_radius 120`, comprobar `/nexus_market status` y ejecutar
   `/nexus_market enable`.
6. Importar y colocar los dieciséis NPCs.
7. Crear, equipar y fijar los ocho Guardianes del Nexus.
8. Colocar y verificar la Waystone.
9. Confirmar Era I y acceso exclusivo al Overworld.
10. Probar con una cuenta nueva sin OP.
11. Activar la whitelist.
12. Detener y crear el backup inicial completo.
13. Abrir el servidor a las cuentas autorizadas.

## Checklist multiplayer previa

### Cuenta A — OWNER/OP

- [ ] Conecta y es la única identidad que recibe OWNER.
- [ ] Puede administrar Market, campaña, Eras y FTB Ranks.
- [ ] `/nexus_testkit` y `/nexus_givekit` funcionan solo para esta cuenta.
- [ ] Configura y consulta Market con centro `70,*,45` y radio `120`.
- [ ] Puede revisar consola y logs sin exponerlos a otros jugadores.

### Cuenta B — jugador nuevo sin OP

- [ ] Conecta en `70 74 20`, yaw `0`, en supervivencia.
- [ ] Completa el onboarding sin recibir permisos administrativos.
- [ ] Elige una sola clase y conserva el stage correcto.
- [ ] Recibe una recompensa FTB Quests con `elevate_perms: true` sin poder usar
  `/give` manualmente.
- [ ] Interactúa con NPCs, Mercader y Waystone.
- [ ] No puede usar creativo, `/give`, `/item`, WorldEdit, `/op`, comandos de
  Market, cambios de Era/campaña ni kits de prueba.
- [ ] No puede romper o colocar dentro del Market; fuera recupera el gameplay
  normal.
- [ ] Ve un único aviso al entrar y otro al salir del Market.
- [ ] No aparecen spawns hostiles normales dentro; enemigos existentes pueden
  entrar caminando.
- [ ] Participa en una Horda completa: aviso, inicio real, mobs, oleadas y
  finalización.
- [ ] Tras reiniciar persisten clase, quests, inventario, protección, NPCs,
  economía, Waystone y progreso de campaña.

### Comprobación cruzada

- [ ] Cuenta A puede moderar a Cuenta B según su rol; Cuenta B no puede elevar
  sus propios permisos.
- [ ] Whitelist, lista de operadores y rangos coinciden con la política.
- [ ] El backup inicial se puede enumerar y tiene tamaño coherente antes de
  abrir el servidor.
