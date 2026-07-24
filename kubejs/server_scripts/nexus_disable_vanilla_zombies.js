// Nexus Realms - bloquea la aparicion de zombis vanilla.

EntityEvents.checkSpawn('minecraft:zombie', event => {
  event.cancel()
})