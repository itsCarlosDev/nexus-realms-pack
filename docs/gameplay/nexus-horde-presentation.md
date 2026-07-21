# Presentación narrativa de las Hordas

## Relación Nexus ↔ Hordas

Las Hordas no son una invasión aleatoria. El Nexus altera el velo entre mundos: cada pulso ensancha sus grietas y permite que las criaturas del otro lado encuentren un camino.

The Hordes sigue siendo el sistema único de inicio, spawning, oleadas y finalización. KubeJS observa sus eventos y mantiene exclusivamente la presentación del Nexus.

## Integración técnica

- Script: `kubejs/startup_scripts/nexus_horde_presentation.js`
- Configuración de The Hordes: `config/hordes-common.toml`
- Tabla de aparición: `config/hordes/data/hordes/horde_data/scripts/default.json`
- Hooks nativos reutilizados:
  - `HordeStartEvent`
  - `HordeStartWaveEvent`
  - `HordeSpawnEntityEvent`
  - eventos existentes de muerte, salida, fin y tick de servidor
- Presentación reutilizada:
  - bossbar
  - actionbar
  - title/subtitle
  - sonidos vanilla
  - partículas vanilla

No se añadió otro scheduler funcional, otra lógica de oleadas ni una dependencia visual. El tick existente solo actualiza bossbar y efectos visuales breves; cada fase narrativa se marca en un `Set` y se presenta una vez.

## Fases de aviso

La preparación continúa durando 200 ticks, como antes. Los avisos se distribuyen así:

| Momento aproximado | Fase | Canal | Intención |
| --- | --- | --- | --- |
| 10 segundos | Temprana | actionbar + bossbar | Inquietud |
| 6 segundos | Media | actionbar + bossbar | Peligro |
| 2 segundos | Inmediata | actionbar + bossbar + sonido | Emergencia |
| Inicio de la primera oleada | Irrupción | title + subtitle + temblor | Impacto |

La bossbar muestra `EL NEXUS SE ABRE EN ...` durante la preparación. Durante el combate pasa a `PULSO DEL NEXUS · OLEADA ...`.

## Evolución por Era

La presentación lee la clave persistente `nexusEra`, la misma fuente que usa el calendario existente. No crea ni interpreta stages nuevos.

### Era I — el Nexus despierta

- «El Nexus despierta. Su pulso alcanza el otro lado.»
- «Una vibración recorre el Nexus. Algo escucha tras el velo.»
- «El pulso del Nexus se acelera. Preparaos.»
- «El Nexus vuelve a latir. Algo ha respondido al otro lado.»
- «El velo se debilita. La horda está cerca.»
- «El aire se desgarra alrededor del Nexus. Resistid.»

### Era II — las grietas se expanden

- «Las grietas del Nexus comienzan a abrirse.»
- «El pulso del Nexus ensancha las grietas entre mundos.»
- «Las grietas responden. Algo busca un camino hacia este mundo.»
- «El Nexus vuelve a latir. La oscuridad se acerca.»
- «Las grietas se abren. La horda está a punto de cruzar.»
- «El velo cede ante el Nexus. Preparaos para el impacto.»

### Era III — la contención falla

- «La maquinaria de contención pierde estabilidad.»
- «Los mecanismos del Nexus registran un pulso imposible.»
- «Los anillos de contención ya no frenan al Nexus.»
- «La contención se sobrecarga. Algo fuerza el paso.»
- «La contención ha fallado. El velo está cediendo.»
- «El Nexus rompe sus límites. La horda va a atravesarlo.»

### Era IV — el Nexus responde

- «El Nexus responde directamente desde el otro lado.»
- «Una voluntad remota ha encontrado el pulso del Nexus.»
- «El Nexus ha llamado... y algo ha respondido.»
- «El velo se curva ante la voluntad del Nexus.»
- «El velo se rompe. La respuesta ya está aquí.»
- «El Nexus se abre. Lo que aguarda al otro lado avanza.»

