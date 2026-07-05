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
  `{GunCurrentAmmoCount:0,GunFireMode:"SEMI",GunId:"tacz:glock_17",HasBulletInBarrel:1b}`
- `tacz:ammo` x16 con NBT:
  `{AmmoId:"tacz:9mm"}`
- `minecraft:bread` x16

## Reglas de seguridad

- La clase se marca antes de dar items para evitar duplicacion.
- No se puede elegir dos veces.
- Reset admin no borra inventario.
- FancyMenu solo llama a `/nexus_select`.
- FTB Quests no entrega la clase ni el starter kit principal.
- Pack 16.5 mantiene estos kits y añade restricciones de uso por clase sin cambiar la entrega.

## Pack 16.4.2 - Delivery fix

- La entrega usa `nexusCreateKitItem(entry)` para soportar NBT opcional.
- Los items con NBT intentan primero `Item.of(id, nbt).withCount(itemCount)`.
- Si esa sintaxis falla, se prueba `Item.of(id, itemCount, nbt)`.
- Cada item entregado queda registrado en el log.
- Si un item falla, el resto del kit se sigue intentando entregar.
- Si hay fallos parciales, el jugador recibe un aviso en chat.

## Pack 16.5.2 - Kit delivery fix

- Se corrigio el fallo `TypeError: redeclaration of var count` evitando reutilizar `count` en la creacion y entrega de items.
- La entrega usa `itemCount` y no usa `var`.
- `/nexus_givekit <class> [player]` permite probar kits como operador sin cambiar la clase.
- Los kits siguen soportando NBT para Iron's Spells y TaCZ.
- FancyMenu sigue siendo el selector principal.
- `/nexus_class_help` queda como fallback manual para ver comandos.

## Pack 16.5.3 - Gunslinger gun fix

- La pistola inicial del Pistolero se crea con una ruta especial para no perder el NBT de TaCZ.
- `tacz:modern_kinetic_gun` sin `GunId` aparece como item generico y no sirve como Glock 17 real.
- La llamada usada para el arma es:
  `Item.of('tacz:modern_kinetic_gun', '{GunCurrentAmmoCount:0,GunFireMode:"SEMI",GunId:"tacz:glock_17",HasBulletInBarrel:1b}')`
- La municion mantiene:
  `Item.of('tacz:ammo', 16, '{AmmoId:"tacz:9mm"}')`

## Pack 16.5.4 - TaCZ icon review

- `/kubejs hand` confirma que la pistola entregada conserva `GunId:"tacz:glock_17"`.
- No se encontro en el repo una configuracion local de TaCZ que indique NBT extra para el icono de inventario.
- Si el modelo en mano/disparo funciona pero el icono de hotbar/inventario sigue morado/negro, se trata como problema visual de render/icono de TaCZ y no como perdida de NBT.
- El starter oficial del Pistolero usa Glock 17 desde Pack 16.5.5.
- El plan de keybinds reserva `R` solo para recargar TaCZ, para que Glock 17 no abra Spell Wheel ni cambie Battle Mode.
- Epic Tweaks debe mantener al Pistolero en Vanilla/Mining Mode al usar TaCZ, para no romper apuntado ni recarga.
- Pack 16.6 mantiene Glock 17 como starter oficial y no vuelve a Taurus 9.

## Como verificar futuros items

En Prism:

1. Buscar el item en JEI/EMI.
2. Ponerlo en la mano.
3. Ejecutar: `/kubejs hand`
4. Copiar ID y NBT exacto.

## Pack 16.5 - Warrior combat integration

- El kit del Guerrero conserva `simplyswords:iron_glaive` como arma inicial.
- Epic Fight se integra como sistema de combate del Guerrero, pero no cambia el kit.
- Los items `simplyswords:*`, `epicfight:*`, `epicfight_nightfall:*`, `efn:*` y `nightfall:*` quedan reservados al tag `nexus_class_warrior` cuando el evento KubeJS de uso de item lo permite.
- El kit del Mago conserva Iron's Spells base.
- El kit del Pistolero conserva TaCZ.
