# Guerrero — Senda del Metal

> El nombre del archivo se conserva para no romper enlaces históricos. Metalomante ya no es una especialización seleccionable.

## Mod integrado

- Proyecto: Allomancy.
- Mod ID: `allomancy`.
- Versión Packwiz: `4.6.6`.
- Minecraft: `1.20.1`.
- Loader: Forge.

Allomancy usa una capability Forge propia para poderes, reservas y estado de combustión. El mod sincroniza esos datos con el cliente. `allomancy:lerasium_nugget` concede nativamente los 16 poderes mediante el estado Mistborn, por lo que continúa reservado para Era IV.

## Arquitectura Nexus

- Clase propietaria: `warrior`.
- Stage de clase: `nexus_class_warrior`.
- Especialización adicional: ninguna.
- Selector/burn de Allomancy: `H`.
- Atajos individuales de los 16 metales: sin asignar.

Al seleccionar o reconciliar Guerrero, Nexus añade solo los poderes básicos que falten:

- iron;
- steel;
- tin;
- pewter;
- zinc;
- brass;
- copper;
- bronze.

La reconciliación no llama a `setUninvested()` para Guerrero. Así conserva poderes avanzados obtenidos legítimamente y un estado Mistborn existente. Para Mago, Pistolero o jugadores sin clase sí revoca todos los poderes, sincroniza la capability y comprueba que el recuento sea cero.

La configuración oficial mantiene `random_mistings = false`, evitando poderes aleatorios fuera de la clase Guerrero.

## Migración heredada

El estado exacto `nexus_class=mage` + `nexus_specialization=metallurgist` se migra a Guerrero de forma idempotente durante login, reparación o recuperación transaccional.

La migración:

- conserva inventario, XP, quests, etapas globales y reservas metálicas;
- no entrega kit, no cobra niveles y no crea cooldown;
- sustituye la clase persistente y los tags/stages por Guerrero;
- elimina el stage y la marca de desbloqueo heredados;
- conserva los poderes existentes y completa únicamente los ocho básicos que falten;
- fuerza una sincronización final de clase y capability.

`config/historystages/individual/nexus_specialization_metallurgist.json` permanece como configuración residual vacía para limpiar el ID anterior de forma segura. No autoriza contenido ni demuestra una especialización activa.

## Restricciones con History Stages

Los 21 objetos exclusivos de uso alomántico están en `nexus_class_warrior` y se combinan con sus restricciones globales por era. Ya no aparecen en `nexus_class_mage` ni en el stage residual Metalomante.

Objetos incluidos:

- `allomancy:allomantic_grinder` y `allomancy:vial`;
- los 16 `*_flakes` correspondientes a poderes;
- `allomancy:coin_bag` y `allomancy:mistcloak`;
- `allomancy:lerasium_nugget`.

History Stages sigue siendo la autoridad de uso. No se añaden listeners paralelos ni se manipulan inventarios para imponer estas restricciones. `koloss_blade` y `obsidian_dagger` permanecen fuera de esta asignación porque son armas independientes.

## Balance por era

### Era III — fundamentos

- molino y vial;
- flakes de iron, steel, tin, pewter, zinc, brass, copper y bronze;
- coin bag y mistcloak;
- capítulo «Senda del Metal», dependiente de la entrada de Guerrero y Era III.

### Era IV — dominio avanzado

- flakes de aluminum, duralumin, chromium, nicrosil, gold, electrum, cadmium y bendalloy;
- `lerasium_nugget` y transformación Mistborn nativa;
- combinaciones temporales y espirituales avanzadas.

Los metales vanilla y materiales físicos comunes pueden seguir recogiéndose, comerciándose y utilizándose en otros sistemas. No se crea una quinta era.

## Interfaz y NPC

FancyMenu presenta «Guerrero — Senda del Metal», describe la progresión por eras y muestra `H` como selector. El menú de Mago ofrece únicamente Arcanista; cualquier pantalla heredada de información metálica redirige a Guerrero y no ejecuta comandos Metalomante.

El preset interno `metallurgist_master` conserva su ID estable, pero se muestra como «Maestro del Metal». Abre la Senda del Metal para consulta y no concede stages, poderes, clase ni Lerasium.

## Prueba runtime pendiente

1. Entrar con un Guerrero nuevo y confirmar ocho poderes básicos con `/allomancy get`.
2. Abrir el selector con `H`; comprobar que `R`, `V`, `Shift+1..8` y `Alt+1..8` no colisionan con Allomancy.
3. Consumir Lerasium en Era IV, reloguear y confirmar que la reconciliación conserva los 16 poderes.
4. Cambiar de Guerrero a Mago o Pistolero y confirmar `none` sin pérdida de items ni reservas.
5. Entrar con un perfil heredado Mago + Metalomante y verificar migración única a Guerrero sin coste, kit ni cooldown.
6. Validar uso/bloqueo de los 21 objetos con las combinaciones de clase y era correspondientes.

No se debe declarar esta integración operativa en juego hasta completar esas pruebas.
