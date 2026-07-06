# Nexus Realms Creator Tools

## Pack 17.0 scope

Pack 17.0 adds creator-friendly tools that are safe for the normal Nexus Realms pack:

- CMDCam
- CreativeCore
- Not Enough Animations
- Emotecraft
- AmbientSounds 6
- Sound Physics Remastered
- Simple Voice Chat

## Normal pack rules

These mods are allowed in the normal playable pack because they improve trailers, ambience, animations, roleplay and recording without giving unfair exploration advantages.

## Creator-only instance

The following tools must stay outside the normal pack and should be used only in a separate `Nexus Realms Creator` Prism instance:

- Freecam
- ReForgedPlay
- Distant Horizons
- Embeddium
- Oculus
- Shaders

## Why Freecam is not in the normal pack

Freecam is useful for cinematic recording and build inspection, but in multiplayer it can reveal caves, bases, chests, structures, mobs and dungeons. For that reason it should not be shipped to all players in the normal pack.

## Why ReForgedPlay is creator-only

ReForgedPlay is useful for replay-style recording, but it is more delicate than simple client-side visual mods and may require FFmpeg for rendering. It should be tested in a separate creator instance before being considered for wider use.

## Why Distant Horizons and shaders are creator-only

Distant Horizons, Oculus and shaders can be excellent for trailers, but they increase complexity, loading time and GPU/CPU usage. They should be kept out of the normal pack until the gameplay pack is stable.

## Testing checklist

1. Start Nexus Realms from Prism.
2. Join a test world.
3. Create a simple CMDCam path around a build.
4. Test a camera path around Warrior, Mage and Gunslinger.
5. Test Not Enough Animations in third person.
6. Test Emotecraft with armor and weapons.
7. Test AmbientSounds in forest, cave, dungeon and village.
8. Test Sound Physics in cave/dungeon.
9. Test Simple Voice Chat in LAN/server if available.
10. Check `latest.log` for errors related to cmdcam, creativecore, emotecraft, ambient sounds, sound physics and voice chat.

## Pack 18.0 visual layer

Pack 18.0 adds the resource-pack foundation used by creator recordings:

- Fresh Animations plus validated addons.
- LowOnFire for cleaner first-person footage.
- EMF/ETF instead of OptiFine.
- Resource-pack order documented in `docs/resource-pack-order.md`.

Do not use creator-only tools such as Freecam, ReForgedPlay, Distant Horizons, Oculus or shaders as a requirement for the normal Pack 18.0 visual layer.
