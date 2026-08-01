// TaCZ exposes these cancelable events natively to KubeJS. History Stages
// remains authoritative for inventory/equipment access; this closes action
// paths that retain a gun stack and its NBT instead of deleting or moving it.

const $NexusServerPlayer = Java.loadClass(
  'net.minecraft.server.level.ServerPlayer'
)

function nexusIsGunslinger(entity) {
  if (!(entity instanceof $NexusServerPlayer)) {
    return true
  }

  return String(
    entity.persistentData.getString('nexus_class') || ''
  ) === 'gunslinger' || entity.getTags().contains(
    'nexus_class_gunslinger'
  )
}

function nexusCancelNonGunslingerAction(event, actor) {
  if (!nexusIsGunslinger(actor)) {
    event.cancel()
  }
}

TimelessGunEvents.gunShoot(event => {
  nexusCancelNonGunslingerAction(event, event.shooter)
})

TimelessGunEvents.gunFire(event => {
  nexusCancelNonGunslingerAction(event, event.shooter)
})

TimelessGunEvents.gunFireSelect(event => {
  nexusCancelNonGunslingerAction(event, event.shooter)
})

TimelessGunEvents.gunMelee(event => {
  nexusCancelNonGunslingerAction(event, event.shooter)
})

TimelessGunEvents.gunReload(event => {
  nexusCancelNonGunslingerAction(event, event.entity)
})

TimelessGunEvents.entityHurtByGunPre(event => {
  nexusCancelNonGunslingerAction(event, event.attacker)
})
