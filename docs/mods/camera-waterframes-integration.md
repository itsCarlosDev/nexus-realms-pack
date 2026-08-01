# Camera Mod y retirada de WATERFrAMES

## Decisión vigente

Camera Mod `1.20.1-1.0.20` es el único sistema de fotografía persistente de
Nexus Realms. Conserva las teclas distribuidas `End` (siguiente) y `Home`
(anterior). Las imágenes externas se importan manualmente desde archivos
locales; no se habilita un sistema directo de URL, vídeo, GIF o audio remoto.

WATERFrAMES `2.2.0-beta.6` fue auditado y descartado. Su metafile Packwiz se
retiró sin migrarlo a una versión estable ni sustituirlo por otro mod.

## Dependencias conservadas

- CreativeCore se conserva porque AmbientSounds `6.3.8` declara una dependencia
  obligatoria de CreativeCore `2.12.36` o superior.
- WATERMeDIA `3.0.0.19` se conserva porque FancyMenu `3.9.6` la declara como
  dependencia opcional y la configuración actual usa fondos de vídeo locales.
- Los binarios multimedia de WATERMeDIA se conservan con esa misma cadena de
  consumo. No justifican ni reactivan WATERFrAMES.

## Persistencia y ciclo de vida de Camera

Camera almacena cada fotografía como JPEG bajo
`<world>/camera_images/<UUID>.jpg`. Los items y marcos referencian ese UUID desde
NBT; la imagen no está embebida en el item. Por ello, un backup válido debe
conservar juntos mundo, datos de entidades, inventarios y `camera_images`.

La versión auditada no mantiene recuento de referencias ni elimina un JPEG al
destruir la última copia de su item. Pueden quedar archivos huérfanos. No deben
borrarse por nombre o antigüedad sin una herramienta futura que demuestre que el
UUID no aparece en inventarios, entidades, contenedores ni datos persistentes.

Un JPEG ausente se representa mediante una textura negra de sustitución en el
cliente. Nexus Core `0.6.6` corrige de forma acotada la llamada que intentaba
crear el directorio sobre la ruta final `.jpg`: ahora crea el directorio padre.
No migra, reescribe ni elimina fotografías existentes.

## Subida e importación local

El cliente de Camera acepta PNG, JPG y JPEG desde el selector local, reduce la
imagen a un máximo de 1920 píxeles por dimensión y la codifica como JPEG. Envía
fragmentos de hasta 30 000 bytes. Nexus Core rechaza antes de la asignación o
copia cualquier fragmento con límites imposibles y aplica el máximo absoluto de
1 000 000 bytes que admite la configuración oficial.

La caché original sigue indexada solo por UUID: no separa jugadores, no expira
transferencias incompletas y no aporta limpieza temporal. Es una limitación del
mod base que esta integración mínima no rediseña. La importación debe limitarse
a contenido público o autorizado y nunca usar datos personales.

## Nexus Market

`camera:image_frame` es una entidad, no un bloque. Nexus Core `0.6.6` reutiliza
la geometría, dimensión, estado y bypass de `MarketProtection` para impedir a un
jugador normal dentro de la región:

- colocar el marco, incluso cuando el bloque pulsado queda justo fuera;
- insertar o retirar una fotografía;
- abrir o ejecutar el redimensionado, incluido el paquete directo;
- atacar o romper el marco.

Tomar fotografías, abrir álbumes y renderizar las imágenes no modifica la
región y permanece permitido. Fuera del mercado se conserva el comportamiento
de Camera. Los administradores reales con bypass mantienen las acciones.

## Riesgos descartados con WATERFrAMES

La beta retirada exponía displays editables mediante paquetes propios, control
remoto y orígenes de red/archivo. Su auditoría encontró ausencia de controles
suficientes de permiso, distancia y validación de origen en rutas relevantes,
además de riesgos de acceso a red privada y rutas locales a través de la cadena
multimedia. La retirada evita distribuir esa superficie; no se reutiliza su
configuración ni se documenta como función disponible.

## Backup y prueba pendiente

Antes de actualizar o limpiar, detener el servidor y copiar el mundo completo,
incluido `camera_images`. Restaurar primero en una copia de prueba y verificar
items, álbumes, atriles y marcos desde dos clientes antes de considerar borrar
ningún JPEG.

La validación runtime pendiente debe cubrir captura, filtros, papel, álbum,
atril, copia, importación local no sensible, reconexión, reinicio, archivo
ausente y restauración. Dentro y fuera del mercado debe probar por separado la
colocación, inserción, retirada, redimensionado y rotura con jugador normal y OP.
No se probarán localhost, red privada, servicios autenticados ni archivos
personales.
