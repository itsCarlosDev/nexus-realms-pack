// Nexus Realms - puente entre los eventos Forge de The Hordes
// y nexus_era_calendar.js, que permanece en server_scripts.

var nexusEraCalendarBridgeLoggedErrors = new Set()
var nexusEraCalendarBedProblemClass = null

try {
  nexusEraCalendarBedProblemClass = Java.loadClass(
    'net.minecraft.world.entity.player.Player$BedSleepingProblem'
  )
} catch (error) {
  console.error('[Nexus Era Bridge] No se pudo cargar BedSleepingProblem.')
  console.error(error)
}

function nexusEraCalendarBridgeLogErrorOnce(
  key,
  message,
  error
) {
  if (
    nexusEraCalendarBridgeLoggedErrors.has(
      key
    )
  ) {
    return
  }

  nexusEraCalendarBridgeLoggedErrors.add(
    key
  )

  console.error(message)

  if (error) {
    console.error(error)
  }
}

function nexusEraCalendarBridgeCall(
  method,
  event
) {
  try {
    var calendarApi =
      global.NexusEraCalendar

    if (
      !calendarApi ||
      typeof calendarApi[method] !==
        'function'
    ) {
      nexusEraCalendarBridgeLogErrorOnce(
        `api:${method}`,
        `[Nexus Era Bridge] La API del calendario no esta disponible para ${method}.`,
        null
      )

      return
    }

    calendarApi[method](event)
  } catch (error) {
    nexusEraCalendarBridgeLogErrorOnce(
      `callback:${method}:${String(error)}`,
      `[Nexus Era Bridge] Fallo al ejecutar ${method}.`,
      error
    )
  }
}

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeStartEvent',
  event => {
    nexusEraCalendarBridgeCall(
      'onHordeStart',
      event
    )
  }
)

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeEndEvent',
  event => {
    nexusEraCalendarBridgeCall(
      'onHordeEnd',
      event
    )
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.player.PlayerEvent$PlayerLoggedInEvent',
  event => {
    nexusEraCalendarBridgeCall('onPlayerLogin', event.getEntity())
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.player.PlayerSleepInBedEvent',
  event => {
    try {
      var player = event.getEntity()
      var calendarApi = global.NexusEraCalendar
      if (!calendarApi || typeof calendarApi.isHordeActive !== 'function'
          || !calendarApi.isHordeActive(player.getServer())) return
      event.setResult(nexusEraCalendarBedProblemClass.OTHER_PROBLEM)
      player.tell('§cEl pulso del Nexus impide dormir durante la Incursión.')
    } catch (error) {
      nexusEraCalendarBridgeLogErrorOnce(
        `sleep:${String(error)}`,
        '[Nexus Era Bridge] Fallo al bloquear el sueño durante la Incursión Nexus.',
        error
      )
    }
  }
)
