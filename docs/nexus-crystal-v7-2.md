# Nexus Crystal V7.2 — Plane Shell

Nexus Core **0.6.34**

## Motivo

V7.1 funcionaba técnicamente, pero visualmente mostraba demasiadas superficies:

- 12 caras outer
- 12 caras inner
- `entityCutoutNoCull`
- grandes fragmentos opacos

La cámara podía ver caras traseras a través de los huecos y después una segunda
shell completa. El resultado parecía una roca morada rota.

## V7.2

La shell pasa a ser una única bipirámide cuadrada formada por **8 planos
triangulares de una sola cara**:

- 4 superiores
- 4 inferiores

RenderType:

`RenderType.entityCutout(shell_planes.png)`

No se usa `NoCull` para la carcasa. Las caras posteriores son descartadas por
back-face culling.

## Render

1. Shell:
   - 8 planos
   - CUTOUT + CULL
   - iluminación del mundo
   - 8 UV diferentes
   - ~10–15 % de material visual objetivo
   - sin aro ecuatorial
   - sin marco perimetral

2. Core:
   - 35 %
   - `entityCutoutNoCull`
   - `LightTexture.FULL_BRIGHT`
   - mismo comportamiento de V7/V7.1

3. Highlights:
   - solo 3/8 caras
   - CUTOUT + CULL
   - FULL_BRIGHT
   - líneas cortas

## Instalación sobre 0.6.33

No hace falta migrar ni recrear la entidad.

1. Extraer en la raíz del repo.
2. Compilar `BUILD_NEXUS_CORE_V7_2.bat`.
3. JAR: `nexus-core/build/libs/nexus-core-0.6.34.jar`
4. Sustituir 0.6.33 en cliente y servidor de pruebas.
5. `packwiz refresh`.
6. Reinicio completo.
7. `/function kubejs:nexus_crystal/apply_v7_2`

Debe seguir indicando:

`V7=1 | legacy item_display=0`
