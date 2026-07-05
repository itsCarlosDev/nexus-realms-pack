# Class Progression Testing

## Test 1 - Guerrero

- `/nexus_resetclass_clean SpendRed23`
- `/nexus_select warrior`
- confirmar kit.
- matar 5 zombies.
- comprobar si Epic Fight es usable.
- intentar usar spellbook y TaCZ: debe bloquear.

## Test 2 - Mago

- `/nexus_resetclass_clean SpendRed23`
- `/nexus_select mage`
- confirmar kit.
- lanzar hechizo.
- matar 3 mobs con magia.
- intentar usar arma Guerrero y TaCZ: debe bloquear.

## Test 3 - Pistolero

- `/nexus_resetclass_clean SpendRed23`
- `/nexus_select gunslinger`
- confirmar Glock 17.
- `/kubejs hand` debe mostrar `GunId:"tacz:glock_17"`.
- apuntar.
- recargar.
- disparar.
- intentar usar spellbook y arma Guerrero: debe bloquear.

## Test comun

- morir y respawnear.
- reloguear.
- comprobar que la clase persiste.
- comprobar que no se duplica kit.
- comprobar que reset limpia bien solo con `/nexus_resetclass_clean`.
