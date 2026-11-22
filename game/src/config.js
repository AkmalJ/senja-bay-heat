// config.js — SENJA BAY HEAT: every tuning number, name and table in one place.
// The city, people, vehicles, story and words below are original to this game.

export const WORLD = {
  size: 760,
  block: 95,
  roadHalf: 11,
  walkSpeed: 7.2,
  sprintSpeed: 11.5,
  dayLength: 420,
};

export const DISTRICTS = [
  { name: "Pantai Senja", sub: "Strand Boulevard", x: 250, z: -40, r: 200, turf: "NEUTRAL" },
  { name: "Kota Lama", sub: "Old Town Grid", x: -60, z: -160, r: 200, turf: "FRIENDLY" },
  { name: "Pasar Malam", sub: "Night Market", x: -210, z: 130, r: 160, turf: "CONTESTED" },
  { name: "Pelabuhan", sub: "Senja Port", x: 190, z: 230, r: 180, turf: "HOSTILE" },
  { name: "Bukit Kapur", sub: "Chalk Hills", x: -230, z: -260, r: 170, turf: "NEUTRAL" },
  { name: "Pusat Kota", sub: "Downtown Senja", x: 30, z: 40, r: 180, turf: "WATCHED" },
];

export const WEAPONS = [
  { id: "fists", name: "FISTS", slot: 1, damage: 12, rate: 0.34, range: 2.8, ammo: Infinity, spread: 0, auto: false },
  { id: "pistol", name: "P9 SIDEARM", slot: 2, damage: 22, rate: 0.26, range: 60, ammo: 96, spread: 0.012, auto: false },
  { id: "smg", name: "KEBUN SMG", slot: 3, damage: 15, rate: 0.085, range: 55, ammo: 240, spread: 0.03, auto: true },
  { id: "shotgun", name: "12G LARAS", slot: 4, damage: 46, rate: 0.8, range: 26, ammo: 32, spread: 0.07, auto: false },
];

export const CAR_MODELS = [
  { name: "Kijang Sprint", top: 34, accel: 24, grip: 0.92, color: 0xd8493b },
  { name: "Senja Coupe", top: 44, accel: 30, grip: 0.95, color: 0x2e7fd9 },
  { name: "Pelo GT", top: 52, accel: 36, grip: 0.97, color: 0xf06423 },
  { name: "Angkot Van", top: 27, accel: 19, grip: 0.88, color: 0x37b24d },
  { name: "Taksi Senja", top: 36, accel: 25, grip: 0.93, color: 0xf5c518 },
  { name: "Bemo Pickup", top: 30, accel: 21, grip: 0.9, color: 0x9b59d0 },
  { name: "Senja Scooter", top: 31, accel: 27, grip: 0.9, color: 0xe9c46a },
  { name: "Kargo Box Truck", top: 26, accel: 16, grip: 0.86, color: 0xe8e4da },
];

export const CREW = [
  { key: "KeyZ", name: "Sinta", role: "Driver", ability: "SWAP PLATES", desc: "Fresh plates: wanted level stops climbing for 20 s", cooldown: 45 },
  { key: "KeyX", name: "Bima", role: "Mechanic", ability: "QUICK FIX", desc: "Patch the car you are in back to 70% condition", cooldown: 40 },
  { key: "KeyC", name: "Laras", role: "Lookout", ability: "EYES OUT", desc: "Police and the objective are marked through walls for 15 s", cooldown: 35 },
];

export const RADIO = [
  { freq: "98.4", name: "OMBAK FM", track: "Island Pop — Senja Selamanya" },
  { freq: "101.2", name: "RADIO PASAR", track: "Dangdut Koplo — Goyang Pelabuhan" },
  { freq: "88.9", name: "KAPUR ROCK", track: "Garage Rock — Bukit Kapur Kids" },
];

