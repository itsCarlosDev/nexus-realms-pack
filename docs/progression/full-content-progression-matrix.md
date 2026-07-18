# Matriz definitiva de contenido por era y clase

Auditoría estática local de los registros y recursos presentes en los JAR de Forge 1.20.1 instalados. Esta matriz clasifica familias funcionales, no activa restricciones. History Stages seguirá siendo el único motor de enforcement cuando se implemente la selección definitiva.

## Cobertura auditada

| Mod o sistema | Registros/recursos revisados | Criterio utilizado |
| --- | ---: | --- |
| Epic Fight | 48 modelos de item / 31 recetas | material, función y skillbooks con contenido variable |
| Simply Swords | 142 modelos / 424 recetas | familias por material y armas únicas |
| Iron's Spells 'n Spellbooks | 293 modelos / 258 recetas | grimorios, scrolls, runas, armaduras, staffs, curios y estaciones |
| TaCZ default gun pack | 12 items base + 54 `GunId` / 11 recetas | tipo de arma y potencia; los items base usan NBT |
| Create | 743 modelos / 1766 recetas | complejidad mecánica y cadena tecnológica |
| Create Crafts & Additions | 53 modelos / 131 recetas | distribución eléctrica, generación y tecnología sobrecargada |
| Epic Fight Nightfall | 42 modelos / 44 recetas | armas, armaduras y skillbooks especiales |
| Relics | 119 variantes de modelo | función, obtención natural y potencial de combate |
| L_Ender's Cataclysm | 301 modelos / 189 recetas | llaves de boss, materiales, armas, armaduras y reliquias |
| Block Factory's Bosses | 117 modelos / 39 recetas | equipo y drops de bosses |
| Bosses of Mass Destruction | 24 modelos principales | artefactos y drops de bosses |
| Mowzie's Mobs | 67 modelos principales | equipo, armas y poderes de bosses |
| Alshanex's Familiars | 63 modelos principales | invocación, mejora de familiares y curios |
| Wither: Reincarnated | reemplazo de boss, sin items propios detectados | dificultad y acceso al encuentro |
| Allomancy 4.6.5 | 116 items registrados / 16 poderes | función nativa, uso del sistema, metal asociado y progresión Mistborn |

## Reglas de lectura

- `GLOBAL`: disponible para todas las clases cuando se alcanza la era.
- `MULTICLASE`: encaja en varios estilos; no se asigna en exclusiva sin una decisión de diseño.
- `PENDIENTE DE DECISIÓN`: el registro existe, pero su potencia, NBT u obtención exige prueba antes de restringir.
- Arcanista y Metalomante son especializaciones mutuamente excluyentes del Mago. Arcanista ya dispone de stage; Metalomante conserva el ID interno `metallurgist`.
- Metalomante conserva el identificador interno `metallurgist`; Allomancy 4.6.5 se integra mediante Mage AND Metalomante y stages globales de Era III/IV.
- En TaCZ, `tacz:modern_kinetic_gun`, `tacz:ammo` y `tacz:attachment` son contenedores con NBT. Una futura restricción debe evaluar `GunId`/`AmmoId`/`AttachmentId`, no bloquear el item base completo.

## Clasificación funcional

