# Automobility y Weapons and Tactics — integración controlada

Estado: **implementado estáticamente; pendiente de prueba runtime**.

Entorno fijado: Minecraft 1.20.1, Forge 47.4.10, Java 17, Create 6.0.8, Create Crafts & Additions 1.3.3 y TaCZ 1.1.8.

## Mods

| Mod | Proyecto | Versión | Archivo | Dependencia | Side |
| --- | --- | --- | --- | --- | --- |
| Automobility | CurseForge 658286, file 4613497 | 0.4.2+1.20.1-forge | `automobility-0.4.2+1.20.1-forge.jar` | Forge 46+; Minecraft 1.20–1.20.x | both |
| [TaCZ] Weapons and Tactics (Mod) | CurseForge 1411291, file 8216042 | 0.3.2 | `WaT 0.3.2.jar` | TaCZ 1.1.8+ | both |

Los dos artefactos se gestionan mediante Packwiz. No hay copias manuales de sus JAR en `mods/`.

## Automobility

La auditoría del JAR no encontró directorios de worldgen ni registros de configured features, placed features, biome modifiers o estructuras. Añadirlo no regenera chunks existentes y sus vehículos/estaciones no requieren terreno nuevo.

La progresión reemplaza solo recetas originales concretas mediante `kubejs/server_scripts/nexus_automobility_create_recipes.js`:

- básica: mesa de mecánico, ruedas estándar, motor de piedra, motorcar de madera y asiento;
- intermedia: assembler con prensa/mecanismo de precisión y motor de cobre con componentes eléctricos;
- avanzada: motor de hierro, ruedas y cuatro chasis de tractor, cosechador, cortacésped, backhoe y paver.

Los tipos conservados son `minecraft:crafting_shaped` y `automobility:auto_mechanic_table`. Los resultados de piezas mantienen los campos nativos `item` y `component`, necesarios para que Automobility reconstruya sus datos especiales y para que JEI muestre la variante correcta.

Las funciones verificadas son conducción, transporte de pasajero, cosecha/replantado de cultivos maduros, corte de vegetación, labrado y pavimentado. No se documentan como disponibles almacenamiento automático, combustible Create, venta automática ni gestión de animales porque el mod no implementa esas funciones.

## Weapons and Tactics

El paquete de datos usa el namespace `ronmc` para 48 GunId, 9 tipos de munición y 18 attachments. No registra clases Java propias ni worldgen; las armas se representan mediante el sistema de objetos/NBT de TaCZ.

History Stages continúa siendo la restricción autoritativa de Pistolero para `tacz:*`. El complemento KubeJS cancela los eventos nativos de disparo, fuego efectivo, cambio de modo, melee, inicio de recarga y daño previo cuando el actor es un jugador que no es Pistolero. No mueve, elimina ni reemplaza el arma, por lo que no altera cargador, attachments ni NBT.

El kit inicial no cambia: sigue entregando la Glock 17 configurada previamente.

## Validación pendiente

No se ha iniciado Minecraft ni un servidor. Deben comprobarse en runtime la carga de dependencias, las recetas y outputs especiales en JEI, el ciclo completo de vehículo, la protección del mercado, las restricciones con las tres clases y sin clase, la conservación de NBT, la persistencia tras reinicio y los logs nuevos de cliente/servidor.
