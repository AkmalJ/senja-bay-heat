# Senja Bay Heat

[![make.fun gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/AkmalJ/senja-bay-heat/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/AkmalJ/senja-bay-heat/reward.svg)](https://make.fun/c/gta6-01)

An open-world crime game in a sunset-locked Indonesian port city, built for the [make.fun "Make GTA 6" bounty](https://make.fun/c/gta6-01). The sun over Senja Bay never finishes setting; the SBPD never finishes warming up its sirens.

You are **Raka** — off-white tee, deep teal jacket, the bay's hands. With Sinta (driver), Bima (mechanic) and Laras (lookout) behind you, work **8 story jobs** across six districts: the strand boulevard of Pantai Senja, the stall aisles of Pasar Malam, the container rows of Pelabuhan, Pusat Kota, Kota Lama and the chalk hills of Bukit Kapur. Lift cars, run from a wanted system with a live dispatch board, roadblocks and Air One overhead, duel the Kerang Boys between the containers, chase three street-race bests, and find the 12 hidden packages glowing in the corners nobody watches.

Gunfire is honest: no laser beams — bullets are short bright streaks that travel, brass casings spin out of the receiver, and a raised arm puts shoulder, gun and target on one line.

## Play it

```sh
node serve.ts        # then open http://localhost:8080
```

Static files only — `game/index.html` opens in desktop Chrome and plays offline; three.js is vendored under `game/vendor/`.

| Keys | |
| --- | --- |
| WASD / arrows | move / drive |
| Mouse | camera — click to shoot |
| E | enter / steal a car, use |
| Shift | sprint |
| 1–4 | fists / P9 Sidearm / Kebun SMG / 12G Laras |
| Z / X / C | crew abilities — Swap Plates, Quick Fix, Eyes Out |
| Space | handbrake |
| R | radio (Ombak FM 98.4) |
| TAB | the town map & ledger — *Peta Kota Senja Bay* |
| P / M | pause / mute |

Progress saves to the browser: money, respect rank, jobs, ammo, cars lifted, race bests and packages all ride along.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library. The screenshots are the game's own renders: the boulevard chase (cover), the port duel, the title vista, and the town board.