| Contenido | Mod | Era mínima | Clase | Especialización | Restricción propuesta | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| Armas de madera, piedra e hierro (`dagger`, `greatsword`, `longsword`, `spear`, `tachi` y variantes materiales) | Epic Fight | I | Guerrero | — | Era I + `nexus_class_warrior` | Armas de moveset avanzado; las armas vanilla básicas permanecen globales. |
| Familia `diamond_*` de armas Epic Fight | Epic Fight | II | Guerrero | — | Era II + Guerrero | Escalón material directo; no adelantar armas pesadas por pertenecer a la clase. |
| Familia `netherite_*` de armas Epic Fight | Epic Fight | IV | Guerrero | — | Era IV + Guerrero | Endgame material. |
| `epicfight:skillbook` y variantes de skillbook | Epic Fight | II | Guerrero | — | PENDIENTE DE DECISIÓN por skill/NBT | El item genérico puede contener habilidades de distinto poder; repartir entre II y III. |
| Familia completa de armas `iron_*` | Simply Swords | I | Guerrero | — | Era I + Guerrero | Incluye glaive, claymore, greataxe, greathammer, halberd, katana, scythe y equivalentes. |
| Familia completa de armas `diamond_*` | Simply Swords | II | Guerrero | — | Era II + Guerrero | Evolución material clara. |
| Familia completa de armas `runic_*` | Simply Swords | III | Guerrero | — | Era III + Guerrero | Poder mágico avanzado; verificar recetas antes de fijar el subhito. |
| Familia completa de armas `netherite_*` | Simply Swords | IV | Guerrero | — | Era IV + Guerrero | Arsenal del Nexus. |
| Armas únicas (`brimstone_claymore`, `emberblade`, `frostfall`, `livyatan`, `soulkeeper`, `stormbringer`, `waking_lichblade` y resto de únicas) | Simply Swords | III | PENDIENTE DE DECISIÓN | — | Era III/IV; Guerrero o MULTICLASE según arma | No clasificarlas por nombre: revisar daño, habilidad y obtención individualmente. |
| Grinder, vial y flakes de iron/steel/tin/pewter/zinc/brass/copper/bronze | Allomancy | III | Mago | Metalomante | Era III + Mage + `nexus_specialization_metallurgist` | **IMPLEMENTADA**. Entrada al sistema; pickup, loot, receta y almacenamiento permanecen permitidos. |
| `allomancy:coin_bag` y `allomancy:mistcloak` | Allomancy | III | Mago | Metalomante | Era III + Mage + Metalomante | **IMPLEMENTADA**. Utilidad de combate ligada a la senda; no se manipulan inventarios. |
| Flakes de aluminum/duralumin/chromium/nicrosil/gold/electrum/cadmium/bendalloy | Allomancy | IV | Mago | Metalomante | Era IV + Mage + Metalomante | **IMPLEMENTADA**. Metales avanzados, temporales y espirituales. |
| `allomancy:lerasium_nugget` | Allomancy | IV | Mago | Metalomante | Era IV + Mage + Metalomante | **IMPLEMENTADA**. Su consumo llama a `setMistborn()` y concede los 16 poderes nativos. |
| Menas, raw ores, lingotes, nuggets, bloques y patrones | Allomancy | GLOBAL | GLOBAL | — | Libre | Material físico compartido con economía, construcción, herrería y Create. |
| `allomancy:koloss_blade` y `allomancy:obsidian_dagger` | Allomancy | III/IV | PENDIENTE DE DECISIÓN | — | PENDIENTE BALANCE | Armas independientes; no se asignan automáticamente a Metalomante. |
| Armas especiales (`air_tachi`, `ruinsgreatsword`, `hf_murasama*`, `yamato_dmc*`, `excalibur` y equivalentes) | Epic Fight Nightfall | III | Guerrero | — | Era III/IV + Guerrero | La mayoría son endgame; el tier exacto depende de receta/drop. |
| Sets `duskfire_*` y `ruinfighter_*` | Epic Fight Nightfall | III | Guerrero | — | Era III/IV + Guerrero | Armadura de combate especializada; verificar estadísticas. |
| Skillbooks de Nightfall | Epic Fight Nightfall | III | Guerrero | — | PENDIENTE DE DECISIÓN por skill/NBT | No restringir el contenedor genérico sin distinguir la habilidad. |
| `copper_spell_book`, `iron_spell_book`, `wimpy_spell_book` | Iron's Spells | I | Mago | Arcanista futura | Era I + Mago | Inicio de magia tradicional. |
| `gold_spell_book`, `diamond_spell_book`, `villager_spell_book`, `druidic_spell_book` | Iron's Spells | II | Mago | Arcanista futura | Era II + Mago | Desarrollo real de hechizos; algunos libros temáticos pueden requerir subhito. |
| `blaze_spell_book`, `ice_spell_book`, `evoker_spell_book`, `dragonskin_spell_book`, `rotten_spell_book` | Iron's Spells | III | Mago | Arcanista futura | Era III + Mago | Grimorios avanzados. |
| `legendary_spell_book`, `netherite_spell_book`, `necronomicon_spell_book`, `cursed_doll_spell_book` | Iron's Spells | IV | Mago | Arcanista futura | Era IV + Mago | Endgame mágico; confirmar obtención de los libros especiales. |
| `scroll` y variantes visuales por escuela | Iron's Spells | I | Mago | Arcanista futura | PENDIENTE DE DECISIÓN por hechizo/rareza NBT | Pickup/loot/almacenamiento deben seguir seguros; distribuir uso entre I–IV. |
| `common_ink`, `uncommon_ink`, `rare_ink`, `epic_ink`, `legendary_ink` | Iron's Spells | I | GLOBAL | — | Material libre; progresión de uso I/II/III/IV | No bloquear materiales comunes ni economía; la rareza guía quests/crafting. |
| `blank_rune` y runas de escuela | Iron's Spells | II | Mago | Arcanista futura | Era II + Mago para uso; pickup libre | Componentes de personalización mágica. |
| Upgrade orbs de escuela, mana, cooldown y protection | Iron's Spells | III | Mago | Arcanista futura | Era III + Mago para uso; pickup libre | Mejora avanzada, no material inicial. |
| Set wizard y sets iniciales priest/wandering magician | Iron's Spells | II | Mago | Arcanista futura | Era II + Mago | Armadura mágica intermedia. |
| Sets archevoker, cryomancer, cultist, electromancer, plagued, pyromancer y shadowwalker | Iron's Spells | III | Mago | Arcanista futura | Era III + Mago | Armaduras de escuela avanzada. |
| Set `netherite_mage_*` y piezas de alto nivel (`infernal_sorcerer_chestplate`, `paladin_chestplate`) | Iron's Spells | IV | Mago | Arcanista futura | Era IV + Mago | Endgame de armadura mágica. |
| `blood_staff`, `graybeard_staff`, `ice_staff`, `pyrium_staff`, `staff_of_the_nines` | Iron's Spells | III | Mago | Arcanista futura | Era III/IV + Mago | `staff_of_the_nines` debe reservarse para IV; `dev_staff` queda fuera de progresión. |
| Affinity rings, amulets, ward rings y curios de mana/cooldown/cast time | Iron's Spells | II | Mago | Arcanista futura | Era II–IV + Mago según rareza | PENDIENTE DE DECISIÓN individual; no bloquear curios meramente utilitarios sin prueba. |
| `alchemist_cauldron`, `arcane_anvil`, `inscription_table`, `scroll_forge` | Iron's Spells | I | GLOBAL | — | Acceso global por era; uso mágico guiado por quests | No convertir estaciones compartidas en inventario exclusivo de una clase. |
| Pistolas y revólveres iniciales (`glock_17`, `m1911`, `m9a4`, `p320`, `cz75`, `taurus943`, `rhino357`) | TaCZ default gun pack | I | Pistolero | — | Era I + `nexus_class_gunslinger`, por `GunId` | La Glock 17 conserva su papel de kit inicial. |
| SMG, escopetas y rifles básicos (`hk_mp5a5`, `uzi`, `ump45`, `vector45`, `p90`, `m870`, `spas_12`, `m1014`, `ak47`, `m16a1`, `kar98`) | TaCZ default gun pack | II | Pistolero | — | Era II + Pistolero, por `GunId` | Arsenal medio. |
| Rifles/LMG/precisión avanzados (`m4a1`, `m16a4`, `hk416d`, `g36k`, `aug`, `scar_l`, `scar_h`, `fn_fal`, `hk_g3`, `mk14`, `rpk`, `m249`, `fn_evolys`, `m700`, `ai_awp`) | TaCZ default gun pack | III | Pistolero | — | Era III + Pistolero, por `GunId` | Arsenal avanzado; estadísticas finales requieren runtime. |
| Armamento pesado/especial (`m107`, `m95`, `timeless50`, `minigun`, `rpg7`, `m320`, `aa12`) | TaCZ default gun pack | IV | Pistolero | — | Era IV + Pistolero, por `GunId` | Endgame, explosivos y antimaterial. |
| `tacz:ammo` con `AmmoId` y cargadores | TaCZ | I | GLOBAL para transporte; Pistolero para uso | — | No bloquear item base; tier por `AmmoId` si History Stages lo soporta | Munición debe poder recogerse, almacenarse y moverse. |
| `tacz:attachment` con miras, grips, bocachas y cargadores | TaCZ | II | Pistolero | — | Era II/III + Pistolero, por `AttachmentId` | Alta magnificación y accesorios especializados pasan a III. |
| `tacz:gun_smith_table` y bancos del default gun pack | TaCZ | I | GLOBAL | — | Colocación global; acceso de arsenal guiado por quests | No bloquear construcción ni almacenamiento mediante el banco. |
| Ejes, engranajes, cajas, manivela, ruedas, molino, fan, prensa, sierra y taladro | Create | I | GLOBAL | — | Era I global | Mecánica inicial accesible a todas las clases. |
| Mixer/basin, deployer, crafter, crushing wheels, fluidos, redstone links, gantries y elevadores | Create | II | GLOBAL | — | Era II global | Automatización intermedia. |
| Brass, precision mechanism, arm, speed controller, blaze burner, steam engine, trenes y schematicannon | Create | III | GLOBAL | — | Era III global, dividido en subhitos | Industria avanzada; no necesita una nueva era. |
| Connectors, wire spools, rolling mill, brass/electrum rods | Create Crafts & Additions | II | GLOBAL | — | Era II global | Infraestructura eléctrica inicial. |
| `electric_motor`, `alternator`, `modular_accumulator`, `digital_adapter` | Create Crafts & Additions | III | GLOBAL | — | Era III global | Producción, almacenamiento y control industrial avanzados; IDs confirmados en `CABlocks`. |
| `tesla_coil`, `portable_energy_interface` | Create Crafts & Additions | IV | GLOBAL | — | Era IV global | Alta tensión e integración energética de contraptions; IDs confirmados en `CABlocks`. |
| Relics de movilidad/supervivencia (`amphibian_boot`, `aqua_walker`, `horse_flute`, `ice_skates`, `roller_skates`, `spider_necklace`) | Relics | II | MULTICLASE | — | Era II global; obtención natural | No hacerlas exclusivas por estilo sin evidencia. |
| Relics de combate/defensa (`bastion_ring`, `holy_locket`, `rage_glove`, `reflection_necklace`, `scarab_talisman`, `slime_heart`) | Relics | III | MULTICLASE | — | Era III global | El sistema de leveling del propio mod forma parte del balance. |
| Relics de alto poder (`soul_devourer`, `space_dissector`, `stellar_catalyst`, `shadow_glaive`, `enders_hand`) | Relics | IV | PENDIENTE DE DECISIÓN | — | Era IV; clase solo tras prueba individual | `shadow_glaive` es candidato Guerrero, no asignación automática. |
| Eyes, cores, shards y materiales de invocación/progresión | L_Ender's Cataclysm | III | GLOBAL | — | Era III/IV mediante quests de boss | Llaves y materiales deben conservar pickup/almacenamiento. |
| `ignitium_*`, `cursium_*`, `black_steel_*`, gauntlets, `ancient_spear`, `infernal_forge`, `void_forge` y demás equipo de boss | L_Ender's Cataclysm | IV | MULTICLASE | — | Era IV global; PENDIENTE DE DECISIÓN por objeto | No convertir todos los drops melee en Guerrero; respetar identidad de loot. |
| `knight_sword`, `large_sword`, `warrior_sword`, shields, gauntlets y armaduras de dragon/knight | Block Factory's Bosses | III | MULTICLASE | — | Era III/IV; PENDIENTE DE DECISIÓN individual | Drops de boss; armas melee son candidatas Guerrero, no exclusivas todavía. |
| `earthdive_spear`, `gauntlet_blackstone`, `obsidian_heart`, `soul_star`, `ancient_anima`, `blazing_eye` | Bosses of Mass Destruction | III | MULTICLASE | — | Era III/IV global según boss | Artefactos reales del JAR; clasificar el tier final por encuentro. |
| `blowgun`, `naga_fang_dagger`, `spear`, `geomancer_*` | Mowzie's Mobs | II | MULTICLASE | — | Era II/III global | Equipo temprano/intermedio procedente de mobs y exploración. |
| `wrought_axe`, `wrought_helmet`, `earthrend_gauntlet`, `ice_crystal`, `sculptor_staff`, `sunblock_staff`, máscaras Umvuthana | Mowzie's Mobs | III | MULTICLASE | — | Era III/IV; PENDIENTE DE DECISIÓN | Poderes de boss; staff no implica automáticamente Arcanista. |
| Encuentro Wither mejorado | Wither: Reincarnated | IV | GLOBAL | — | Acceso de boss en Era IV, sin restricción de item propia | El JAR sustituye el combate y no registra drops jugables propios detectables. |
| `familiar_spellbook`, `familiar_tome`, shards, trinkets, soul curios y mejoras tier 1–3 | Alshanex's Familiars | II | MULTICLASE | — | Era II–IV por tier; PENDIENTE DE DECISIÓN de afinidad | Tiene temática mágica, pero no se hace exclusivo de Mago sin decisión. |
| Catálogo decorativo y herramientas de DecoCraft | DecoCraft | 0 / libre | GLOBAL | — | Sin restricción de era o clase | Construcción y decoración no deben bloquearse. |
| Sistema de agua/mundo | Dynamic Waters | 0 / libre | GLOBAL | — | Sin restricción | Worldgen/sistema global, no objeto de progresión. |
| Monturas y transporte del mod Horseman | Horseman | I | GLOBAL | — | Sin restricción de clase; quests opcionales | PENDIENTE DE DECISIÓN solo para equipamiento excepcional. |
| Equipo vanilla completo de diamante | Minecraft | II | GLOBAL | — | Stage global `nexus_era_2_diamond` existente | Herramientas, espada y armadura; materiales pasivos libres. |
| Equipo vanilla completo de netherite | Minecraft | IV | GLOBAL | — | Stage global `nexus_era_4_nexus` existente | Herramientas, espada y armadura; scrap/ingot/template permanecen transportables. |

