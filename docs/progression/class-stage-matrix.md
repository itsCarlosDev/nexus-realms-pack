# Matriz de stages de clase de Nexus Realms

La clase guardada en `player.persistentData.nexus_class` continúa siendo la fuente de verdad. History Stages 5.4.0 aplica las restricciones y el puente KubeJS conserva exactamente un stage individual por jugador.

| Clase | Stage individual | Era I | Era II | Era III | Era IV |
| --- | --- | --- | --- | --- | --- |
| Guerrero | `nexus_class_warrior` | `simplyswords:iron_glaive` | `simplyswords:diamond_glaive` | `epicfight:diamond_greatsword` | `simplyswords:netherite_glaive` |
| Mago | `nexus_class_mage` | `irons_spellbooks:copper_spell_book` | `irons_spellbooks:diamond_spell_book` | `irons_spellbooks:dragonskin_spell_book` | `irons_spellbooks:netherite_spell_book` |
| Pistolero | `nexus_class_gunslinger` | `tacz:modern_kinetic_gun` (`GunId: tacz:glock_17`) | `tacz:modern_kinetic_gun` (`GunId: tacz:hk_mp5a5`) | `tacz:modern_kinetic_gun` (`GunId: tacz:m4a1`) | `tacz:modern_kinetic_gun` (`GunId: tacz:m107`) |

Cada entrada anterior también figura en el stage global de su era. History Stages evalúa ambos ámbitos de forma independiente: para usar el objeto deben estar desbloqueados tanto la era como la clase.

## Sincronización y seguridad

- Seleccionar una clase elimina los dos stages incompatibles y añade el stage correcto mediante la API persistente de History Stages.
- Resetear la clase elimina los tres stages.
- El login reconcilia una sola vez el stage con la clase guardada.
- No existen listeners propios de bloqueo, comprobaciones por tick ni manipulación de inventario.
- Se permiten `place`, `pickup`, `loot`, `recipe`, `gui` e `icon`; History Stages bloquea `equip`, `attack`, `break` y `use` mientras falte un requisito.

## Subhitos futuros

- Guerrero: fundamentos marciales, armamento reforzado, movesets avanzados y arsenal del Nexus.
- Mago: iniciación, dominio de hechizos, arcano avanzado y grimorios del Nexus.
- Pistolero: arma de servicio, arsenal medio, arsenal avanzado y tirador de élite.
- Metalurgista sigue siendo una especialización posterior del Mago; no es una cuarta clase.

## Especialización Metalurgista

| Clase base | Especialización | Stage adicional | Era mínima | Hito |
| --- | --- | --- | ---: | --- |
| Mago | Metalurgista (`metallurgist`) | `nexus_specialization_metallurgist` | III | La Senda del Metal |

Metalurgista conserva `nexus_class_mage`; el stage de especialización se añade encima y nunca lo sustituye. El stage está definido sin objetos hasta identificar inequívocamente el proyecto oficial de Allomancy. Guerrero, Pistolero, un reset de clase o una especialización residual incoherente eliminan únicamente el estado y stage de Metalurgista, sin manipular inventarios.

## Contenido NO clasificado todavía

- Simply Swords fuera de los tres glaives representativos.
- Resto de Epic Fight, Nightfall y Avalon.
- Resto de Iron's Spells, incluidas armaduras, curios y staffs.
- Resto de TaCZ, munición, accesorios y bancos.
- Reliquias y armas especiales.
- Equipo procedente de bosses.
- Create más allá de los tres componentes representativos.
- Create Aeronautics.

La clasificación masiva queda fuera de Pack 26.0 hasta validar en runtime la muestra AND de era y clase.
