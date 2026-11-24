// config.js — the bay's fixed facts: districts, ranks, weapons, cars,
// radio and the names the SBPD dispatch board cycles through. Every
// other module reads its numbers from here so the game stays tunable
// from one chair.

export const WORLD = {
  half: 380,          // the road grid runs -380..380 on both axes
  block: 95,          // one city block, kerb to kerb
  roadHalf: 11,       // asphalt half-width around each grid line
  sandFrom: 296,      // east of this the boulevard gives up to sand
  seaFrom: 388,       // and east of this the sand gives up to the bay
  shoreRoadZ: 190,    // the port shore road's grid line
  boulevardX: 285,    // the strand boulevard's grid line
};

export const DISTRICTS = [
  { name: "PANTAI SENJA", sub: "Strand Boulevard", turf: "NEUTRAL", x: 285, z: 40 },
  { name: "PASAR MALAM", sub: "Night Market", turf: "CONTESTED", x: -206, z: 118 },
  { name: "PELABUHAN", sub: "Senja Port", turf: "HOSTILE", x: 205, z: 245 },
  { name: "PUSAT KOTA", sub: "Downtown Senja", turf: "WATCHED", x: -10, z: 20 },
  { name: "KOTA LAMA", sub: "Old Town Grid", turf: "FRIENDLY", x: -110, z: -150 },
  { name: "BUKIT KAPUR", sub: "Chalk Hills", turf: "NEUTRAL", x: -230, z: -260 },
];

export const RANKS = [
  { at: 0, name: "RUNNER" },
  { at: 500, name: "COURIER" },
  { at: 1100, name: "FIXER" },
  { at: 2600, name: "OPERATOR" },
  { at: 4200, name: "KINGPIN" },
];

// Weapon table. `reserve` is the state.ammo key the HUD prints; the
// streak system in effects.js draws every shot these numbers fire.
export const WEAPONS = [
  { key: "fists", slot: 1, name: "FISTS", damage: 9, rate: 0.38, range: 2.1, reserve: null, auto: false, pellets: 1, spread: 0 },
  { key: "pistol", slot: 2, name: "P9 SIDEARM", damage: 16, rate: 0.30, range: 46, reserve: "pistol", auto: false, pellets: 1, spread: 0.004 },
  { key: "smg", slot: 3, name: "KEBUN SMG", damage: 11, rate: 0.105, range: 42, reserve: "smg", auto: true, pellets: 1, spread: 0.012 },
  { key: "shotgun", slot: 4, name: "12G LARAS", damage: 8, rate: 0.85, range: 24, reserve: "shotgun", auto: false, pellets: 5, spread: 0.05 },
];

export const CAR_FAMILIES = [
  { key: "coupe", name: "SENJA COUPE", len: 4.3, wid: 1.9, top: 34, accel: 13, grip: 3.4 },
  { key: "kijang", name: "KIJANG", len: 4.7, wid: 2.0, top: 27, accel: 9, grip: 2.6 },
  { key: "bemo", name: "BEMO", len: 3.6, wid: 1.7, top: 22, accel: 8, grip: 2.4 },
  { key: "pelo", name: "PELO GT", len: 4.5, wid: 2.0, top: 41, accel: 17, grip: 3.9 },
  { key: "cruiser", name: "SBPD CRUISER", len: 4.8, wid: 2.0, top: 38, accel: 15, grip: 3.4 },
];

export const CAR_PAINTS = [0xc23b2a, 0x2471a3, 0x2e8b6e, 0xd9a441, 0x707b7c, 0x7d3c98, 0xe8e4da, 0x148f77, 0xb03a5b, 0x2c3e50];

export const RADIO = [
  { name: "OMBAK FM", freq: "98.4", track: "Island Pop — Senja Selamanya" },
  { name: "OMBAK FM", freq: "98.4", track: "Gamelan Drive — Pelabuhan Dub" },
  { name: "OMBAK FM", freq: "98.4", track: "Kroncong Kota — Lampu Pasar" },
];

export const DISPATCH_PREFIXES = ["MARLIN", "TIDE", "CORAL", "TARPON", "PIER", "BULWARK"];
export const DISPATCH_TACTICS = ["RAMMING", "PURSUIT", "FLANKING", "ROADBLOCK"];
export const DISPATCH_LINES = [
  "Shots fired in Pelabuhan — repeat, shots fired. Units respond.",
  "Suspect vehicle is the orange Pelo — do not lose it on the Strand.",
  "All units, converge on the bay road. Air One is overhead.",
  "He is one man in a teal jacket. How is he still driving?",
  "Roadblock requested at the shore road junction. Roll it out.",
  "Dispatch copies — the Kerang crews are calling him backup. He IS the backup.",
];

export const CREW = [
  { key: "plates", name: "SINTA", role: "Driver", ability: "SWAP PLATES", keyLabel: "Z", cooldown: 45, color: "#d8493b", blurb: "Sinta • Driver" },
  { key: "fix", name: "BIMA", role: "Mechanic", ability: "QUICK FIX", keyLabel: "X", cooldown: 60, color: "#2e7fd9", blurb: "Bima • Mechanic" },
  { key: "eyes", name: "LARAS", role: "Lookout", ability: "EYES OUT", keyLabel: "C", cooldown: 75, color: "#2a9d8f", blurb: "Laras • Lookout" },
];

export const SAVE_KEY = "senja-bay-heat-save-v1";
export const DAY_START = 18 + 40 / 60; // the clock opens at 18:40, deep in the golden hour
