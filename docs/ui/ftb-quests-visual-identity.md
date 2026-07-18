# Identidad visual de FTB Quests

## Capacidades confirmadas

Nexus Realms usa FTB Quests `2001.4.22`. Esta versión admite:

- iconos basados en `ItemStack`;
- subtítulos de capítulo;
- posiciones `x` e `y`;
- tamaño de nodo e escala de icono;
- formas `circle`, `square`, `rsquare`, `diamond`, `pentagon`, `hexagon`, `octagon`, `heart`, `gear` y `none`;
- enlaces visuales entre quests;
- imágenes de capítulo con posición, tamaño, color, alpha y orden;
- themes apilables mediante `ftbquests:ftb_quests_theme.txt`.

Pack 27.2 utiliza únicamente campos SNBT nativos, iconos de objetos existentes y `ftblibrary:textures/gui/background_squares.png`. No añade un resource pack ni modifica el theme global.

## Ya implementado

### Lenguaje global

- fondo Obsidian/Stone Dark de baja opacidad;
- líneas de acento finas en lugar de grandes superficies brillantes;
- Ancient Bronze como unión entre campaña y clases;
- hitos principales con forma `octagon` y tamaño superior;
- contenido opcional con `diamond` o `pentagon`;
- maquinaria con forma `gear`;
- árboles contenidos, con flujo de izquierda a derecha.

### Eras

| Capítulo | Acento | Lectura visual |
| --- | --- | --- |
| Comienzo | Ancient Bronze | introducción y despertar |
| Era I | Stone Dark + Bronze | supervivencia e hierro |
| Era II | Crystal Blue | expansión y diamante |
| Era III | Arcane Violet + Nexus Cyan | magia e industria |
| Era IV | Nexus Cyan + Rune Magenta moderado | convergencia y endgame |

### Clases

| Ruta | Acento | Forma dominante |
| --- | --- | --- |
| Guerrero | Bronze, acero oscuro | square / octagon |
| Mago base | Violet + Crystal Blue | hexagon |
| Arcanista | Violet + Magenta moderado | diamond |
| Metalomante | grafito + Bronze + Cyan | gear |
| Pistolero | metal oscuro + Warning Amber | rsquare |

La bifurcación del Mago usa dos `quest_links` del mismo tamaño: Arcanista arriba y Metalomante abajo. Ninguna ruta se presenta como secundaria.

## Pendiente de creación artística

Estos assets son opcionales. No deben añadirse como placeholders ni sustituir los iconos de objetos que ya comunican bien la progresión.

| Asset | Función | Tamaño recomendado | Transparencia | Estilo | Ruta final propuesta |
| --- | --- | --- | --- | --- | --- |
| `nexus_quests_stone_field.png` | fondo suave reutilizable | 256×256 | opaco, contraste bajo | piedra oscura sin ruido fino | `assets/nexusrealms/textures/gui/quests/nexus_quests_stone_field.png` |
| `nexus_quests_arcane_trace.png` | detalle de Arcanista | 256×64 | alpha | runas violetas muy tenues | `assets/nexusrealms/textures/gui/quests/nexus_quests_arcane_trace.png` |
| `nexus_quests_metal_trace.png` | detalle de Metalomante/Create | 256×64 | alpha | bronce, grafito y engranajes | `assets/nexusrealms/textures/gui/quests/nexus_quests_metal_trace.png` |
| `nexus_quests_nexus_crack.png` | acento de Era IV | 256×64 | alpha | grieta cian con mínimo magenta | `assets/nexusrealms/textures/gui/quests/nexus_quests_nexus_crack.png` |
| `nexus_quests_horde_mark.png` | señal de rama de hordas | 64×64 | alpha | marca roja erosionada | `assets/nexusrealms/textures/gui/quests/nexus_quests_horde_mark.png` |

Antes de integrar estos archivos debe existir una infraestructura de resource pack propia y validarse su prioridad de carga. Ningún asset necesita resolución 4K ni animación.

## Limitaciones

- El color individual de los contornos depende del theme global, no de un campo `color` por quest.
- Las imágenes de capítulo pertenecen al plano del árbol; no son fondos de pantalla anclados.
- Los enlaces visuales navegan entre quests, pero no dibujan un árbol continuo entre capítulos distintos.
- El bloqueo por Era o clase sigue comunicándose mediante dependencias, candados y textos; Pack 27.2 no altera stages ni reglas.
