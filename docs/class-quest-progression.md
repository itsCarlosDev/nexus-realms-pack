# Pack 16.2 - Class Quest Progression Foundation

## Objetivo

Crear progresion separada por clase usando FTB Quests.

## Fuente de verdad

KubeJS guarda la clase:

- persistentData `nexus_class_chosen`
- persistentData `nexus_class`

Tags usados:

- `nexus_class_warrior`
- `nexus_class_mage`
- `nexus_class_gunslinger`

FTB Quests debe usar estos tags para desbloquear/mostrar progresion por clase.

## Capitulos previstos

### Inicio - Nexus Realms

Capitulo inicial comun.

Debe explicar:

- el jugador ya eligio clase en FancyMenu;
- la clase queda guardada;
- cada clase tiene una senda propia.

### Senda del Guerrero

Para jugadores con tag: `nexus_class_warrior`

Temas:

- combate cuerpo a cuerpo;
- espada y escudo;
- Better Combat;
- Combat Roll;
- Simply Swords;
- bosses.

Primeras quests sugeridas:

1. Equipate con tu espada.
2. Bloquea con escudo.
3. Derrota 5 zombies.
4. Fabrica o consigue una nueva espada.
5. Encuentra una estructura o mazmorra.
6. Preparate para tu primer boss.

### Arte Arcano

Para jugadores con tag: `nexus_class_mage`

Temas:

- Iron's Spells;
- grimorios;
- pergaminos;
- mana;
- progresion magica.

Primeras quests sugeridas:

1. Consigue un libro magico.
2. Consigue componentes arcanos.
3. Aprende tu primer hechizo.
4. Lanza un hechizo ofensivo.
5. Mejora tu equipo magico.
6. Busca una estructura magica.

### Supervivencia Balistica

Para jugadores con tag: `nexus_class_gunslinger`

Temas:

- TaCZ;
- municion limitada;
- supervivencia;
- precision;
- Shoulder Surfing;
- exploracion peligrosa.

Primeras quests sugeridas:

1. Equipate con tu arma basica.
2. Consigue municion.
3. Practica disparando a distancia.
4. Derrota enemigos sin gastar toda la municion.
5. Encuentra suministros.
6. Mejora tu arsenal.

## Reglas importantes

- FTB Quests no debe dar la clase.
- FTB Quests no debe guardar la clase.
- FTB Quests no debe dar el kit inicial principal.
- KubeJS sigue siendo el backend.
- Las quests solo deben leer tags y dar progresion/recompensas.
- Evitar recompensas repetibles que dupliquen armas/municion.
- Evitar progreso compartido de clase si FTB Teams fusiona progreso.
- La clase debe seguir siendo individual.

## Editor in-game de FTB Quests

La creacion real de capitulos se hara desde el editor de FTB Quests en Prism. No se crean archivos SNBT activos en este pack porque el repo no tiene un formato FTB Quests existente que sirva como referencia segura.

Instrucciones:

1. Entrar al mundo de pruebas.
2. Abrir FTB Quests.
3. Activar modo edicion si hace falta.
4. Crear capitulo comun: Inicio - Nexus Realms.
5. Crear capitulo: Senda del Guerrero.
6. Crear capitulo: Arte Arcano.
7. Crear capitulo: Supervivencia Balistica.
8. Configurar visibilidad/requisitos por tag si FTB Quests lo permite directamente.
9. Si FTB Quests no permite tag requirement directamente, usar una alternativa temporal:
   - usar comandos/recompensas de KubeJS;
   - usar quests iniciales por clase;
   - usar capitulos ocultos manualmente;
   - evaluar FTB Ranks/GameStages solo mas adelante, no ahora.

## Recompensas iniciales sugeridas

Guerrero:

- comida;
- XP;
- arma melee mejorada mas adelante.

Mago:

- componentes magicos;
- XP;
- pergaminos basicos mas adelante.

Pistolero:

- municion muy limitada;
- comida;
- suministros.

## Fase futura

Pack 16.3:

- Mage class expansion postponed after rejecting T.O Magic 'n Extras due to dependency chain/crash risk.

Pack 16.4:

- Class starter kits real modded with Simply Swords, Iron's Spells, and TaCZ. FTB Quests still must not grant the main starter kit directly.

Pack 16.5:

- Recipe/loot restrictions by class.

Pack 16.x futuro:

- Epic Fight solo si se arregla su compatibilidad con Punchy/TaCZ.
