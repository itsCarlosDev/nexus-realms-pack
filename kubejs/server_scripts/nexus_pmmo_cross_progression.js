// Nexus Realms - PMMO cross progression
// Arcanista y Pistolero ganan una pequeña cantidad de Combat XP
// únicamente al matar hostiles utilizando el combate propio de su clase.

var NR35_PM_API = Java.loadClass(
  'harmonised.pmmo.api.APIUtils'
)

var NR35_SERVER_PLAYER = Java.loadClass(
  'net.minecraft.server.level.ServerPlayer'
)

var NR35_SPELL_DAMAGE_SOURCE = Java.loadClass(
  'io.redspace.ironsspellbooks.damage.SpellDamageSource'
)

var NR35_ARCANIST_COMBAT_XP = 2
var NR35_GUNSLINGER_COMBAT_XP = 3


function nr35IsHostile(entity) {
  if (!entity || !entity.isLiving()) {
    return false
  }

  return entity.isMonster()
}


function nr35IsArcanist(player) {
  if (!(player instanceof NR35_SERVER_PLAYER)) {
    return false
  }

  return (
    String(
      player.persistentData.getString('nexus_class') || ''
    ) === 'mage'
    &&
    String(
      player.persistentData.getString(
        'nexus_specialization'
      ) || ''
    ) === 'arcanist'
  )
}


function nr35IsGunslinger(player) {
  if (!(player instanceof NR35_SERVER_PLAYER)) {
    return false
  }

  return String(
    player.persistentData.getString('nexus_class') || ''
  ) === 'gunslinger'
}


function nr35GiveCombatXp(player, amount) {
  if (!(player instanceof NR35_SERVER_PLAYER)) {
    return
  }

  if (amount <= 0) {
    return
  }

  NR35_PM_API.addXp(
    'combat',
    player,
    amount
  )
}


// ---------------------------------------------------------
// ARCANISTA
// ---------------------------------------------------------
//
// Iron's Spells usa SpellDamageSource y guarda al caster como
// causing entity. Solo premiamos si el golpe mágico es el que
// realmente causa la muerte.
//
// No recompensa:
// - melee
// - PvP
// - animales
// - daño ambiental
//

EntityEvents.death(event => {
  var nr35Victim = event.entity
  var nr35Source = event.source

  if (!nr35IsHostile(nr35Victim)) {
    return
  }

  if (!(nr35Source instanceof NR35_SPELL_DAMAGE_SOURCE)) {
    return
  }

  var nr35Caster = nr35Source.getEntity()

  if (!nr35IsArcanist(nr35Caster)) {
    return
  }

  nr35GiveCombatXp(
    nr35Caster,
    NR35_ARCANIST_COMBAT_XP
  )
})


// ---------------------------------------------------------
// PISTOLERO
// ---------------------------------------------------------
//
// TacZ expone un evento específico de muerte por bala.
// Esto evita dar XP simplemente por disparar o golpear.
//

TimelessGunEvents.entityKillByGun(event => {
  var nr35GunEvent = event.getForgeEvent()

  if (!nr35GunEvent) {
    return
  }

  // El evento existe en ambos lados.
  // Solo conceder XP en servidor.
  if (nr35GunEvent.getLogicalSide().isClient()) {
    return
  }

  var nr35Shooter = nr35GunEvent.getAttacker()
  var nr35Victim = nr35GunEvent.getKilledEntity()

  if (!nr35IsHostile(nr35Victim)) {
    return
  }

  if (!nr35IsGunslinger(nr35Shooter)) {
    return
  }

  nr35GiveCombatXp(
    nr35Shooter,
    NR35_GUNSLINGER_COMBAT_XP
  )
})