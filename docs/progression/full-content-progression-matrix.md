# Auditoría de progresión de contenido — Pack 26.0

Auditoría estática local realizada sobre los JAR instalados de Forge 1.20.1. Los conteos corresponden a modelos de item de primer nivel; TaCZ registra además sus armas mediante definiciones con NBT `GunId`.

| Mod | Objetos auditados | Recetas auditadas | Resultado |
| --- | ---: | ---: | --- |
| Epic Fight | 48 | 31 | Armas por material y skillbooks; solo una gran espada avanzada se restringe en la muestra. |
| Simply Swords | 142 | 424 | Gran familia por materiales más armas únicas; se aplican únicamente tres glaives claros. |
| Iron's Spells | 293 | 258 | Libros, armaduras, staffs, curios, materiales y estaciones; se aplican cuatro spellbooks claros. |
| TaCZ | 12 items base + 54 armas | 11 | Las armas comparten `tacz:modern_kinetic_gun`; la clasificación usa `GunId`. |
| Create | 743 | 1766 | Componentes, bloques cinéticos y máquinas; se aplican tres hitos tecnológicos claros. |
| Create Crafts & Additions | 53 | 131 | Electricidad y acumulación; queda documentado, sin restricciones en esta fase. |
| Epic Fight Nightfall | 42 | 44 | Armas y armaduras especiales; ambiguo/endgame, sin aplicar. |
| Block Factory's Bosses | 117 | 39 | Equipo y drops de bosses; sin aplicar. |
| L_Ender's Cataclysm | 301 | 189 | Reliquias y equipo de bosses; sin aplicar. |

## Matriz aplicada y propuesta

| ID exacto | Mod | Categoría | Era mínima | Clase | Subhito previsto | Aplicada | Motivo/observaciones |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `simplyswords:iron_glaive` | Simply Swords | arma melee | I | Guerrero | Fundamentos marciales | Sí | Arma real del kit Guerrero. |
| `simplyswords:diamond_glaive` | Simply Swords | arma melee | II | Guerrero | Armamento reforzado | Sí | Evolución material directa del arma inicial. |
| `epicfight:diamond_greatsword` | Epic Fight | arma pesada avanzada | III | Guerrero | Movesets avanzados | Sí | Arma pesada específicamente ligada al combate avanzado. |
| `simplyswords:netherite_glaive` | Simply Swords | arma melee endgame | IV | Guerrero | Arsenal del Nexus | Sí | Evolución netherite directa. |
| `irons_spellbooks:copper_spell_book` | Iron's Spells | spellbook inicial | I | Mago | Iniciación mágica | Sí | Libro real del kit Mago. |
| `irons_spellbooks:diamond_spell_book` | Iron's Spells | spellbook intermedio | II | Mago | Dominio de hechizos | Sí | Tier material y mágico intermedio inequívoco. |
| `irons_spellbooks:dragonskin_spell_book` | Iron's Spells | spellbook avanzado | III | Mago | Arcano avanzado | Sí | Libro avanzado; no bloquea sus materiales comunes. |
| `irons_spellbooks:netherite_spell_book` | Iron's Spells | spellbook endgame | IV | Mago | Grimorio del Nexus | Sí | Tier netherite/endgame claro. |
| `tacz:modern_kinetic_gun` + `GunId=tacz:glock_17` | TaCZ | pistola | I | Pistolero | Arma de servicio | Sí | Glock real del kit inicial. |
| `tacz:modern_kinetic_gun` + `GunId=tacz:hk_mp5a5` | TaCZ | SMG | II | Pistolero | Arsenal medio | Sí | Escalón medio; munición no restringida. |
| `tacz:modern_kinetic_gun` + `GunId=tacz:m4a1` | TaCZ | rifle | III | Pistolero | Arsenal avanzado | Sí | Rifle avanzado representativo. |
| `tacz:modern_kinetic_gun` + `GunId=tacz:m107` | TaCZ | rifle antimaterial | IV | Pistolero | Tirador de élite | Sí | Arma especializada endgame. |
| `create:cogwheel` | Create | componente básico | I | Libre | Mecánica inicial | Sí | Puerta de aprendizaje; no hace Create exclusivo de una clase. |
| `create:mechanical_press` | Create | máquina intermedia | II | Libre | Automatización intermedia | Sí | Primera máquina de proceso representativa. |
| `create:rotation_speed_controller` | Create | componente avanzado | III | Libre | Industria avanzada | Sí | Control avanzado de red cinética. |
| `createaddition:electric_motor` | Create Crafts & Additions | máquina eléctrica | III | Libre | Industria avanzada | No | Requiere decisión sobre energía y recetas del servidor. |
| `createaddition:tesla_coil` | Create Crafts & Additions | máquina eléctrica | IV | Libre | Preparación del Nexus | No | Potencia/uso necesitan prueba manual. |
| `epicfight:skillbook` | Epic Fight | habilidad | II–III | Guerrero posible | Disciplina marcial | No | NBT/contenido variable; no debe bloquearse como un único item genérico. |
| `efn:ruinsgreatsword` | Nightfall | arma especial | IV posible | Guerrero posible | Endgame de clase | No | Potencia, obtención y dependencia de moveset necesitan decisión. |
| `efn:hf_murasama_blade` | Nightfall | arma especial | IV posible | Guerrero posible | Endgame de clase | No | Arma especial; no se clasifica por nombre. |
| `irons_spellbooks:blood_staff` | Iron's Spells | staff | III–IV | Mago | Arcano avanzado | No | Deben revisarse estadísticas y ruta de obtención. |
| `irons_spellbooks:netherite_mage_chestplate` | Iron's Spells | armadura mágica | IV | Mago | Endgame de clase | No | Requiere prueba de equipamiento AND antes de ampliar. |
| `irons_spellbooks:arcane_essence` | Iron's Spells | material común de mod | Libre | Libre | — | No | Material de progresión: no se bloquea. |
| `tacz:ammo` | TaCZ | munición base | Libre | Libre | — | No | Restringir munición podría romper inventario/crafting; se mantiene libre. |
| `tacz:gun_smith_table` | TaCZ | banco | I–II posible | Libre | Arsenal medio | No | Acceso al banco requiere decisión de diseño, no se infiere por namespace. |
| `cataclysm:ancient_spear` | Cataclysm | drop/reliquia | IV posible | Ambiguo | Reliquias | No | Procedencia de boss y balance pendientes. |
| `cataclysm:gauntlet_of_bulwark` | Cataclysm | reliquia | IV posible | Ambiguo | Reliquias | No | No asignar clase antes de probar su uso. |
| `block_factorys_bosses:knight_sword` | Block Factory's Bosses | drop de boss | III–IV | Guerrero posible | Bosses | No | Obtención y potencia pendientes. |

