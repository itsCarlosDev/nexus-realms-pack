# FTB Quests Class Design

## Capitulos propuestos

1. Bienvenida a Nexus Realms
2. Elegir una clase
3. Senda del Guerrero
4. Senda del Mago
5. Senda del Pistolero
6. Progresion comun
7. Bosses y mazmorras
8. Tecnologia/Create
9. Exploracion y pesca

## Reglas

- El capitulo de seleccion no debe sustituir FancyMenu todavia.
- La seleccion real sigue siendo `/nexus_select`.
- FTB Quests puede mostrar instrucciones y recompensas.
- FTB Quests no debe entregar los kits iniciales mientras KubeJS los entregue.
- Evitar duplicar recompensas.
- Las quests de cada clase deben estar separadas visualmente.

## Comandos utiles

- `/nexus_class_status`
- `/nexus_class_debug`
- `/nexus_givekit <class> <player>`
- `/nexus_resetclass_clean <player>`

## Notas de integracion

- Si FTB Quests puede ejecutar comandos, las recompensas avanzadas podran llamar a comandos KubeJS en el futuro.
- Si se usan stages/tags, documentar antes de implementar.
- No crear dependencias ocultas.
