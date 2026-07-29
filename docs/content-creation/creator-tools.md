# Herramientas de creación de contenido

Nexus Realms combina CMDCam para recorridos reproducibles y Freecam para localizar encuadres. OBS realiza la captura final.

## CMDCam

- `P`: añadir un punto a la ruta.
- `U`: reproducir la ruta.
- `/cam save <nombre>`: guardar el recorrido.
- `/cam load <nombre>`: cargarlo.
- `/cam mode outside`: mantener al personaje visible desde una cámara exterior.
- `/cam interpolation`: configurar la interpolación entre puntos.
- `/cam target`: orientar la cámara hacia un objetivo.
- `/cam follow`: seguir un objetivo.

## Freecam

- `F4`: activar o desactivar Freecam por defecto.
- Permite mover la cámara libremente, atravesar bloques y preparar encuadres sin mover al jugador.
- Mantiene visible al personaje mediante la opción `Show Player`.
- `F4` + `1`…`9`: crear o recuperar cámaras tripod.

### Conflicto de tecla conocido

La instancia actual ya asigna `F4` a **TaCZ Attachments**. No se modifica automáticamente: antes de grabar, reasigna manualmente Freecam o TaCZ desde Controles para que cada acción tenga una tecla distinta.

## Flujos recomendados

### Cinemática de escenario

Freecam → buscar encuadres → CMDCam → crear puntos → guardar ruta → ocultar HUD → activar shader → grabar con OBS.

### Grabar al propio personaje

CMDCam en `outside mode` → crear un recorrido alrededor del jugador → reproducir → grabar con OBS.

### Posicionamiento rápido

Freecam → explorar ángulos → volver al jugador → reproducir la ruta final con CMDCam.
