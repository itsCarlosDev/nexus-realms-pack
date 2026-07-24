// Nexus Realms - exclusion de reentrada para el comando nativo de The Hordes.
// No controla el ciclo de la Horda: solo impide volver a iniciar una Horda
// para un jugador que ya tenga una activa.
//
// Comandos nativos contemplados por The Hordes 1.20.1:
// - /hordes start <duracion> [tabla]
// - /hordes start <jugador|selector> <duracion> [tabla]
//
// Si un selector incluye varios jugadores y al menos uno ya tiene una Horda
// activa, se cancela el comando completo para evitar una ejecucion parcial.

var nexusHordeReentryActivePlayers = new Set()
var nexusHordeReentryLoggedErrors = new Set()

function nexusHordeReentryLogErrorOnce(key, message, error) {
  if (nexusHordeReentryLoggedErrors.has(key)) return

  nexusHordeReentryLoggedErrors.add(key)
  console.error(message)

  if (error) {
    console.error(error)
  }
}

function nexusHordeReentryPlayerId(player) {
  return String(player.uuid)
}

function nexusHordeReentryPlayerName(player) {
  try {
    return String(
      player.getGameProfile().getName()
    )
  } catch (ignored) {
    return nexusHordeReentryPlayerId(player)
  }
}

function nexusHordeReentryCommandText(event) {
  try {
    return String(
      event
        .getParseResults()
        .getReader()
        .getString()
    )
      .trim()
      .replace(/^\/+/, '')
  } catch (error) {
    nexusHordeReentryLogErrorOnce(
      `command-text:${String(error)}`,
      'Nexus Horde Reentry Guard: no se pudo leer el comando ejecutado.',
      error
    )

    return ''
  }
}

function nexusHordeReentryIsStartCommand(command) {
  return /^(?:hordes:)?hordes\s+start(?:\s|$)/i.test(
    command
  )
}

function nexusHordeReentryCollectionToArray(
  collection
) {
  var result = []

  if (!collection) return result

  try {
    var iterator = collection.iterator()

    while (iterator.hasNext()) {
      result.push(iterator.next())
    }
  } catch (error) {
    nexusHordeReentryLogErrorOnce(
      `collection:${String(error)}`,
      'Nexus Horde Reentry Guard: no se pudo convertir la seleccion de jugadores.',
      error
    )
  }

  return result
}

function nexusHordeReentryCommandSource(event) {
  try {
    return event
      .getParseResults()
      .getContext()
      .getSource()
  } catch (error) {
    nexusHordeReentryLogErrorOnce(
      `source:${String(error)}`,
      'Nexus Horde Reentry Guard: no se pudo obtener el origen del comando.',
      error
    )

    return null
  }
}

function nexusHordeReentryParsedPlayerSelector(
  event
) {
  try {
    var context = event
      .getParseResults()
      .getContext()

    var argumentsMap = context.getArguments()

    if (!argumentsMap) return null

    var parsedPlayer =
      argumentsMap.get('player')

    if (!parsedPlayer) return null

    return parsedPlayer.getResult()
  } catch (error) {
    nexusHordeReentryLogErrorOnce(
      `selector:${String(error)}`,
      'Nexus Horde Reentry Guard: no se pudo leer el selector del comando.',
      error
    )

    return null
  }
}

function nexusHordeReentryResolveTargets(event) {
  var source =
    nexusHordeReentryCommandSource(event)

  if (!source) return []

  var selector =
    nexusHordeReentryParsedPlayerSelector(
      event
    )

  if (selector) {
    try {
      return nexusHordeReentryCollectionToArray(
        selector.findPlayers(source)
      )
    } catch (error) {
      nexusHordeReentryLogErrorOnce(
        `selector-resolve:${String(error)}`,
        'Nexus Horde Reentry Guard: no se pudo resolver el jugador o selector.',
        error
      )

      return []
    }
  }

  // La variante sin argumento "player" solo funciona
  // cuando el origen del comando es un jugador.
  try {
    return [source.getPlayerOrException()]
  } catch (ignored) {
    return []
  }
}

function nexusHordeReentryActiveTargets(
  players
) {
  var activePlayers = []

  players.forEach(player => {
    var playerId =
      nexusHordeReentryPlayerId(player)

    if (
      nexusHordeReentryActivePlayers.has(
        playerId
      )
    ) {
      activePlayers.push(player)
    }
  })

  return activePlayers
}

function nexusHordeReentryNotifyRejected(
  event,
  players
) {
  var names = players
    .map(player =>
      nexusHordeReentryPlayerName(player)
    )
    .join(', ')

  var message = players.length === 1
    ? `${names} ya tiene una Horda activa.`
    : `Estos jugadores ya tienen una Horda activa: ${names}.`

  console.warn(
    `[Nexus Horde] Inicio rechazado: ${message}`
  )

  // Intenta mostrar también el error al ejecutor.
  // Si Text no está disponible en este contexto,
  // el bloqueo sigue funcionando y queda el aviso en log.
  try {
    var source =
      nexusHordeReentryCommandSource(event)

    if (
      source &&
      typeof Text !== 'undefined' &&
      Text &&
      typeof Text.of === 'function'
    ) {
      source.sendFailure(
        Text.of(message)
      )
    }
  } catch (ignored) {
    // El fallo visual no afecta al bloqueo funcional.
  }
}

ForgeEvents.onEvent(
  'net.minecraftforge.event.CommandEvent',
  event => {
    var reentryCommand =
      nexusHordeReentryCommandText(event)

    if (
      !nexusHordeReentryIsStartCommand(
        reentryCommand
      )
    ) {
      return
    }

    if (
      nexusHordeReentryActivePlayers.size ===
      0
    ) {
      return
    }

    var reentryTargets =
      nexusHordeReentryResolveTargets(event)

    // Si no existe un objetivo válido, el comando
    // nativo tampoco iniciará una Horda.
    if (reentryTargets.length === 0) {
      return
    }

    var reentryActiveTargets =
      nexusHordeReentryActiveTargets(
        reentryTargets
      )

    if (
      reentryActiveTargets.length === 0
    ) {
      return
    }

    // Se cancela el comando completo si uno de los
    // jugadores seleccionados ya tiene una Horda.
    event.setCanceled(true)

    nexusHordeReentryNotifyRejected(
      event,
      reentryActiveTargets
    )
  }
)

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeStartEvent',
  event => {
    var reentryPlayer =
      event.getPlayer()

    nexusHordeReentryActivePlayers.add(
      nexusHordeReentryPlayerId(
        reentryPlayer
      )
    )
  }
)

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeEndEvent',
  event => {
    var reentryPlayer =
      event.getPlayer()

    nexusHordeReentryActivePlayers.delete(
      nexusHordeReentryPlayerId(
        reentryPlayer
      )
    )
  }
)

// No se elimina al jugador cuando se desconecta.
// nexus_horde_director.js pausa su Horda, por lo que
// debe seguir considerándose activa hasta HordeEndEvent.

ForgeEvents.onEvent(
  'net.minecraftforge.event.server.ServerStoppingEvent',
  event => {
    nexusHordeReentryActivePlayers.clear()
    nexusHordeReentryLoggedErrors.clear()
  }
)