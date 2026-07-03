# Pack 16.4 - Real Class Starter Kits

## Objetivo

Sustituir kits placeholder por kits reales de clase.

## Kits implementados

### Guerrero

- `simplyswords:iron_glaive`
- `minecraft:shield`
- `minecraft:bread` x16

### Mago

- `irons_spellbooks:copper_spell_book` con hechizo:
  - `irons_spellbooks:acupuncture`
  - level 1
- `minecraft:amethyst_shard` x8
- `minecraft:bread` x16

NBT usado:

`{"irons_spellbooks:spell_container":{data:[{id:"irons_spellbooks:acupuncture",index:0,level:1}],maxSpells:5,mustEquip:1b,spellWheel:1b}}`

### Pistolero

- `tacz:modern_kinetic_gun` con NBT:
  `{GunCurrentAmmoCount:0,GunFireMode:"SEMI",GunId:"tacz:taurus9",HasBulletInBarrel:1b}`
- `tacz:ammo` x16 con NBT:
  `{AmmoId:"tacz:9mm"}`
- `minecraft:bread` x16

## Reglas de seguridad

- La clase se marca antes de dar items para evitar duplicacion.
- No se puede elegir dos veces.
- Reset admin no borra inventario.
- FancyMenu solo llama a `/nexus_select`.
- FTB Quests no entrega la clase ni el starter kit principal.

## Pack 16.4.2 - Delivery fix

- La entrega usa `nexusCreateKitItem(entry)` para soportar NBT opcional.
- Los items con NBT intentan primero `Item.of(id, nbt).withCount(count)`.
- Si esa sintaxis falla, se prueba `Item.of(id, count, nbt)`.
- Cada item entregado queda registrado en el log.
- Si un item falla, el resto del kit se sigue intentando entregar.
- Si hay fallos parciales, el jugador recibe un aviso en chat.

## Como verificar futuros items

En Prism:

1. Buscar el item en JEI/EMI.
2. Ponerlo en la mano.
3. Ejecutar: `/kubejs hand`
4. Copiar ID y NBT exacto.
