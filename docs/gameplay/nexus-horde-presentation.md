# Sistema escalable y presentación de las Hordas

## Relación Nexus ↔ Hordas

Las Hordas no son una invasión aleatoria. El Nexus altera el velo entre mundos: cada pulso ensancha sus grietas y permite que las criaturas del otro lado encuentren un camino.

The Hordes sigue siendo la autoridad del evento, del pipeline de spawning, del tracking nativo y de `HordeEndEvent`. El calendario Nexus decide cuándo empieza la Horda global; Nexus Horde Director solicita cuatro oleadas nativas kill-gated y una manifestación final, y Presentation solo representa ese estado.

## Integración técnica

- Script: `kubejs/startup_scripts/nexus_horde_presentation.js`
- Director: `kubejs/startup_scripts/nexus_horde_director.js`
- Calendario y contexto compartido: `kubejs/server_scripts/nexus_era_calendar.js`
- Configuración de The Hordes: `config/hordes-common.toml`
- Tablas Nexus: `config/hordes/data/nexus/horde_data/tables/`
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

No se añadió otro scheduler ni una dependencia visual. El Director no reproduce el spawning: llama a `HordeEvent.spawnWave`, conserva el targeting/tracking existente y usa una única llamada final a `stopEvent(player, false)`. Presentation actualiza la bossbar y efectos visuales breves; cada fase narrativa se presenta una vez.

## Fases de aviso

La preparación continúa durando 200 ticks, como antes. Los avisos se distribuyen así:

| Momento aproximado | Fase | Canal | Intención |
| --- | --- | --- | --- |
| 10 segundos | Temprana | actionbar + bossbar | Inquietud |
| 6 segundos | Media | actionbar + bossbar | Peligro |
| 2 segundos | Inmediata | actionbar + bossbar + sonido | Emergencia |
| Inicio de la primera oleada | Irrupción | title + subtitle + temblor | Impacto |

La bossbar muestra `EL NEXUS SE ABRE EN ...` durante la preparación. Durante el combate pasa a `PULSO DEL NEXUS · OLEADA ...`.

## Escalado por amenaza

La Era y la amenaza son ejes independientes. La Era limita qué tablas y entidades pueden aparecer; el día efectivo de amenaza decide cantidades y desbloqueos `first_day` dentro de esas tablas. La primera Horda sigue programada desde el día 15 y el cooldown sigue siendo de 10 días, sin un día máximo.

Al comenzar una Horda se congela `nexusHordeThreatDay = max(día del mundo, nexusMaxHordeThreatDay)`. El máximo histórico evita que un retroceso de `/time set` rebaje la dificultad, pero no interviene en el scheduler. El estado activo se limpia al acabar o cancelar; el máximo histórico solo se limpia mediante `reset_production`.

| Amenaza | Día efectivo | Base |
| --- | ---: | ---: |
| I | 0–29 | 12 |
| II | 30–59 | 14 |
| III | 60–89 | 16 |
| IV | 90–119 | 18 |
| V | 120–159 | 20 |
| VI | 160–219 | 21 |
| VII | 220 en adelante | 22 |

Las oleadas aplican offsets `-2 / 0 / +1 / +2`. Los participantes añaden `min(2, max(0, participantes - 1))`; por tanto, tres y diez participantes reciben el mismo bonus máximo. Cada oleada se limita a 24 entidades. `hordeSpawnMultiplier = 1.0` elimina el doble escalado nativo y `spawnAmount = 15` queda solo como fallback para eventos sin contexto Nexus.

Las entradas de tabla son acumulativas: siempre existe al menos una desde `first_day = 0`, los refuerzos se desbloquean en 30/60/90/120/160/220 según la tabla y todas conservan `last_day = 0`. Ninguna tabla de una Era incorpora entidades de una Era posterior.

## Manifestación final

Después de confirmar limpia la cuarta oleada, el Director entra en `finisher`. Selecciona la tabla `nexus:eraN_finisher`, la instala solo durante una llamada nativa `spawnWave(player, 1)` y restaura la tabla anterior mediante `finally`. El campo interno de día de The Hordes 1.6.3f se sustituye únicamente durante cada llamada nativa para que `first_day` use el día congelado; también se restaura mediante `finally`.

La manifestación se registra en los mismos mapas de entidades, tags y targeting. Solo `LivingDeathEvent` permite despejarla: una descarga de chunk no simula su muerte. Si no se observa ninguna entidad, se realizan como máximo tres intentos separados por 200 ticks; si sigue vacía, o si la entidad permanece descargada durante 2400 ticks, el evento se cancela con semántica de parada por comando, sin victoria ni recompensa, y se reprograma. Un logout del anchor puede usar otro participante válido como jugador técnico sin cambiar el `HordeEvent` original.

La cuenta atrás, el inicio y las oleadas muestran el día y nivel de amenaza congelados. Al aparecer la manifestación se muestra una sola vez el title centrado `MANIFESTACION FINAL`, un subtítulo corto y la bossbar de una entidad, incluso si fue necesario reintentar el spawn. Tras su muerte, la victoria usa title/subtitle vanilla centrados, no muestra actionbar final y deja `EL NEXUS RESISTE` en bossbar brevemente antes de limpiarla.

`/nexus_era get` muestra día del mundo, amenaza efectiva, máximo histórico, base, cantidades previstas, participantes, Era, tabla activa, tabla de manifestación y próxima Horda.

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

El guard no genera mobs, no programa oleadas, no conoce la fase `finisher` y no finaliza eventos. Únicamente impide una segunda entrada al ciclo hasta recibir `HordeEndEvent`; el cambio previo a `IdentityHashMap` se conserva.

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
7. Cantidades correctas en días 15, 30, 60, 90, 120, 160, 220+ y 1000+ para 1, 2 y 3+ participantes.
8. Cada tabla amplía su pool en los `first_day` previstos sin quedar vacía.
9. Tras la oleada 4 aparece exactamente una manifestación final y aún no hay victoria.
10. Descargar y recargar su chunk no completa la Horda; su muerte sí lo hace.
11. Bossbar y contador distinguen oleada normal, manifestación y victoria.
12. Los textos corresponden a la Era actual y no aparece `undefined` debajo.
13. No aparece spam en actionbar/chat, sonidos ni partículas.
14. La victoria produce un único `HordeEndEvent`, recompensa una vez y reprograma una vez.
15. Una parada manual no concede victoria ni recompensas de Nexus.
16. Tras reinicio, la recuperación conserva su política existente de cancelar y reprogramar sin completar.
17. Al terminar no quedan partículas, sonidos, efectos ni estado visual residual.
18. `latest.log` no contiene `redeclaration of var globalState`, excepciones Rhino ni `Internal server error` nuevos.
19. Intentar otro `hordes start` durante el evento no reinicia la cuenta atrás ni crea otra Horda.
20. Tras `HordeEndEvent`, una Horda posterior puede iniciarse normalmente.

Esta prueba requiere iniciar Minecraft y esperar o activar una Horda con los mecanismos administrativos existentes. No se ha automatizado mediante SendKeys, WinAPI ni simulación de ratón.
