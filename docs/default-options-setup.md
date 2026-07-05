# Default Options Setup for Nexus Realms

## Objetivo

Default Options se usara para distribuir keybinds iniciales del modpack sin versionar `options.txt`.

## No versionar

No se debe anadir:

- `options.txt` raiz;
- configuraciones personales de video;
- configuraciones personales de audio;
- sensibilidad, FOV u otras preferencias locales del desarrollador.

## Flujo recomendado

1. Instalar o actualizar el pack en Prism.
2. Arrancar Minecraft.
3. Entrar a Controls.
4. Configurar keybinds segun `docs/keybinds-plan.md`.
5. Resolver todos los conflictos rojos.
6. Ejecutar en chat uno de estos comandos, segun exista:
   `/defaultoptions saveAll`
   o:
   `/defaultoptions saveKeys`
7. Cerrar Minecraft.
8. Revisar archivos generados en:
   `config/defaultoptions/`
9. Anadir solo archivos generados por Default Options, por ejemplo:
   `config/defaultoptions/keybindings.txt`
   u otros archivos internos de Default Options si el mod los genera.
10. Nunca anadir `options.txt` raiz.
11. Ejecutar:
   `packwiz refresh`
   `./scripts/dev-check.sh`
12. Hacer el commit posterior en un pack separado:
   `Pack 16.6.1 - Commit Default Keybinds`

## Prueba

- Crear una instancia limpia o borrar la config local de prueba.
- Confirmar que los keybinds aparecen aplicados en primera carga.
- Confirmar que `R` recarga TaCZ.
- Confirmar que `Z` abre Spell Wheel.
- Confirmar que Epic Fight Toggle queda Not Bound.
- Confirmar que `J` abre JourneyMap.
- Confirmar que JEI usa `U` para recetas y `Y` para usos.
