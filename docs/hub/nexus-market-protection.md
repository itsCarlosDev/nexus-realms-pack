# Protección de Nexus Market — Pack 28.2

## IMPLEMENTADO

### Arquitectura

Nexus Core `0.6.0` es la única fuente de verdad para la protección territorial del hub. El sistema no consulta ni modifica History Stages, clases, especializaciones, FTB Quests, Easy NPC o la economía.

La protección nace desactivada y sin coordenadas:

```text
enabled = false
dimension = sin configurar
center = sin configurar
radius = sin configurar
```

No existe detección automática de schematics ni coordenadas hardcodeadas.

La región es un cilindro vertical sin límite de altura. Solo se calcula la distancia horizontal:

```text
enabled
AND dimensión actual == dimensión configurada
AND (x - centerX)² + (z - centerZ)² <= radius²
```

El borde situado exactamente a `radius` bloques está incluido. Todos los listeners llaman a la misma función `MarketProtection.isInsideProtectedMarket(level, blockPos)`.

### Persistencia

La configuración usa `SavedData` de Minecraft almacenado por mundo en el `DataStorage` del Overworld:

```text
<world>/data/nexuscore_market_protection.dat
```

Datos persistidos:

| Campo | Uso |
|---|---|
| `Enabled` | activación de la protección |
| `Dimension` | `ResourceLocation` exacto de la dimensión |
| `CenterX` / `CenterZ` | centro del cilindro |
| `CenterY` | referencia administrativa y salida de `status`; no limita la altura |
| `Radius` | radio horizontal |
| `CenterConfigured` | distingue un centro real de los valores por defecto |
| `RadiusConfigured` | distingue un radio real del valor por defecto |

La configuración sobrevive reinicios del servidor y actualizaciones del modpack mientras se conserve el mundo. Un SavedData inválido o incompleto nunca se activa automáticamente.

### Comandos

Todos requieren nivel de permisos `>= 2`.

| Comando | Comportamiento |
|---|---|
| `/nexus_market set_center` | guarda la dimensión y posición X/Y/Z actuales del ejecutor |
| `/nexus_market set_radius <radius>` | guarda un radio entre `1` y `4096` bloques |
| `/nexus_market enable` | activa únicamente si centro, dimensión y radio están configurados |
| `/nexus_market disable` | desactiva sin borrar la configuración |
| `/nexus_market status` | muestra activación, configuración, dimensión, centro, radio y distancia horizontal del jugador |

El comando raíz tampoco es visible ni ejecutable para jugadores sin permisos administrativos.

### Eventos protegidos

| Acción | Implementación |
|---|---|
| romper bloques | cancela `BlockEvent.BreakEvent` |
| colocar bloques | cancela `BlockEvent.EntityPlaceEvent`, incluidas colocaciones múltiples |
| explosiones | elimina únicamente posiciones interiores de `ExplosionEvent.Detonate#getAffectedBlocks()` |
| cubos de agua/lava | cancela `FillBucketEvent` cuando el destino intersecta la región |
| cambios causados por fluidos | restaura el estado original en `BlockEvent.FluidPlaceBlockEvent` |
| modificaciones con herramientas | cancela strip/path/till mediante `BlockToolModificationEvent` |
| pisoteo de cultivo | cancela `FarmlandTrampleEvent` |
| ignición directa | el bloque de fuego colocado por el jugador queda cubierto por `EntityPlaceEvent` |

Las explosiones conservan sus efectos fuera del cilindro. No se cancela toda una explosión parcialmente solapada y tampoco se elimina su daño a entidades; se protege la arquitectura.

### Fuego

La colocación directa de fuego por jugadores queda protegida como modificación de bloque. Los cambios de bloque disparados por lava quedan neutralizados con `FluidPlaceBlockEvent`.

Forge `47.4.10` no expone un evento cancelable completo para la propagación y destrucción realizada dentro del random tick de `FireBlock`. No se añadió polling, mixin ni modificación global de `doFireTick`. Por ello, fuego preexistente o propagado desde fuera a través del límite necesita una prueba runtime y constituye una limitación conocida.

