# Pack 16.1 - Class Selection FancyMenu UI

## Objetivo

Crear un selector visual a pantalla completa para elegir:

- Guerrero
- Mago
- Pistolero

## Arquitectura

- KubeJS sigue siendo backend.
- FancyMenu sera frontend visual.
- El Custom GUI previsto se llama: `nexus_class_selection`.
- KubeJS intenta abrirlo con: `/openguiscreen nexus_class_selection <player>`.
- Si falla, queda fallback por chat.

## Assets

Rutas:

- `config/fancymenu/assets/nexus/class_selection/warrior.png`
- `config/fancymenu/assets/nexus/class_selection/mage.png`
- `config/fancymenu/assets/nexus/class_selection/gunslinger.png`

## Como crear el Custom GUI en Prism

1. Entrar al juego con la rama `experiment/class-selection`.
2. Abrir editor de FancyMenu.
3. Ir a Customization -> Custom GUIs -> Manage Custom GUIs.
4. Crear nuevo GUI con identificador: `nexus_class_selection`.
5. Crear layout full-screen.
6. Anadir fondo oscuro/transparente.
7. Anadir las 3 imagenes:
   - `warrior.png`
   - `mage.png`
   - `gunslinger.png`
8. Crear 3 botones o zonas clicables encima de cada imagen.
9. Accion del boton Guerrero: `/nexus_select warrior`.
10. Accion del boton Mago: `/nexus_select mage`.
11. Accion del boton Pistolero: `/nexus_select gunslinger`.
12. Guardar/exportar.
13. Copiar los archivos generados de `config/fancymenu` al repo.
14. Ejecutar `packwiz refresh`.

## Diseno recomendado

- Titulo: ELIGE TU CAMINO
- 3 columnas grandes.
- Tarjeta izquierda: Guerrero.
- Tarjeta central: Mago.
- Tarjeta derecha: Pistolero.
- Texto corto:
  - Guerrero: Combate cuerpo a cuerpo, armas pesadas y resistencia.
  - Mago: Hechizos, grimorios y poder arcano.
  - Pistolero: Armas de fuego, precision y supervivencia.

## Checklist de pruebas

- Entrar con jugador sin clase.
- Confirmar que aparece fallback por chat.
- Confirmar que FancyMenu intenta abrir `nexus_class_selection`.
- Elegir Guerrero desde comando.
- Elegir Guerrero desde boton cuando el GUI exista.
- Confirmar kit.
- Confirmar que no permite elegir dos veces.
- Salir y entrar.
- Confirmar que no se reabre.
- Reset admin.
- Repetir Mago.
- Repetir Pistolero.

## Pendiente

- Sustituir placeholders por arte final.
- Exportar layout real desde FancyMenu.
- Conectar FTB Quests por tags en Pack 16.2.
- No integrar Epic Fight todavia.

## Current template status

A first functional FancyMenu template has been created manually in Prism.

Status:
- The GUI opens.
- Buttons work.
- Buttons call:
  - `/nexus_select warrior`
  - `/nexus_select mage`
  - `/nexus_select gunslinger`
- KubeJS remains the only system that saves the class, gives kits and assigns tags.
- The current layout is a template, not final art.

Pending:
- Replace placeholder visuals.
- Improve full-screen layout.
- Add final class illustrations.
- Add confirmation step before choosing a class.
