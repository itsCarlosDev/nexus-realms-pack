# Nexus Crystal V7.2 — renderer nativo de Nexus Core

V7 abandona el OBJ translúcido y registra `nexuscore:nexus_crystal` como una sola
entidad persistente.

## Render
1. Shell: `RenderType.entityCutoutNoCull`.
2. Core 35 %: `entityCutoutNoCull` + `LightTexture.FULL_BRIGHT`.
3. Highlight: cutout + fullbright.

Las texturas usan exclusivamente alpha 0/255. La shell contiene agujeros reales,
por lo que el core se ve a través de ellos sin ordenar dos transparencias anidadas.

## Tamaño exacto heredado
- altura: 2.4375 bloques
- radio: 0.6495190528
- centro desde la base: 1.21875
- antiguo centro de spawn: +2.6 sobre el ejecutor

## Instalación
1. Extrae el ZIP en la raíz de `nexus-realms-pack`.
2. Windows: `BUILD_NEXUS_CORE_V7.bat`
3. JAR esperado: `nexus-core/build/libs/nexus-core-0.6.34.jar`
4. Sustituye Nexus Core en servidor y clientes usando tu flujo habitual.
5. Ejecuta `packwiz refresh`.
6. Reinicia completamente servidor y cliente.
7. Cerca del Nexo actual:
   `/function kubejs:nexus_crystal/apply_v7`
8. Comprueba:
   `/nexus_crystal status`

Resultado correcto: `V7=1 | legacy item_display=0`.

## Comandos
- `/nexus_crystal migrate`
- `/nexus_crystal spawn`
- `/nexus_crystal movehere`
- `/nexus_crystal status`
- `/nexus_crystal remove`
- `/nexus_crystal purge`

## Importante
La generación de este paquete puede validar las texturas, constantes y Java puro,
pero este entorno no dispone de la caché ForgeGradle 1.20.1 y no tiene salida de red
para descargarla. Por eso el JAR final debe pasar por `gradlew clean check build`
en el propio repo antes de desplegar.
