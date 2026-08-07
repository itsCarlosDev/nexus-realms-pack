const NEXUS_TPA_TIMEOUT_MS = 120000
const NEXUS_TPA_COOLDOWN_MS = 10000

const $NexusTpaUUID = Java.loadClass('java.util.UUID')

function nexusTpaClear(player) {
  const data = player.persistentData

  data.remove('nexus_tpa_requester_uuid')
  data.remove('nexus_tpa_requester_name')
  data.remove('nexus_tpa_created')
}

function nexusTpaHasRequest(player) {
  const data = player.persistentData

  if (!data.contains('nexus_tpa_requester_uuid')) {
    return false
  }

  const created = Number(
    data.getLong('nexus_tpa_created')
  )

  if (
    !created ||
    Date.now() - created >
      NEXUS_TPA_TIMEOUT_MS
  ) {
    nexusTpaClear(player)
    return false
  }

  return true
}

function nexusTpaGetRequester(
  server,
  target
) {
  if (!nexusTpaHasRequest(target)) {
    return null
  }

  const uuidString =
    target.persistentData.getString(
      'nexus_tpa_requester_uuid'
    )

  try {
    return server
      .getPlayerList()
      .getPlayer(
        $NexusTpaUUID.fromString(
          String(uuidString)
        )
      )
  } catch (error) {
    return null
  }
}

ServerEvents.commandRegistry(event => {
  const {
    commands: Commands,
    arguments: Arguments
  } = event

  /*
   * /tpa <player>
   */
  event.register(
    Commands.literal('tpa')
      .then(
        Commands.argument(
          'target',
          Arguments.PLAYER.create(event)
        )
          .executes(ctx => {
            const player =
              ctx.source.player

            const target =
              Arguments.PLAYER.getResult(
                ctx,
                'target'
              )

            if (!player || !target) {
              return 0
            }

            if (
              String(player.uuid) ===
              String(target.uuid)
            ) {
              player.tell(
                'No puedes enviarte un TPA a ti mismo.'
              )

              return 0
            }

            const now = Date.now()

            const lastSent = Number(
              player.persistentData.getLong(
                'nexus_tpa_last_sent'
              )
            )

            const remaining =
              NEXUS_TPA_COOLDOWN_MS -
              (now - lastSent)

            if (
              lastSent > 0 &&
              remaining > 0
            ) {
              player.tell(
                'Espera ' +
                Math.ceil(
                  remaining / 1000
                ) +
                's antes de enviar otro TPA.'
              )

              return 0
            }

            if (
              nexusTpaHasRequest(target)
            ) {
              player.tell(
                String(target.username) +
                  ' ya tiene una solicitud de TPA pendiente.'
              )

              return 0
            }

            target.persistentData.putString(
              'nexus_tpa_requester_uuid',
              String(player.uuid)
            )

            target.persistentData.putString(
              'nexus_tpa_requester_name',
              String(player.username)
            )

            target.persistentData.putLong(
              'nexus_tpa_created',
              now
            )

            player.persistentData.putLong(
              'nexus_tpa_last_sent',
              now
            )

            player.tell(
              'Solicitud de teletransporte enviada a ' +
                String(target.username) +
                '.'
            )

            target.tell(
              String(player.username) +
                ' quiere teletransportarse hasta ti.'
            )

            target.tell(
              'Usa /tpaccept para aceptar o /tpdeny para rechazar.'
            )

            return 1
          })
      )
  )

  /*
   * /tpaccept
   */
  event.register(
    Commands.literal('tpaccept')
      .executes(ctx => {
        const target =
          ctx.source.player

        if (!target) {
          return 0
        }

        if (
          !nexusTpaHasRequest(target)
        ) {
          target.tell(
            'No tienes ninguna solicitud de TPA pendiente.'
          )

          return 0
        }

        const requester =
          nexusTpaGetRequester(
            ctx.source.server,
            target
          )

        if (!requester) {
          target.tell(
            'El jugador que envió el TPA ya no está conectado.'
          )

          nexusTpaClear(target)

          return 0
        }

        const requesterName =
          String(requester.username)

        const targetName =
          String(target.username)

        nexusTpaClear(target)

        ctx.source.server.runCommandSilent(
          'tp ' +
            requesterName +
            ' ' +
            targetName
        )

        target.tell(
          'TPA aceptado.'
        )

        requester.tell(
          String(target.username) +
            ' ha aceptado tu TPA.'
        )

        return 1
      })
  )

  /*
   * /tpdeny
   */
  event.register(
    Commands.literal('tpdeny')
      .executes(ctx => {
        const target =
          ctx.source.player

        if (!target) {
          return 0
        }

        if (
          !nexusTpaHasRequest(target)
        ) {
          target.tell(
            'No tienes ninguna solicitud de TPA pendiente.'
          )

          return 0
        }

        const requester =
          nexusTpaGetRequester(
            ctx.source.server,
            target
          )

        nexusTpaClear(target)

        target.tell(
          'TPA rechazado.'
        )

        if (requester) {
          requester.tell(
            String(target.username) +
              ' ha rechazado tu TPA.'
          )
        }

        return 1
      })
  )
})