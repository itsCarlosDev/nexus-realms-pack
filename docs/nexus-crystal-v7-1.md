# Nexus Crystal V7.1 — Double Shell Crystal

Nexus Core: **0.6.33**

## Objetivo

V7 solucionó el fallo técnico de V4–V6, pero la shell se veía demasiado como
una jaula. V7.1 mantiene la arquitectura estable y cambia el lenguaje visual
siguiendo tres referencias:

- End Crystal vanilla: múltiples capas CUTOUT transformadas.
- Glass/amethyst vanilla: el efecto de cristal no depende de alpha parcial.
- Botania Pylon Crystal: facetas separadas, iluminación y variación por cara.

## Render V7.1

1. Outer shell:
   - `entityCutoutNoCull`
   - escala 100 %
   - iluminación del mundo
   - atlas 256x256 con 12 UV únicos

2. Inner shell:
   - `entityCutoutNoCull`
   - escala 90 %
   - offset inicial 18°
   - velocidad de giro diferente
   - atlas propio, más claro y más vacío

3. Core:
   - 35 %
   - CUTOUT + `LightTexture.FULL_BRIGHT`
   - sin cambios importantes respecto a V7

4. Highlights:
   - CUTOUT + FULL_BRIGHT
   - solo 6 de las 12 caras tienen streaks
   - líneas de 1–2 px; no hay grandes manchas blancas

## Regla de estabilidad

Todas las texturas críticas usan únicamente:

- alpha 0
- alpha 255

No hay `entityTranslucent` en el renderer V7.1.

## Instalación sobre V7 / 0.6.32

No hace falta eliminar o recrear la gema del mundo porque se conserva
`nexuscore:nexus_crystal`.

1. Extraer sobre la raíz del repo.
2. Compilar `nexus-core` 0.6.33.
3. Sustituir el JAR 0.6.32 por `nexus-core-0.6.33.jar` en cliente/servidor.
4. `packwiz refresh`.
5. Reinicio completo.
6. Ejecutar `/function kubejs:nexus_crystal/apply_v7_1`.
7. Debe seguir mostrando `V7=1 | legacy item_display=0`.

## Qué debería cambiar visualmente

- desaparece el aro/barra horizontal continua;
- desaparece el marco grueso en cada cara;
- cada cara tiene facetas distintas;
- aparecen dos capas cristalinas moviéndose una respecto a otra;
- el core se ve a través de huecos reales;
- los reflejos blancos son pequeños y selectivos;
- el cristal conserva la misma envolvente y posición.