## Estado de implementación de la primera capa

| Familia clasificada | Estado |
| --- | --- |
| Epic Fight por material: wooden/stone/iron, diamond y netherite | **IMPLEMENTADA** |
| Simply Swords por material: iron, diamond, runic y netherite | **IMPLEMENTADA** |
| Armaduras Nightfall `duskfire_*` y `ruinfighter_*` | **IMPLEMENTADA** |
| Grimorios Iron's Spells por tier I–IV | **IMPLEMENTADA** |
| Runas, upgrade orbs, armaduras mágicas y staffs clasificados | **IMPLEMENTADA** |
| Armas TaCZ inequívocas por `GunId`, agrupadas en tiers I–IV | **IMPLEMENTADA** |
| Create básico, automatización intermedia e industria avanzada | **IMPLEMENTADA** |
| Create Crafts & Additions: red básica, energía avanzada y alta tensión | **IMPLEMENTADA** |
| Equipo vanilla de diamante/netherite y cuchillos Farmer's Delight | **IMPLEMENTADA** (existente) |
| Munición y accesorios TaCZ; scrolls y skillbooks variables | **PENDIENTE NBT** |
| Armas únicas Simply Swords/Nightfall, Relics y drops de bosses | **PENDIENTE BALANCE** |
| Curios mágicos y Alshanex's Familiars | **PENDIENTE BALANCE** |
| Arcanista: 91 entradas inequívocas de Iron's Spells con Mage AND Arcanist | **IMPLEMENTADA** |
| Metalomante: grinder, vial, 16 flakes, coin bag, mistcloak y lerasium con Mage AND Metalomante | **IMPLEMENTADA** |
| Armas independientes `koloss_blade` y `obsidian_dagger` | **PENDIENTE BALANCE** |