// Eight story jobs. Stage kinds: goto, chase (wreck the target car),
// clear (drop N hostiles), deliver (reach a point, in a car for later jobs),
// escape (lose the police after reaching the wanted level), collect (crates).
export const MISSIONS = [
  {
    title: "FIRST FARE", giver: "Sinta", giverRole: "DRIVER — CREW",
    intro: "Raka, that orange Pelo by the strand is ours on paper. The valet disagrees. Take it, shake the noise, bring it home.",
    stages: [
      { kind: "goto", label: "Reach the orange Pelo GT on Strand Boulevard", x: 268, z: -95, r: 9 },
      { kind: "escape", label: "Lose the police", want: 2 },
      { kind: "deliver", label: "Deliver the Pelo to Sinta's lockup in Kota Lama", x: -120, z: -190, r: 10 },
    ],
    reward: 2400, respect: 120,
  },
  {
    title: "MARKET SQUEEZE", giver: "Laras", giverRole: "LOOKOUT — CREW",
    intro: "The Kerang Boys are taxing our stalls at Pasar Malam again. Walk in, make the aisle remember who Senja Bay belongs to.",
    stages: [
      { kind: "goto", label: "Enter Pasar Malam on foot", x: -205, z: 120, r: 12 },
      { kind: "clear", label: "Clear the aisles — drop the Kerang Boys", count: 5, x: -205, z: 130, r: 55 },
      { kind: "escape", label: "Melt away — lose the police", want: 2 },
    ],
    reward: 3100, respect: 160,
  },
  {
    title: "REPO RODEO", giver: "Pak Haji Oman", giverRole: "DINER OWNER — FAMILY",
    intro: "Shake them off before I close the gate, nak. I will not buy a car with sirens on it — the bank took my nephew's coupe, so take it back.",
    stages: [
      { kind: "goto", label: "Lift the bank coupe at Pusat Kota", x: 45, z: 60, r: 9 },
      { kind: "chase", label: "Wreck the repo truck before it reaches the port", x: 150, z: 190 },
      { kind: "deliver", label: "Bring a car to Oman's diner in Kota Lama", x: -80, z: -120, r: 10 },
    ],
    reward: 3900, respect: 200,
  },
  {
    title: "PORT RUNNER", giver: "Bima", giverRole: "MECHANIC — CREW",
    intro: "Three crates walked off a freighter at Pelabuhan and the harbour master is counting slowly. Grab them before he learns arithmetic.",
    stages: [
      { kind: "goto", label: "Drive to the Senja Port gates", x: 185, z: 215, r: 12 },
      { kind: "collect", label: "Collect the marked crates", count: 3, x: 205, z: 245, r: 70 },
      { kind: "deliver", label: "Drop the crates at Bima's workshop, Pasar Malam", x: -160, z: 90, r: 10 },
    ],
    reward: 4600, respect: 240,
  },
  {
    title: "HILLSIDE LEDGER", giver: "Laras", giverRole: "LOOKOUT — CREW",
    intro: "A bookkeeper on Bukit Kapur keeps the Kerang Boys' ledger in his boot. His escort drives fast. His brakes, I hear, do not.",
    stages: [
      { kind: "goto", label: "Reach the Bukit Kapur lookout", x: -225, z: -250, r: 12 },
      { kind: "chase", label: "Stop the bookkeeper's car", x: -140, z: -180 },
      { kind: "deliver", label: "Bring the ledger to Laras at Pantai Senja", x: 240, z: -30, r: 10 },
    ],
    reward: 5400, respect: 280,
  },
  {
    title: "SIRENS AT DUSK", giver: "Sinta", giverRole: "DRIVER — CREW",
    intro: "The SBPD captain runs a rolling roadblock drill at dusk for the cameras. Steal the show: cross the whole bay with five stars watching.",
    stages: [
      { kind: "goto", label: "Trigger the drill — reach the downtown junction", x: 10, z: 10, r: 12 },
      { kind: "escape", label: "Survive and lose a full five-star response", want: 5 },
      { kind: "deliver", label: "Vanish to the strand safehouse", x: 285, z: -60, r: 10 },
    ],
    reward: 6800, respect: 340,
  },
  {
    title: "THE LONG TABLE", giver: "Pak Haji Oman", giverRole: "DINER OWNER — FAMILY",
    intro: "Both crews sit at my long table tonight, and neither trusts the other's drivers. Clear the port road so the talk can happen.",
    stages: [
      { kind: "goto", label: "Reach the port road, Pelabuhan", x: 150, z: 200, r: 12 },
      { kind: "clear", label: "Clear the port road blockade crews", count: 6, x: 165, z: 215, r: 60 },
      { kind: "deliver", label: "Escort the talk — reach Oman's diner", x: -80, z: -120, r: 10 },
    ],
    reward: 7900, respect: 400,
  },
  {
    title: "SENJA HEAT", giver: "Sinta", giverRole: "DRIVER — CREW",
    intro: "One last run, Raka. The Regent — the fastest car in the bay — leaves on the ferry at dawn. It leaves with us, or not at all.",
    stages: [
      { kind: "goto", label: "Reach the ferry pier, Pantai Senja", x: 300, z: 40, r: 12 },
      { kind: "chase", label: "Wreck the Regent before it reaches the hills", x: 60, z: -140 },
      { kind: "escape", label: "Lose the police — the whole bay is watching", want: 4 },
      { kind: "deliver", label: "Bring the story home to the strand safehouse", x: 285, z: -60, r: 10 },
    ],
    reward: 12000, respect: 600,
  },
];

export const RANKS = [
  { at: 0, name: "DOCK HAND" },
  { at: 300, name: "RUNNER" },
  { at: 800, name: "WHEELMAN" },
  { at: 1500, name: "FIXER" },
  { at: 2600, name: "SHOT CALLER" },
  { at: 4200, name: "BAY LEGEND" },
];

// Street races: drive into a green gate to start, then chase the gold
// checkpoint pillars in order. The last pillar is the finish line.
export const RACES = [
  {
    name: "STRAND SPRINT", start: { x: 285, z: 190 }, par: 50, reward: 1500, respect: 60,
    checkpoints: [
      { x: 285, z: 95 }, { x: 285, z: 0 }, { x: 285, z: -95 },
      { x: 285, z: -190 }, { x: 190, z: -190 }, { x: 95, z: -190 },
    ],
  },
  {
    name: "DOWNTOWN LOOP", start: { x: 95, z: 95 }, par: 50, reward: 1800, respect: 80,
    checkpoints: [
      { x: 95, z: 0 }, { x: 95, z: -95 }, { x: 0, z: -95 },
      { x: -95, z: -95 }, { x: -95, z: 0 }, { x: -95, z: 95 },
    ],
  },
  {
    name: "PORT RUN", start: { x: 190, z: 285 }, par: 50, reward: 2200, respect: 100,
    checkpoints: [
      { x: 285, z: 285 }, { x: 285, z: 190 }, { x: 190, z: 190 },
      { x: 95, z: 190 }, { x: 95, z: 285 }, { x: 190, z: 285 },
    ],
  },
];

// Hidden packages: glowing crates tucked around the bay — the beach, the
// pier, the market aisles, the port gate, the hills lookout and more.
export const PACKAGE_SPOTS = [
  [330, -150], [432, 40], [-248, 109], [-160, 200], [185, 172], [250, -40],
  [47, 47], [-250, -272], [310, 120], [-285, -95], [95, -285], [-190, -200],
];
export const PACKAGE_REWARD = 350;
export const PACKAGE_BONUS = 2500;

export const SAVE_KEY = "senja-bay-heat-save-v1";
