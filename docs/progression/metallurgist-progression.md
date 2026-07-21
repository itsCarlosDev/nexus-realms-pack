# Especialización Mago → Metalomante

## Mod integrado

- Proyecto: Allomancy.
- Autor: legobmw99.
- Mod ID: `allomancy`.
- Versión: `4.6.5`.
- Minecraft: `1.20.1`.
- Loader: Forge `[47,)`.
- Artefacto oficial: Modrinth `mTS4CGDB`, versión `j4eaEJfx`.
- Dependencias obligatorias externas: ninguna.

El JAR registra 116 items concretos: materiales, menas, bloques, flakes, patrones, tres consumibles del sistema, cuatro objetos de combate y extras. Los metales comunes, menas, lingotes, nuggets, bloques y patrones permanecen libres; no se bloquea el namespace completo.

## Arquitectura Nexus

- Clase principal: `mage`.
- Especialización visible: Metalomante.
- ID interno preservado: `metallurgist`.
- Estado persistente: `player.persistentData.nexus_specialization = metallurgist`.
- Stages simultáneos: `nexus_class_mage` + `nexus_specialization_metallurgist`.

Arcanista y Metalomante son mutuamente excluyentes. Guerrero, Pistolero y jugadores sin clase conservan cero stages de especialización Mage.

La recompensa de `senda_del_metal.snbt` ejecuta `/nexus_specialization unlock metallurgist`. El comando exige Mago y Era III, registra el desbloqueo persistente, selecciona Metalomante y reconcilia History Stages.

## Mecánica nativa auditada

Allomancy usa una capability Forge propia (`AllomancerCapability.PLAYER_CAP`) respaldada por `DefaultAllomancerData`. Guarda en NBT:

- poderes disponibles;
- cantidades y estado de combustión de cada metal;
- datos auxiliares de muerte, spawn y poderes temporales.

El mod sincroniza estos datos al entrar, reaparecer y cambiar de dimensión. Los poderes se copian al clon del jugador tras morir; las reservas de metal solo se conservan con `keepInventory` o en clones que no proceden de muerte.

Comandos oficiales:

- `/allomancy get [targets]`
- `/allomancy add <metal|all|random> [targets]`
- `/allomancy remove <metal|all|random> [targets]`
- alias `/ap`

`add` y `remove` requieren permiso 2. Tras cada cambio el propio mod sincroniza el cliente.

El objeto `allomancy:lerasium_nugget` llama nativamente a `setMistborn()` al consumirse y concede los 16 poderes. Por eso se reserva para Era IV.

La tecla predeterminada para quemar/detener metales es `V`. El HUD y las 16 teclas individuales de metal vienen sin asignar por defecto.

## Integración de poderes

La configuración oficial fija `random_mistings = false`; de otro modo Allomancy 4.6.5 concedería un poder aleatorio a cualquier jugador nuevo, independientemente de su clase.

Al seleccionar o reconciliar Metalomante se usan los comandos oficiales para conceder los ocho poderes fundamentales:

- iron;
- steel;
- tin;
- pewter;
- zinc;
- brass;
- copper;
- bronze.

Al abandonar Metalomante, cambiar de clase o resetear la especialización se ejecuta `/allomancy remove all <player>`. Esto revoca únicamente los poderes de la capability; no elimina items ni vacía las reservas metálicas guardadas. La operación es necesaria para que Allomancy siga siendo exclusiva de Metalomante.

Limitación: si un jugador consumió Lerasium y después abandona la senda, el mod no ofrece un historial separado de poderes avanzados. Al volver a Metalomante recupera los ocho poderes base, no automáticamente el estado Mistborn anterior.

## Restricciones seguras

History Stages contiene los mismos 21 items de uso exclusivo en:

- `nexus_class_mage`;
- `nexus_specialization_metallurgist`.

La coincidencia ya validada de History Stages aplica el AND Mago + Metalomante. Pickup, loot, almacenamiento, movimiento, recetas, GUI e iconos permanecen permitidos; se bloquean las acciones de uso, ataque, rotura o equipamiento que no estén en `unlock_actions`.

Items exclusivos incluidos:

- `allomancy:allomantic_grinder`;
- `allomancy:vial`;
- los 16 `*_flakes` correspondientes a poderes;
- `allomancy:coin_bag`;
- `allomancy:mistcloak`;
- `allomancy:lerasium_nugget`.

No se restringen `koloss_blade` ni `obsidian_dagger` en esta fase porque funcionan como armas independientes y necesitan una decisión de clase/balance.

## Balance por era

### Era III · Metalomante

- grinder y vial;
- flakes de iron, steel, tin, pewter, zinc, brass, copper y bronze;
- ocho poderes fundamentales concedidos por el sistema Nexus mediante comandos nativos;
- coin bag y mistcloak;
- progreso inicial de «La Senda del Metal».

### Era IV · Metalomante avanzado

- flakes de aluminum, duralumin, chromium, nicrosil, gold, electrum, cadmium y bendalloy;
- `lerasium_nugget`, que concede el estado Mistborn nativo;
- combinaciones temporales y espirituales avanzadas.

No se crea una quinta era. Los metales vanilla y los materiales físicos comunes del mod pueden seguir recogiéndose, comerciándose, almacenándose y utilizándose en sistemas ajenos como Create; Lerasium conserva la excepción de Era IV.

## Tienda del Metalomante · V1

Estado: `OPERATIVA V1`, con el interior todavía en construcción.

Disponible:

- Maestro Metalomante;
- acceso a `senda_del_metal`;
- explicación de Metalomante como especialización avanzada del Mago;
- orientación sobre los ocho poderes básicos de Era III y el avance de Era IV.

Pendiente:

- interior definitivo;
- servicios especializados;
- posible comercio de recursos;
- contenido avanzado y balance final.

El NPC no concede stages, poderes ni Lerasium. La regla global de Era IV bloquea `pickup`, `loot` y `recipe` de `allomancy:lerasium_nugget` antes de esa Era; el objeto permanece visible como icono y objetivo de la quest.

## Prueba runtime pendiente

1. Confirmar que Forge 47.4.10 carga Allomancy 4.6.5.
2. Verificar que Arcanista, Guerrero y Pistolero no reciben poderes al entrar.
3. Desbloquear Metalomante en Era III y ejecutar `/allomancy get`: deben aparecer los ocho poderes base.
4. Confirmar que grinder, vial y flakes solo pueden usarse con Mage + Metalomante.
5. Cambiar a Arcanista o resetear y verificar `/allomancy get`: `none`.
6. En Era IV, consumir Lerasium y confirmar `all`.
7. Reiniciar y morir para verificar la persistencia descrita.
8. Comprobar cero pérdida o duplicación de items.
