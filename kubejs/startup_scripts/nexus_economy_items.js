// Nexus Realms - moneda fisica base del Nexus.
// Las monedas solo se registran como divisa; no se crean recetas.

StartupEvents.registry('item', event => {
  event.create('nexus_bronze_coin')
    .displayName('Moneda de Bronce del Nexus')
    .maxStackSize(64)
    .texture('kubejs:item/nexus_bronze_coin')
    .tooltip('Divisa del Nexus. 10 monedas de bronce equivalen a 1 de plata.')

  event.create('nexus_silver_coin')
    .displayName('Moneda de Plata del Nexus')
    .maxStackSize(64)
    .texture('kubejs:item/nexus_silver_coin')
    .tooltip('Divisa del Nexus. Equivale a 10 de bronce; 10 de plata equivalen a 1 de oro.')

  event.create('nexus_gold_coin')
    .displayName('Moneda de Oro del Nexus')
    .maxStackSize(64)
    .texture('kubejs:item/nexus_gold_coin')
    .tooltip('Divisa mayor del Nexus. Equivale a 10 de plata o 100 de bronce.')
})
