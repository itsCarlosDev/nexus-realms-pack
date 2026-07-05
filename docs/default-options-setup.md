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
6. Confirmar que Epic Fight Toggle Battle/Mining Mode queda Not Bound.
7. Confirmar que TaCZ Reload queda en `R`.
8. Confirmar que Iron's Spells Spell Wheel queda en `V` o `Z`.
9. Ejecutar en chat uno de estos comandos, segun exista:
   `/defaultoptions saveAll`
   o:
   `/defaultoptions saveKeys`
10. Cerrar Minecraft.
11. Revisar archivos generados en:
   `config/defaultoptions/`
12. Anadir solo archivos generados por Default Options, por ejemplo:
   `config/defaultoptions/keybindings.txt`
   u otros archivos internos de Default Options si el mod los genera.
13. Nunca anadir `options.txt` raiz.
14. Ejecutar:
   `packwiz refresh`
   `./scripts/dev-check.sh`

Si `config/defaultoptions/keybindings.txt` no existe, no crearlo manualmente. Debe salir de Default Options en Prism.

## Prueba

- Crear una instancia limpia o borrar la config local de prueba.
- Confirmar que los keybinds aparecen aplicados en primera carga.
- Confirmar que `R` recarga TaCZ.
- Confirmar que `Z` abre Spell Wheel.
- Confirmar que Epic Fight Toggle queda Not Bound.
- Confirmar que Air / `minecraft:air` quedo como Preferred Tool en Epic Fight Item Preferences.
- Confirmar que `J` abre JourneyMap.
- Confirmar que JEI usa `U` para recetas y `Y` para usos.
