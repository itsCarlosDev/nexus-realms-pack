// Nexus Realms - bloquea la aparicion de zombis vanilla.

EntityEvents.checkSpawn('minecraft:zombie', event => {
  if (
    event.type &&
    String(event.type.name()) === 'NATURAL'
  ) {
    event.cancel()
  }
})
