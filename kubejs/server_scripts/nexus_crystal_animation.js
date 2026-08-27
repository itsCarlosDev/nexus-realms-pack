// Nexus Realms - Nexus Crystal Animation V6
//
// Minecraft 1.20.1
//
// UNA sola gema visible.
// Movimiento REAL de la entidad.
// Rotación REAL mediante yaw.
// Glow sigue automáticamente a la gema.

console.info('[Nexus Realms] Nexus Crystal Animation V6 cargado')

let nexusCrystalTick = 0

function nexusNum(value) {
  let n = Number(value.toFixed(5))

  if (Math.abs(n) < 0.00001) {
    n = 0
  }

  return n.toString()
}

function nexusPulse(phase, center, width) {
  const distance = Math.abs(phase - center)

  if (distance >= width) {
    return 0
  }

  const x = 1 - distance / width

  return x * x * (3 - 2 * x)
}

ServerEvents.tick(event => {

  nexusCrystalTick++

  const server = event.server
  const t = nexusCrystalTick

  const anchor =
    '@e[type=minecraft:marker,tag=nexus_crystal_anchor,limit=1]'

  const crystal =
    '@e[type=minecraft:item_display,tag=nexus_crystal_core,limit=1]'


  // =========================================================
  // MOVIMIENTO VERTICAL
  // =========================================================

  /*
   * Posición base:
   * 2.60 bloques encima del ancla.
   *
   * Movimiento:
   * +-0.18 bloques.
   *
   * Ciclo completo:
   * ~4 segundos.
   */

  const bob =
    Math.sin(t * Math.PI / 40) * 0.18

  const y =
    2.60 + bob


  // =========================================================
  // ROTACIÓN
  // =========================================================

  /*
   * 1.5 grados por tick
   *
   * 30 grados/segundo
   * = una vuelta cada 12 segundos
   */

  const yaw =
    (t * 1.5) % 360


  // =========================================================
  // MOVER REALMENTE LA GEMA
  // =========================================================

  /*
   * Ya NO utilizamos transformation.translation.
   *
   * La posición REAL del item_display cambia.
   */

  server.runCommandSilent(
    'execute at ' + anchor +
    ' run tp ' + crystal +
    ' ~ ~' + nexusNum(y) + ' ~ ' +
    nexusNum(yaw) + ' 0'
  )


  // =========================================================
  // LATIDO
  // =========================================================

  /*
   * Ciclo:
   *
   *     PUM
   *        PUM!
   *
   *        reposo
   *
   * 80 ticks = 4 segundos
   */

  const phase =
    t % 80

  const beat1 =
    nexusPulse(phase, 10, 5) * 0.55

  const beat2 =
    nexusPulse(phase, 20, 6)

  const power =
    Math.min(1, beat1 + beat2)


  // =========================================================
  // GLOW AMBIENTAL
  // =========================================================

  // 10 actualizaciones por segundo
  if (t % 2 !== 0) {
    return
  }

  const intensity =
    Math.max(0.10, power)

  const spreadXZ =
    0.24 + intensity * 0.30

  const spreadY =
    0.35 + intensity * 0.32

  const amount =
    Math.max(
      1,
      Math.floor(1 + intensity * 6)
    )


  // =========================================================
  // AURA VIOLETA
  // =========================================================

  /*
   * Ahora execute at crystal usa la posición
   * REAL de la gema.
   *
   * Ya NO necesitamos sumar "bob" a las partículas.
   */

  server.runCommandSilent(
    'execute at ' + crystal +
    ' run particle minecraft:dust ' +
    '0.72 0.12 1.0 ' +
    nexusNum(0.8 + intensity * 0.5) +
    ' ~ ~ ~ ' +
    nexusNum(spreadXZ) + ' ' +
    nexusNum(spreadY) + ' ' +
    nexusNum(spreadXZ) + ' ' +
    '0.005 ' +
    amount +
    ' force'
  )


  // =========================================================
  // SEGUNDO LATIDO
  // =========================================================

  if (beat2 > 0.55 && t % 4 === 0) {

    server.runCommandSilent(
      'execute at ' + crystal +
      ' run particle minecraft:reverse_portal ' +
      '~ ~ ~ ' +
      '0.22 0.32 0.22 ' +
      '0.025 3 force'
    )
  }


  // =========================================================
  // DESTELLO DEL CORAZÓN
  // =========================================================

  if (power > 0.82) {

    server.runCommandSilent(
      'execute at ' + crystal +
      ' run particle minecraft:dust ' +
      '0.95 0.35 1.0 1.5 ' +
      '~ ~ ~ ' +
      '0.09 0.15 0.09 ' +
      '0.002 3 force'
    )
  }
})