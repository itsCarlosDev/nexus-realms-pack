# Client default settings

Esta guia explica como preparar los defaults de cliente del Pack 5 sin incluir `options.txt` directamente.

## Objetivo

- Distribuir teclas y opciones iniciales con Default Options.
- Mantener las preferencias personales de cada jugador en futuras actualizaciones.
- Configurar Xaero's Minimap para mostrar entidades y jugadores como iconos o cabezas cuando sea posible.
- Commitear solo los archivos correctos generados por el flujo.

## Preparacion

1. Trabaja siempre en `dev`.
2. Abre la instancia local/dev del pack desde Prism Launcher.
3. Usa una instancia limpia o revisa con cuidado los cambios antes de commitear.
4. No copies ni commitees `options.txt`.
5. No instales `.jar` manuales en `mods/`.
6. No crees configs de Xaero a mano si Minecraft todavia no genero un archivo base claro.

## Estado del Pack 5

- Default Options esta instalado como mod de cliente.
- Balm ya esta instalado como dependencia.
- `config/defaultoptions/` debe generarse desde Minecraft con `/defaultoptions saveAll`.
- Si `config/defaultoptions/` no aparece tras ejecutar el comando, deten el flujo y no inventes los archivos.

## Estrategia segura

La opcion recomendada es generar los archivos reales desde Prism una vez y despues revisar el diff. Esto evita depender de nombres internos de teclas, formatos privados de Xaero o valores que cambian entre versiones.

No se deben crear manualmente `config/defaultoptions/keybindings.txt`, `config/defaultoptions/options.txt` ni configs de Xaero salvo que exista un archivo generado por el mod y su formato sea claro.

## Configurar controles

1. Inicia Minecraft desde Prism.
2. Entra a un mundo temporal o de pruebas.
3. Abre `Options -> Controls`.
4. Usa Controlling para buscar conflictos y filtrar por mod.
5. Revisa especialmente estas categorias/mods:
   - Minecraft vanilla.
   - JEI.
   - Jade.
   - BetterF3.
   - Controlling.
   - Xaero's Minimap.
   - Xaero's World Map.
   - Waystones.
   - Traveler's Backpack.
   - Iron's Spells 'n Spellbooks.
   - Create.
6. Evita dejar conflictos activos en teclas de uso frecuente, como inventario, mapa, waypoints, backpack, spellbook, JEI, Jade, overlays y herramientas de Create.

## Distribucion sugerida de teclas

Usa esta distribucion como punto de partida y ajustala solo si Controlling muestra conflictos reales:

- Xaero Minimap settings: `Y`.
- Xaero World Map: `M`.
- Waypoint menu: `U`.
- New waypoint: `B`.
- Traveler's Backpack: `V`; usar `R` solo si queda libre.
- Iron's Spells spell wheel/cast/school book: elegir teclas libres cerca de combate/magia, evitando `R`, `V`, `B`, `M`, `U`, `Y`, `F3`, inventario y hotbar.
- Create goggles/toolbox/ponder/tool actions: mantener defaults salvo conflicto visible.
- JEI: mantener defaults si no chocan.
- Jade: mantener defaults si no chocan.
- BetterF3: mantener `F3`.
- Controlling: usarlo para buscar conflictos; no necesita una tecla critica.

Si una tecla aparece en rojo o como conflicto activo, no guardes defaults todavia. Resuelve el conflicto visualmente primero.

## Configurar Xaero's Minimap

1. Abre los ajustes de Xaero's Minimap, normalmente con `Y`.
2. Entra en `Entity Radar`.
3. Entra en `Entity Radar Categories`.
4. Activa la visualizacion de jugadores, mobs y otras entidades segun el comportamiento deseado para el pack.
5. Configura las categorias para usar iconos/cabezas cuando sea posible.
6. Acepta que Xaero puede mostrar puntos de color como fallback cuando no pueda renderizar un icono o cabeza para una entidad concreta.
7. Revisa tambien las teclas principales:
   - Minimap settings.
   - World map.
   - New waypoint.
   - Waypoints list.
   - Zoom in/out.

## Defaults sugeridos de Xaero

Configura estos valores desde la UI siempre que existan en la version instalada:

- Minimap visible: activado.
- Entity Radar: activado.
- Players: visible.
- Mobs: visible.
- Entity icons/player heads: activado o `Always` si la UI lo ofrece.
- Items: desactivado por defecto si ensucia demasiado el mapa.
- Entity names: desactivado por defecto para no saturar el HUD.
- Position: esquina comoda que no tape vida, hambre, armadura, minimapa u otros HUD.
- Zoom: valor medio/razonable.

No toques manualmente server profiles, world IDs, waypoint data, teleport commands, debug flags, variantes internas de entidades ni rutas internas de mapa.

## Guardar defaults con Default Options

1. Cuando los controles y ajustes visuales esten listos, entra a un mundo.
2. Ejecuta:

   ```mcfunction
   /defaultoptions saveAll
   ```

3. Cierra Minecraft.
4. Confirma que se genero:

   ```txt
   config/defaultoptions/
   ```

5. Revisa los cambios:

   ```bash
   git status --short
   ```

6. Deben commitearse los metadatos del pack, esta guia y los archivos generados dentro de `config/defaultoptions/`.

## Revision de archivos generados

Despues de cerrar Minecraft, revisa si aparecieron archivos de Xaero. Solo se deben conservar si son configs claras generadas por el mod. No commitees datos de mundos, waypoints personales, caches de mapa, logs ni archivos de runtime.

Archivos aceptables si existen y tienen formato claro:

- `config/defaultoptions/*`
- configs globales de Xaero generadas por el mod, sin datos personales ni de mundo

Archivos que requieren especial cuidado y normalmente no se deben commitear:

- datos de waypoints personales
- caches de mapa
- carpetas de mundo o servidor
- coordenadas privadas
- historial de servidores

## Archivos que no se deben commitear

- `options.txt`
- `servers.dat`, salvo decision explicita posterior
- `.vscode/`
- `mods/*.jar`
- `saves/`
- `logs/`
- `crash-reports/`

## Comprobaciones antes de commit

Ejecuta:

```bash
git status --short --branch
git branch --show-current
packwiz list
find config defaultconfigs -maxdepth 4 -print | sort
find . -maxdepth 4 -type f \( -iname '*xaero*' -o -iname '*defaultoptions*' -o -iname '*keybind*' -o -iname 'options.txt' \) -print | sort
packwiz refresh
./scripts/dev-check.sh
find . -name "*.jar" -print
rg -n 'file = "(\.vscode/|docs/|scripts/|options\.txt|.*\.jar")' index.toml
git status --short
git diff --name-status
```

La busqueda en `index.toml` no debe devolver resultados para `.vscode/`, `docs/`, `scripts/`, `options.txt` ni `.jar`.

Detente si:

- No estas en `dev`.
- Falta Balm o Default Options.
- Aparece cualquier `.jar`.
- `index.toml` incluye `.vscode/`, `docs/`, `scripts/`, `options.txt` o `.jar`.
- No se genera `config/defaultoptions/` tras `/defaultoptions saveAll`.
- Los archivos de Xaero no tienen formato claro.
- Aparecen cambios fuera de Pack 5.