## Inicio de Horda

El título inicial usa una variante estable por jugador y fase:

- `LA HORDA ATRAVIESA EL NEXUS`
- `EL VELO CEDE: LA HORDA HA LLEGADO`
- `EL NEXUS SE ABRE. LA HORDA IRRUMPE`

Subtítulo:

```text
El pulso ha rasgado el velo.
```

La selección es estable dentro del mismo evento y no usa repetición por tick.

## Temblor del Nexus

Pack 29.8 añade un efecto exclusivamente visual al `HordeStartWaveEvent` de la primera oleada real:

- dura 40 ticks, aproximadamente 2 segundos;
- reproduce una sola combinación de latido grave y descarga del ancla de reaparición;
- emite pulsos ligeros de `reverse_portal` y `poof` alrededor del jugador ancla;
- es visible y audible para jugadores cercanos, con alcance limitado;
- no aplica efectos, velocidad, teletransporte ni rotación de cámara;
- se descarta junto con el estado visual cuando termina la Horda o el jugador sale.

La notificación actionbar nativa de The Hordes queda desactivada porque la narrativa ya pertenece a esta capa. Esto evita el texto duplicado o `undefined` debajo de la presentación sin alterar el ciclo funcional.

## Exclusión de Hordas simultáneas

The Hordes 1.6.3f acepta otro `hordes start` aunque el jugador ya tenga una Horda activa, lo que reinicia el temporizador y mezcla ambos intentos. `nexus_horde_reentry_guard.js` intercepta exclusivamente ese comando antes de ejecutarse y lo rechaza mientras el ciclo nativo, observado entre `HordeStartEvent` y `HordeEndEvent`, permanezca activo. El estado persistente del calendario no se utiliza para esta exclusión: puede estar reservado durante la cuenta atrás y no demuestra por sí solo que The Hordes haya comenzado correctamente.

El guard no genera mobs, no programa oleadas y no finaliza eventos. Los cuatro pasos siguen perteneciendo a The Hordes; únicamente impide una segunda entrada al ciclo hasta recibir `HordeEndEvent`.

## Corrección aplicada en Pack 28.5

El cambio de Pack 28.4 a `globalState` colisionaba con un binding global de KubeJS/Rhino durante la ejecución diferida de las funciones. El `latest.log` registró `TypeError: redeclaration of var globalState` en `nexusHordeReprogramGlobal`. Los identificadores locales usan ahora `hordeData`, mientras `nexusHordePersistentState` sigue reservado para el valor devuelto por `server.persistentData`.

## Validación runtime pendiente

En una Horda real se debe comprobar:

1. Un solo aviso temprano.
2. Un solo aviso medio.
3. Un solo aviso inmediato.
4. Un solo título al comenzar la primera oleada.
5. Un solo temblor de unos 2 segundos al comenzar esa primera oleada.
6. Ningún título ni temblor de inicio en oleadas 2–4.
7. Bossbar y contador de enemigos conservan el comportamiento anterior.
8. Los textos corresponden a la Era actual y no aparece `undefined` debajo.
9. No aparece spam en actionbar/chat, sonidos ni partículas.
10. Al terminar no quedan partículas, sonidos, efectos ni estado visual residual.
11. `latest.log` no contiene `redeclaration of var globalState` ni excepciones nuevas del script.
12. La finalización y la reprogramación de la siguiente Horda siguen bajo control de The Hordes y el calendario.
13. Intentar otro `hordes start` durante el evento no reinicia la cuenta atrás ni crea otra Horda.
14. Tras `HordeEndEvent`, una Horda posterior puede iniciarse normalmente.

Esta prueba requiere iniciar Minecraft y esperar o activar una Horda con los mecanismos administrativos existentes. No se ha automatizado mediante SendKeys, WinAPI ni simulación de ratón.