### Interacciones permitidas

No existe un listener global que cancele todas las interacciones. Continúan disponibles:

- Easy NPC, diálogos y trading;
- Waystones;
- puertas, botones y palancas;
- cofres y contenedores;
- interfaces de máquinas;
- bancos y estaciones funcionales;
- FTB Quests.

No se implementan permisos de contenedores en Pack 28.2.

### Bypass administrativo

El criterio centralizado es:

```text
ServerPlayer real
AND no FakePlayer
AND permission level >= 2
```

El bypass se aplica a romper, colocar, modificar con herramientas y utilizar cubos dentro de la región. Mobs, automatizaciones con FakePlayer y explosiones no reciben bypass.

### Feedback

Una acción directa bloqueada muestra:

```text
Esta zona está protegida por el Nexus.
```

El mensaje tiene un cooldown por jugador de 40 ticks. No usa títulos ni comprobaciones por tick.

### Validación matemática

La tarea Gradle `marketProtectionCheck`, incluida en `check` y `build`, comprueba:

- centro: dentro;
- `radius - 1`: dentro;
- exactamente `radius`: dentro;
- `radius + 1`: fuera;
- dimensión distinta: fuera;
- `enabled = false`: fuera.

## CONFIGURACIÓN FINAL PENDIENTE

Pendiente hasta que Carlos coloque el mapa definitivo:

- dimensión real;
- coordenadas del centro;
- radio definitivo;
- activación.

Procedimiento:

1. Colocarse en el centro real del mercado.
2. Ejecutar `/nexus_market set_center`.
3. Ejecutar `/nexus_market set_radius <radius>`.
4. Ejecutar `/nexus_market status`.
5. Probar posiciones interiores, el borde exacto y posiciones exteriores.
6. Ejecutar `/nexus_market enable`.

## CHECKLIST RUNTIME PARA CARLOS

1. Arrancar con `nexus-core-0.6.0.jar`.
2. Ejecutar `/nexus_market status`: debe indicar desactivada y configuración incompleta en un mundo nuevo.
3. Ejecutar `/nexus_market enable`: debe rechazar la activación incompleta.
4. Situarse en el centro y ejecutar `/nexus_market set_center`.
5. Ejecutar `/nexus_market set_radius 20`.
6. Ejecutar `/nexus_market status` y comprobar dimensión, centro, radio y distancia.
7. Ejecutar `/nexus_market enable`.
8. Con un jugador sin OP dentro de la región:
   - romper un bloque: bloqueado;
   - colocar un bloque: bloqueado;
   - vaciar agua y lava: bloqueado;
   - usar pedernal: bloqueado;
   - abrir una puerta: permitido;
   - usar botón/palanca: permitido;
   - abrir contenedor o interfaz: permitido;
   - hablar con Easy NPC: permitido;
   - comerciar: permitido;
   - abrir FTB Quests desde NPC: permitido.
9. Con el mismo jugador fuera del radio:
   - romper: permitido;
   - colocar: permitido.
10. Con un OP nivel 2 dentro:
    - romper: permitido;
    - colocar: permitido;
    - usar herramientas y cubos: permitido.
11. Provocar una explosión parcialmente solapada:
    - bloques interiores intactos;
    - bloques exteriores afectados normalmente.
12. Probar fuego iniciado fuera del límite y documentar cualquier propagación interior.
13. Reiniciar el servidor y confirmar que `status` conserva dimensión, centro, radio y activación.
14. Ejecutar `/nexus_market disable` y confirmar que vuelve a permitirse la modificación normal.

No automatizar estas pruebas mediante SendKeys, WinAPI o simulación de ratón.

## LIMITACIONES

- propagación o destrucción por random tick de fuego iniciado fuera de la región;
- flujo de líquidos iniciado fuera del límite o mediante mecanismos no asociados a un jugador;
- movimiento de bloques mediante pistones u otras máquinas;
- cambios de terreno de mobs que no pasen por `EntityPlaceEvent`;
- daño de explosiones a entidades;
- permisos específicos por contenedor.

Estas extensiones no deben implementarse con polling por tick ni mediante History Stages.
