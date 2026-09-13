// Read-only presentation for Director-owned Nexus Horde sessions.
const NEXUS_HORDE_PRESENTATION_TOTAL_WAVES = 4
const NEXUS_HORDE_PRESENTATION_UPDATE_INTERVAL = 5
const NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS = 200
const nexusHordePresentationStates = new Map()
let nexusHordePresentationServerTick = 0
var nexusHordePresentationSupportClass = null

try {
  nexusHordePresentationSupportClass = Java.loadClass(
    'dev.itscarlos.nexuscore.horde.HordePresentationSupport'
  )
} catch (error) {
  console.error('Nexus Horde Presentation: helper Java no disponible.')
  console.error(error)
}

function nexusHordePresentationSafeId(value) {
  return String(value).replace(/-/g, '')
}

function nexusHordePresentationRun(server, command) {
  try { return Number(server.runCommandSilent(command)) } catch (ignored) { return 0 }
}

function nexusHordePresentationComponent(text, color, bold) {
  return JSON.stringify({ text: String(text), color: color, bold: Boolean(bold) })
}

function nexusHordePresentationPlayerName(player) {
  return String(player.getGameProfile().getName())
}

function nexusHordePresentationForEachAudience(state, action) {
  state.server.players.forEach(player => {
    try { action(player) } catch (ignored) {}
  })
}

function nexusHordePresentationSetPlayers(state) {
  if (!nexusHordePresentationSupportClass) return
  var ids = []
  state.server.players.forEach(player => ids.push(String(player.uuid)))
  nexusHordePresentationSupportClass.setBossbarPlayers(
    state.server,
    state.bossbarId,
    ids.join(',')
  )
}

function nexusHordePresentationCreateBossbar(state) {
  nexusHordePresentationRun(state.server, `bossbar remove ${state.bossbarId}`)
  nexusHordePresentationRun(
    state.server,
    `bossbar add ${state.bossbarId} ${nexusHordePresentationComponent('EL NEXO SE AGITA', 'dark_purple', true)}`
  )
  nexusHordePresentationRun(state.server, `bossbar set ${state.bossbarId} style progress`)
  nexusHordePresentationSetPlayers(state)
}

function nexusHordePresentationSetBar(state, name, color, maximum, value) {
  var max = Math.max(1, Math.floor(Number(maximum) || 1))
  var current = Math.max(0, Math.min(max, Math.floor(Number(value) || 0)))
  nexusHordePresentationRun(
    state.server,
    `bossbar set ${state.bossbarId} name ${nexusHordePresentationComponent(name, color, true)}`
  )
  nexusHordePresentationRun(state.server, `bossbar set ${state.bossbarId} color ${color}`)
  nexusHordePresentationRun(state.server, `bossbar set ${state.bossbarId} max ${max}`)
  nexusHordePresentationRun(state.server, `bossbar set ${state.bossbarId} value ${current}`)
}

function nexusHordePresentationWaveLabel(snapshot) {
  var label = `OLEADA ${snapshot.currentWave}/${NEXUS_HORDE_PRESENTATION_TOTAL_WAVES}`
  return snapshot.currentWave === NEXUS_HORDE_PRESENTATION_TOTAL_WAVES
    ? `${label} · ULTIMO PULSO`
    : label
}

function nexusHordePresentationRender(state) {
  var snapshot = state.authoritative
  if (!snapshot) return
  if (snapshot.phase === 'preparing') {
    var ticks = Math.max(0, state.preparationEndsAt - nexusHordePresentationServerTick)
    nexusHordePresentationSetBar(
      state,
      `EL NEXO SE AGITA · ${Math.ceil(ticks / 20)}s`,
      'purple',
      NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS,
      ticks
    )
    return
  }
  if (snapshot.phase === 'completing') {
    nexusHordePresentationSetBar(state, 'EL NEXUS RESISTE', 'green', 1, 1)
    return
  }
  var remaining = Math.max(0, Number(snapshot.remaining) || 0)
  var required = Math.max(1, Number(snapshot.requiredKills) || 1)
  var label = snapshot.phase === 'finisher'
    ? 'MANIFESTACION FINAL'
    : nexusHordePresentationWaveLabel(snapshot)
  var text = snapshot.paused
    ? `${label} · EN PAUSA · ESPERANDO PARTICIPANTES · ${remaining} RESTANTES`
    : `${label} · ${remaining} RESTANTES`
  nexusHordePresentationSetBar(
    state,
    text,
    snapshot.paused ? 'yellow' : 'red',
    required,
    remaining
  )
}

function nexusHordePresentationTitle(state, title, subtitle, color) {
  nexusHordePresentationForEachAudience(state, player => {
    var name = nexusHordePresentationPlayerName(player)
    nexusHordePresentationRun(state.server, `title ${name} times 10 60 20`)
    nexusHordePresentationRun(
      state.server,
      `title ${name} subtitle ${nexusHordePresentationComponent(subtitle, 'dark_purple', false)}`
    )
    nexusHordePresentationRun(
      state.server,
      `title ${name} title ${nexusHordePresentationComponent(title, color, true)}`
    )
  })
}

