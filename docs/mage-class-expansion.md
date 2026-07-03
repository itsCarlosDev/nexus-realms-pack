# Pack 16.3 - Mage Class Expansion

## Objetivo

Reforzar la clase Mago sin anadir otro sistema magico gigante.

## Estado

T.O Magic 'n Extras queda rechazado temporalmente. Pack 16.3 se revierte porque el addon siguio fallando en Prism incluso tras anadir las dependencias detectadas.

## Mod probado y revertido

- T.O Magic 'n Extras - Iron's Spells Addon
- Archivo probado: `traveloptics-6.3.0-1.20.1.jar`
- Minecraft 1.20.1
- Forge
- Side: both

## Motivo original

El Mago usa Iron's Spells como sistema principal. T.O Magic 'n Extras parecia una forma de ampliar Iron's Spells con mas hechizos, armas, equipo, curios, boss y contenido RPG sin abrir una segunda progresion magica grande.

## Dependency chain discovered

La validacion en Prism mostro que `traveloptics` no funciona como addon pequeno aislado. La cadena real de dependencias incluye:

- Alex's Caves, requerido por `traveloptics`.
- Apothic Attributes / AttributesLib, requerido por `traveloptics`.
- Placebo, dependencia transitiva de Apothic Attributes.
- L_Ender's Cataclysm, requerido en runtime por clases usadas desde `traveloptics`.

Esto convierte Pack 16.3 en una expansion de magia + caves/bosses, no solo en un addon pequeno de Iron's Spells.

Resultado:

- Tras resolver la cadena inicial, `traveloptics` siguio apareciendo como `ERROR` en Forge.
- El cliente acabo crasheando durante la pantalla de error.
- La expansion del Mago queda aplazada hasta encontrar un addon mas limpio o validar manualmente otra version.

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

Pack 16.4 usa un starter kit real verificado con `/kubejs hand`:

- `irons_spellbooks:copper_spell_book`
- hechizo inicial: `irons_spellbooks:acupuncture` level 1
- `minecraft:amethyst_shard` x8
- `minecraft:bread` x16

No se dan hechizos avanzados, AoE fuerte, invocaciones potentes ni equipo avanzado al inicio.

## IDs reales ya verificados para Pack 16.4

Guerrero:

- `simplyswords:iron_glaive`

Pistolero:

- `tacz:modern_kinetic_gun` con NBT: `{GunCurrentAmmoCount:0,GunFireMode:"SEMI",GunId:"tacz:taurus9",HasBulletInBarrel:1b}`
- `tacz:ammo` x16 con NBT: `{AmmoId:"tacz:9mm"}`

Pendiente:

- validar en Prism que el libro conserva el hechizo y abre correctamente el spell wheel.

## Pruebas en Prism

1. Arrancar instancia `experiment/class-selection`.
2. Crear mundo nuevo.
3. Elegir clase Mago desde FancyMenu.
4. Confirmar que `/nexus_select` sigue funcionando.
5. Confirmar que T.O Magic 'n Extras ya no aparece en la lista de mods.
6. Confirmar que Alex's Caves, Apothic Attributes y Placebo ya no aparecen por esta expansion.
7. Confirmar que Iron's Spells base sigue cargando.
8. Revisar `latest.log` buscando:
   - `irons_spellbooks`
   - `traveloptics`
   - `error`
   - `exception`
   - `mixin`
9. Confirmar que no se ha instalado ningun mod de magia grande adicional.
