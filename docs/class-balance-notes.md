# Class Balance Notes

## Objetivo

Mantener las tres clases atractivas sin que una invalide a las demas.

## Estado actual de kits

### Guerrero

- Simply Swords starter weapon.
- Escudo/pan si aplica.
- Fuerte en melee.
- Riesgo: Epic Fight puede dominar demasiado si no se limita.

### Mago

- Copper Spell Book.
- Hechizo inicial.
- Amethyst shards.
- Pan.
- Fuerte a medio plazo.
- Riesgo: debil al inicio si los hechizos cuestan demasiado o fallan.

### Pistolero

- Glock 17 TaCZ.
- 9mm ammo.
- Pan.
- Fuerte a distancia.
- Riesgo: dependencia de municion y keybinds.

## Notas

- No balancear todavia con valores definitivos.
- Primero estabilizar controles y restricciones.
- Luego probar supervivencia real de 30-60 minutos por clase.

## Pack 16.11 QA

- Guerrero usa Epic Fight con armas compatibles, Simply Swords y Skill Tree.
- Mago usa Iron's Spells y debe conservar Punchy/vanilla con mano vacia.
- Pistolero usa TaCZ con Glock 17 y debe conservar Punchy/vanilla con mano vacia.
- KubeJS bloquea items por clase; Epic Tweaks controla Battle/Mining Mode.
- Air / `minecraft:air` debe ser Preferred Tool y Epic Fight Toggle Battle/Mining Mode debe estar Not Bound antes de cerrar balance.
- El bloqueo agresivo de melee sin arma queda apagado por defecto para no sesgar las pruebas de Mago/Pistolero.
