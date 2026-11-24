# Senja Bay Heat

An original open-world crime game in the spirit of GTA 6, built for make.fun's
`gta6-01` bounty. One sun-soaked Indonesian bay city — Senja Bay — explored on
foot and by car, with traffic and pedestrians, cars to steal, a five-star
wanted system (patrol cars that ram and flank, roadblocks, foot units and the
Air One helicopter), eight story jobs, four weapons, a crew with three
abilities, a HUD with a live minimap, a start screen and a saved game.
Gunfire is physical: bullets fly as short streaks with fading trails, and
every shot ejects a spent brass casing that spins, falls and fades.

The city, characters, vehicles, names, story, art, sound and music are all
original to this game. Every sound is synthesised with WebAudio; the only
library is three.js, vendored minified under `game/vendor/`.

[![bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/AkmalJ/senja-bay-heat/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/AkmalJ/senja-bay-heat/reward.svg)](https://make.fun/bounty/gta6-01)

## Play

```
node serve.ts
```

then open http://localhost:8080 in a desktop browser. No build step and no
network: everything the game loads lives under `game/`.

## Controls

- **WASD / arrows** — walk / drive
- **Mouse** — camera (click the game to lock the pointer), **click** — shoot
- **E** — enter / steal / exit a car
- **Shift** — sprint, **Space** — handbrake
- **1–4** — weapons (Fists, P9 Sidearm, Kebun SMG, 12G Laras)
- **Z / X / C** — crew abilities: Sinta's Swap Plates, Bima's Quick Fix, Laras's Eyes Out
- **R** — radio station, **P** — pause, **M** — mute

## The bay

Six districts: Pantai Senja (the strand and pier), Pusat Kota (downtown),
Kota Lama (the old grid and Sinta's lockup), Pasar Malam (the night market),
Pelabuhan (the port, its cranes and crates) and Bukit Kapur (the chalk hills).
Eight jobs from Sinta, Laras, Bima and Pak Haji Oman take Raka from a first
stolen Pelo GT to the Regent, the fastest car in the bay. Respect raises his
rank from Dock Hand to Bay Legend; progress, money, ammo and unlocks save to
the browser automatically after every job.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` via `vendor/makefun-game.ts`
- `serve.ts` — a small static server for local play
- `game/src/config.js` — every tuning number, district, weapon, car, crew
  member, radio station and all eight mission scripts
- `game/src/city.js` — Senja Bay itself: road grid, lit city blocks, the
  strand and ocean, the night market, port cranes, palms, streetlights,
  collision and district lookup
- `game/src/actors.js` — low-poly builders for cars, people and the
  helicopter, plus mission crates and the objective marker
- `game/src/missions.js` — the eight-job campaign as a stage machine
  (goto / chase / clear / collect / deliver / escape)
- `game/src/hud.js` — mission and SBPD dispatch panels, weapon slots, crew
  abilities, dialogue, speed cluster and the circular minimap
- `game/src/audio.js` — WebAudio synthesis: engine, sirens, shots, impacts
  and a generative island-pop radio loop
- `game/src/main.js` — the loop: player, driving, traffic, pedestrians,
  police response, combat, day cycle, saving
- `game/src/shots.js` — the four staged screenshot scenes (`?stage=`)
- `screenshots/` — four real renders of the game, staged by `shots.js`
  through the URLs listed in `shots.json`
