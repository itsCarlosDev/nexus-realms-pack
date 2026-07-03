# Pack 16.3 - Mage Class Expansion

## Objetivo

Reforzar la clase Mago sin anadir otro sistema magico gigante.

## Mod anadido

- T.O Magic 'n Extras - Iron's Spells Addon
- Archivo esperado: `traveloptics-6.3.0-1.20.1.jar`
- Minecraft 1.20.1
- Forge
- Side: both

## Motivo

El Mago usa Iron's Spells como sistema principal. T.O Magic 'n Extras amplia Iron's Spells con mas hechizos, armas, equipo, curios, boss y contenido RPG sin abrir una segunda progresion magica grande.

## Mods aplazados

- Ars Nouveau: posible expansion futura de archimago/artifice arcano.
- Occultism: posible rama futura de ocultismo/rituales.
- Forbidden & Arcanus: posible rama futura RPG/oculta.
- Malum: posible rama futura de magia oscura/almas.
- Hexerei: posible rama futura de brujeria ambiental.
- Mobbility: posible pack futuro de dificultad para mobs con hechizos.
- Monsters & Spellbooks: no usado en este pack porque no encaja como objetivo Forge 1.20.1 para Nexus ahora.
- Botania: descartado por ser mas tech-magic/natural automation.

## Starter kit del Mago

No cerrar kit real todavia hasta verificar IDs con:

`/kubejs hand`

Kit objetivo futuro:

- spell book basico si existe.
- hechizo ofensivo basico.
- hechizo defensivo/utilidad ligero si existe.
- comida.
- nada de hechizos avanzados, AoE fuerte, invocaciones potentes ni equipo avanzado al inicio.

## IDs reales ya verificados para Pack 16.4

Guerrero:

- `simplyswords:iron_glaive`

Pistolero:

- `tacz:modern_kinetic_gun` con NBT: `{GunCurrentAmmoCount:0,GunFireMode:"SEMI",GunId:"tacz:taurus9",HasBulletInBarrel:1b}`
- `tacz:ammo` x16 con NBT: `{AmmoId:"tacz:9mm"}`

Pendiente:

- verificar item inicial del Mago con `/kubejs hand`.

## Pruebas en Prism

1. Arrancar instancia `experiment/class-selection`.
2. Crear mundo nuevo.
3. Elegir clase Mago desde FancyMenu.
4. Confirmar que `/nexus_select` sigue funcionando.
5. Buscar contenido de T.O Magic 'n Extras en JEI/EMI.
6. Probar hechizos basicos.
7. Revisar `latest.log` buscando:
   - `traveloptics`
   - `irons_spellbooks`
   - `error`
   - `exception`
   - `mixin`
8. Revisar FPS en combate magico.
9. Confirmar que no se ha instalado ningun mod de magia grande adicional.
