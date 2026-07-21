// Nexus Realms - exclusion de reentrada para el comando nativo de The Hordes.
// No controla el ciclo: impide que un segundo `hordes start` reinicie una Horda activa.

var nexusHordeReentryActivePlayers = new Set()

function nexusHordeReentryPlayerId(player) {
  return String(player.uuid)
}

function nexusHordeReentryCommandText(event) {
  try {
    return String(event.getParseResults().getReader().getString())
      .trim()
      .replace(/^\/+/, '')
  } catch (ignored) {
    return ''
  }
}

ForgeEvents.onEvent('net.minecraftforge.event.CommandEvent', event => {
  var reentryCommand = nexusHordeReentryCommandText(event)
  if (!/^hordes\s+start(?:\s|$)/i.test(reentryCommand)) return
  if (nexusHordeReentryActivePlayers.size === 0) return

  event.setCanceled(true)
  console.warn(
    `[Nexus Horde] Inicio rechazado porque ya hay una Horda activa: ${reentryCommand}`
  )
})

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeStartEvent', event => {
  nexusHordeReentryActivePlayers.add(nexusHordeReentryPlayerId(event.getPlayer()))
})

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeEndEvent', event => {
  nexusHordeReentryActivePlayers.delete(nexusHordeReentryPlayerId(event.getPlayer()))
})

ForgeEvents.onEvent('net.minecraftforge.event.server.ServerStoppingEvent', event => {
  nexusHordeReentryActivePlayers.clear()
})