La duplicación de un objeto exclusivo entre un stage global de era y su stage individual de clase es deliberada: expresa el requisito AND. No hay duplicados dentro de un mismo stage ni listeners propios de restricción.

## Distribución y subhitos

- Era I: fundamentos de clase, magia inicial, pistolas de servicio y mecánica básica.
- Era II: equipo de diamante, armamento intermedio, automatización, familiares y reliquias utilitarias.
- Era III: movesets/arsenal avanzados, Arcanista avanzado, industria de precisión y primeros ciclos de bosses.
- Era IV: netherite, endgame de cada clase, reliquias de alto poder y bosses finales.
- Era III se divide en `Arcano avanzado`, `Industria avanzada`, `Arsenal avanzado` y `Cacería de bosses`.
- Era IV se divide en `Acceso al Nexus`, `Endgame de clase`, `Reliquias`, `Bosses finales` y futura `Tecnología aérea`.

## Decisiones pendientes antes de implementar

1. Validar runtime de la selección Arcanista y la condición Mage AND Arcanist; la UI FancyMenu queda para otro pack.
2. Separar skillbooks Epic Fight/Nightfall y scrolls de Iron's por NBT, rareza o habilidad real.
3. Medir las armas únicas de Simply Swords y Nightfall para dividir Era III/IV.
4. Confirmar si History Stages puede filtrar de forma segura los NBT de TaCZ sin bloquear todos los guns/ammo/attachments base.
5. Clasificar individualmente relics y drops de boss después de probar poder, obtención y compatibilidad de clase.
6. Decidir si Alshanex's Familiars será global, multiclase o una afinidad de Mago.
7. Definir los subhitos de Create/Createaddition sin bloquear componentes necesarios para arrancar máquinas.
8. Validar runtime del ciclo de poderes nativos de Allomancy: ocho poderes base en Era III, Lerasium/Mistborn en Era IV y revocación al abandonar Metalomante.

## Contenido fuera de progresión o sin función útil

- `irons_spellbooks:dev_staff` y objetos de desarrollo/spawn/debug: fuera de campaña, solo administración.
- Spawn eggs, mob removers, modelos auxiliares y variantes internas: no son contenido de progresión.
- Boss Checklist y su addon: interfaz informativa global, sin restricciones.
- Clumps, Enchantment Descriptions, Shulker Box Tooltip, Cut Through, Freecam y herramientas de creación: QoL/desarrollo, siempre libres.
- FantasyWeapons permanece retirado y no se clasifica.
- Create Aeronautics no está instalado; Allomancy 4.6.5 sí está integrado como contenido exclusivo de Metalomante.