function nexusHordePresentationStart(player, horde, context, snapshot) {
  if (!player || !context || !snapshot || !snapshot.sessionId) return false
  var playerId = String(player.uuid)
  var previous = nexusHordePresentationStates.get(playerId)
  if (previous) nexusHordePresentationCleanup(previous)
  var state = {
    playerId: playerId,
    sessionId: String(snapshot.sessionId),
    server: player.getServer(),
    horde: horde,
    bossbarId: `nexus:horde_${nexusHordePresentationSafeId(playerId)}`,
    authoritative: snapshot,
    preparationEndsAt: nexusHordePresentationServerTick + NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS,
    cleanupAt: -1,
    lastMoment: 'start'
  }
  nexusHordePresentationStates.set(playerId, state)
  nexusHordePresentationCreateBossbar(state)
  nexusHordePresentationForEachAudience(state, recipient => {
    nexusHordePresentationRun(
      state.server,
      `playsound minecraft:event.raid.horn master ${nexusHordePresentationPlayerName(recipient)} ~ ~ ~ 1 1`
    )
  })
  nexusHordePresentationRender(state)
  return true
}

function nexusHordePresentationUpdate(playerId, snapshot, moment) {
  var state = nexusHordePresentationStates.get(String(playerId))
  if (!state || !snapshot || String(snapshot.sessionId) !== state.sessionId) return false
  state.authoritative = snapshot
  state.lastMoment = String(moment || 'update')
  if (moment === 'wave_start') {
    nexusHordePresentationTitle(
      state,
      nexusHordePresentationWaveLabel(snapshot),
      snapshot.currentWave === 1 ? 'El Nexo esta bajo ataque' : 'El pulso continua',
      'red'
    )
  } else if (moment === 'finisher_start') {
    nexusHordePresentationTitle(state, 'MANIFESTACION', 'Enemigo final', 'dark_red')
  } else if (moment === 'wave_clear') {
    nexusHordePresentationSetBar(state, 'PULSO DEL NEXUS · OLEADA SUPERADA', 'green', 1, 1)
    return true
  } else if (moment === 'victory') {
    nexusHordePresentationTitle(state, 'EL NEXUS RESISTE', 'La grieta se cierra', 'gold')
    nexusHordePresentationSetBar(state, 'EL NEXUS RESISTE', 'green', 1, 1)
    return true
  }
  nexusHordePresentationRender(state)
  return true
}

function nexusHordePresentationCleanup(state) {
  if (!state) return
  nexusHordePresentationRun(state.server, `bossbar remove ${state.bossbarId}`)
  nexusHordePresentationStates.delete(state.playerId)
}

function nexusHordePresentationFinish(playerId, reason) {
  var state = nexusHordePresentationStates.get(String(playerId))
  if (!state) return false
  if (reason === 'complete') {
    state.cleanupAt = nexusHordePresentationServerTick + 90
  } else {
    nexusHordePresentationCleanup(state)
  }
  return true
}

function nexusHordePresentationCancel(player) {
  if (!player) return false
  return nexusHordePresentationFinish(String(player.uuid), 'calendar_cleanup')
}

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.player.PlayerEvent$PlayerLoggedInEvent',
  event => nexusHordePresentationStates.forEach(state => nexusHordePresentationSetPlayers(state))
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.player.PlayerEvent$PlayerLoggedOutEvent',
  event => nexusHordePresentationStates.forEach(state => nexusHordePresentationSetPlayers(state))
)

ForgeEvents.onEvent('net.minecraftforge.event.server.ServerStoppingEvent', event => {
  var states = []
  nexusHordePresentationStates.forEach(state => states.push(state))
  states.forEach(state => nexusHordePresentationCleanup(state))
})

ForgeEvents.onEvent('net.minecraftforge.event.TickEvent$ServerTickEvent', event => {
  if (String(event.phase) !== 'END') return
  nexusHordePresentationServerTick += 1
  if (nexusHordePresentationServerTick % NEXUS_HORDE_PRESENTATION_UPDATE_INTERVAL !== 0) return
  var expired = []
  nexusHordePresentationStates.forEach(state => {
    if (state.cleanupAt >= 0 && nexusHordePresentationServerTick >= state.cleanupAt) expired.push(state)
    else nexusHordePresentationRender(state)
  })
  expired.forEach(state => nexusHordePresentationCleanup(state))
})

if (typeof global !== 'undefined') {
  global.NexusHordePresentation = {
    start: nexusHordePresentationStart,
    update: nexusHordePresentationUpdate,
    finish: nexusHordePresentationFinish,
    cancel: nexusHordePresentationCancel
  }
}
