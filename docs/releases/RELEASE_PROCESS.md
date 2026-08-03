# Procedimiento de releases de Nexus Realms

## Fuente de verdad

La versión oficial del modpack se encuentra en:

`pack.toml`

Campo:

`version = "MAJOR.MINOR.PATCH"`

Las versiones mostradas por Packwiz Installer Bootstrap no son la versión del modpack.

Nexus Core mantiene una versión independiente.

## Versionado

### PATCH

Ejemplo: `1.0.0 → 1.0.1`

Se utiliza para:

- correcciones de errores;
- ajustes pequeños de configuración;
- correcciones de quests;
- correcciones de NPC;
- correcciones de keybinds;
- ajustes pequeños de equilibrio;
- hotfixes compatibles con el mundo existente.

### MINOR

Ejemplo: `1.0.1 → 1.1.0`

Se utiliza para:

- nuevos mods;
- nuevas misiones;
- nuevo contenido;
- nuevas mecánicas;
- cambios importantes de equilibrio;
- cambios compatibles con el mundo existente.

### MAJOR

Ejemplo: `1.1.0 → 2.0.0`

Se utiliza para:

- reinicio del mundo;
- cambio de Minecraft;
- cambio de Forge;
- migraciones incompatibles;
- rediseño completo de clases;
- eliminación de sistemas fundamentales.

## Flujo normal

1. Trabajar en `dev`.
2. Ejecutar `packwiz refresh`.
3. Probar el cliente local.
4. Probar el servidor local.
5. Comprobar arranque y apagado.
6. Actualizar `CHANGELOG.md`.
7. Incrementar `version` en `pack.toml`.
8. Ejecutar nuevamente `packwiz refresh`.
9. Revisar `git diff`.
10. Hacer commit.
11. Enviar `dev` a GitHub.
12. Abrir PR `dev → main`.
13. Fusionar únicamente con las pruebas superadas.
14. Esperar `build`, `deploy` y `smoke`.
15. Hacer backup del servidor.
16. Reiniciar el hosting.
17. Comprobar actualización, entrada y apagado.

## Hotfix crítico

1. Crear una rama `hotfix/nombre` desde `main`.
2. Aplicar la reparación mínima.
3. Incrementar PATCH.
4. Probar localmente.
5. Fusionar en `main`.
6. Fusionar también el hotfix de vuelta en `dev`.

## Validación posterior

- GitHub Actions finaliza correctamente.
- El cliente recibe la actualización.
- El servidor recibe la actualización.
- No existen JAR duplicados.
- No reaparecen mods eliminados.
- El servidor llega a `Done`.
- Un jugador puede entrar.
- `save-all flush` funciona.
- `stop` termina el proceso Java.