## Reglas de implementación

- Los 12 objetos de clase aplicados están presentes tanto en su stage individual como en el stage global de era: History Stages exige ambos.
- Los 3 objetos de Create solo dependen de la era.
- No se restringen munición, materiales comunes, almacenamiento, comida, agricultura, pesca ni construcción.
- `unlock_actions` conserva `place`, `pickup`, `loot`, `recipe`, `gui` e `icon`; no hay manipulación de inventarios ni listeners propios.
- No se añaden bloqueos de recetas nuevos: solo se mantienen las recetas de diamante/netherite ya validadas.

## Subhitos conceptuales

### Era III

- Arcano inicial.
- Industria avanzada.
- Arsenal avanzado.
- Preparación del Nexus.

### Era IV

- Acceso al Nexus.
- Endgame de clase.
- Reliquias.
- Bosses.
- Tecnología aérea futura.

## Pendiente de integración tecnológica

- Create Aeronautics: instalación y compatibilidad exacta.
- Integración exclusiva en Era IV.
- Requisitos tecnológicos previos basados en mecanismos de precisión, automatización avanzada y producción estable.
- Validación de rendimiento y recipes antes de introducir el subhito de tecnología aérea.

## Candidatos incorporados en la expansión 26.1

No se aplican restricciones nuevas en esta fase.

| Mod | Progresión futura propuesta | Restricción actual |
| --- | --- | --- |
| Clumps | Libre; infraestructura de rendimiento. | Ninguna |
| Enchantment Descriptions | Libre; información de interfaz. | Ninguna |
| Shulker Box Tooltip | Libre; calidad de vida. | Ninguna |
| Cut Through | Libre; comportamiento general de combate. | Ninguna |
| Alshanex's Familiars | Obtención natural y capítulo de exploración/magia; estudiar afinidad con Mago sin hacerlo exclusivo automáticamente. | Ninguna |
| Relics | Exploración y obtención natural; subhito de reliquias en Era IV cuando se clasifiquen individualmente. | Ninguna |
| Wither: Reincarnated | Boss global candidato a Era IV/endgame. | Ninguna |
| Horseman | Sistema global de transporte; libre salvo objetos concretos que requieran revisión. | Ninguna |
| FantasyWeapons | Retirado por incompatibilidad de recursos: atlas de partículas 32768×16384 y agotamiento de memoria/commit. | No instalado |
| Dynamic Waters | Sistema global de mundo; nunca restringido por clase. | Ninguna |
| DecoCraft | Decoración básica desde Era I y objetos puramente decorativos libres. | Ninguna |
| Abyssal Corrupter | Candidato avanzado/endgame si aparece una build oficial coherente. | No instalado |
| Create Aeronautics | Preparación tecnológica en Era III y acceso compartido en Era IV. Nunca exclusivo del Pistolero. | No instalado |

### Preparación tecnológica para Aeronautics

- Era III: mecanismos de precisión, automatización avanzada, producción estable y redes cinéticas maduras.
- Era IV: ensamblaje de aeronaves, propulsión, navegación y colaboración multiclase.
- Metalurgista podrá recibir sinergias futuras, pero Aeronautics debe continuar disponible para todas las clases.

## Especialización Metalurgista

| ID exacto | Mod | Categoría | Era mínima | Clase | Subhito | Aplicada | Observaciones |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `nexus_specialization_metallurgist` | Nexus/History Stages | especialización | III | Mago | La Senda del Metal | Sí | Stage de estado vacío; no restringe objetos hasta elegir el mod oficial. |
| Sin ID confirmado | Allomancy pendiente | mecánica metálica | III–IV | Mago + Metalurgista | aprendizaje / endgame | No | Hay varios proyectos oficiales Forge 1.20.1 y el repositorio no identifica el previsto. |

No se clasifican objetos, metales ni poderes por nombre. Los metales vanilla permanecen libres y la integración nativa queda pendiente del project/file ID oficial.
