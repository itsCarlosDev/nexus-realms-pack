// Nexus Realms - Cristal del Nexo
// V3: UNA sola entidad 3D. El aura se simula con partículas, no con otro cristal.

let nexusCrystalTick = 0

function ncf(value) {
  let n = Number(value.toFixed(6))
  if (Math.abs(n) < 0.000001) n = 0
  return n.toString()
}

ServerEvents.tick(event => {
  nexusCrystalTick++

  // 5 actualizaciones por segundo. La interpolación del display suaviza el movimiento.
  if (nexusCrystalTick % 4 !== 0) return

  const server = event.server
  const core = '@e[type=minecraft:item_display,tag=nexus_crystal_core,limit=1]'
  const t = nexusCrystalTick

  // Flotación vertical: ±0.14 bloques.
  const bob = Math.sin(t * 0.062832) * 0.14

  // Rotación lenta alrededor de Y.
  const angle = t * 0.018
  const sy = Math.sin(angle / 2)
  const cy = Math.cos(angle / 2)

  // Pulso muy suave: sigue pareciendo un objeto único.
  const scale = 3.00 + Math.sin(t * 0.050) * 0.035

  const nbt =
    '{start_interpolation:0,interpolation_duration:4,' +
    'transformation:{' +
    'translation:[0.0f,' + ncf(bob) + 'f,0.0f],' +
    'left_rotation:[0.0f,' + ncf(sy) + 'f,0.0f,' + ncf(cy) + 'f],' +
    'scale:[' + ncf(scale) + 'f,' + ncf(scale) + 'f,' + ncf(scale) + 'f],' +
    'right_rotation:[0.0f,0.0f,0.0f,1.0f]}}'

  server.runCommandSilent('data merge entity ' + core + ' ' + nbt)

  // Aura visual sin segundo modelo: partículas alrededor del mismo display.
  if (t % 12 === 0) {
    server.runCommandSilent(
      'execute at ' + core +
      ' run particle minecraft:dust 0.72 0.18 1.0 1.0 ~ ~' + ncf(bob) +
      ' ~ 0.34 0.52 0.34 0.01 3 force'
    )
  }

  // Partículas de energía más espaciadas.
  if (t % 40 === 0) {
    server.runCommandSilent(
      'execute at ' + core +
      ' run particle minecraft:reverse_portal ~ ~' + ncf(bob) +
      ' ~ 0.22 0.42 0.22 0.01 2 force'
    )
  }
})
