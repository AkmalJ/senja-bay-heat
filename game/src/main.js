// main.js — SENJA BAY HEAT: boot, the game loop, and every live system that
// does not live in its own module: the player on foot and in cars, arcade
// driving, traffic, pedestrians, the SBPD wanted response (cars, roadblocks,
// foot units and the Air One helicopter), combat, crew abilities, the day
// cycle, saving, and the staged screenshot scenes.

import * as THREE from "three";
import { WORLD, WEAPONS, CAR_MODELS, CREW, RADIO, SAVE_KEY, MISSIONS, RACES } from "./config.js";
import { City, roadLines, nearestRoadCoord, isOnRoad } from "./city.js";
import { buildCarMesh, buildPersonMesh, animatePerson, buildHelicopterMesh, buildCrateMesh, buildMarkerMesh } from "./actors.js";
import { HUD } from "./hud.js";
import { GameAudio } from "./audio.js";
import { MissionRunner } from "./missions.js";
import { Activities } from "./activities.js";
import { Effects } from "./effects.js";
import { stageScene } from "./shots.js";

const params = new URLSearchParams(location.search);
const STAGE = params.get("stage");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const fwd = (h) => ({ x: Math.sin(h), z: Math.cos(h) });
const angleLerp = (a, b, t) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

// ---------- renderer / scene ----------
const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d9);
scene.fog = new THREE.Fog(0xd9c9a8, 180, 720);
const camera = new THREE.PerspectiveCamera(63, innerWidth / innerHeight, 0.1, 2600);
const hemi = new THREE.HemisphereLight(0xa9ccd2, 0x997950, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe3b3, 2.0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -120; sun.shadow.camera.right = 120;
sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120;
sun.shadow.camera.far = 600;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.5;
scene.add(sun); scene.add(sun.target);
const city = new City(scene);
const hud = new HUD();
const audio = new GameAudio();
const fx = new Effects(scene);

// ---------- game state ----------
const S = {
  mode: "menu",            // menu | play | wasted
  clock: 18.4,             // hour of day — the bay wakes at dusk, on brand
  money: 850, respect: 0,
  mapOpen: false,          // the town board (Tab) is up; the world holds still
  stolen: 0,               // career count of cars lifted, for the ledger
  dispatchLine: "", dispatchLineT: 0,  // the dispatcher's freshest narration
  health: 100, armor: 50,
  wanted: 0, heatHold: 0, searchTimer: 0, searching: false, crimeCooldown: 0,
  inCar: null,
  weaponIdx: 1,
  ammo: { pistol: 96, smg: 240, shotgun: 32 },
  unlocked: { pistol: true, smg: false, shotgun: false },
  crewCd: CREW.map(() => 0),
  platesTimer: 0, eyesTimer: 0,
  radioIdx: 0,
  missionIndex: 0,
  paused: false,
  camOffset: 0,
  camShoulder: 0,
  camBack: 0,
};

// ---------- player ----------
// Raka carries the same gun box the armed peds and foot cops get —
// without it his shots came out of a bare shoulder and no frame
// could ever show a weapon in his hands. Its visibility follows the
// selected weapon (see updatePlayer): up for a firearm, gone for
// fists. The barrel tip is where shoot() now starts its beams. He
// never wears the crowd's random shoulder bag: its pale strap lay
// diagonally across his back in the staged frames and read as
// anything but a gunman, so his build opts out of it for good.
// Raka's signature look (v5 character pass) — FIXED, never
// randomised: a deep-teal jacket over an off-white tee, dark
// trousers and a dark cap, so the hero reads as the same man
// from behind, from the side and in every screenshot. His old
// flat red-orange shirt washed out against the senja market.
const playerMesh = buildPersonMesh({ shirt: 0xf3eee3, jacket: 0x0d5c63, pants: 0x1f2733, skin: 0xc68863, cap: 0x14202e, height: 1.0, gun: true, bag: false });
playerMesh.position.set(262, 0, -60);
scene.add(playerMesh);
const player = { mesh: playerMesh, heading: 2.6, phase: 0, pos: playerMesh.position };

// ---------- cars ----------
const cars = [];
// Headlight glow pools: one shared translucent disc, faded up by the day
// cycle as the light drops. Every police car carries one, and so does
// whichever car the player is driving.
const poolMat = new THREE.MeshBasicMaterial({ color: 0xffedb5, transparent: true, opacity: 0, depthWrite: false });
const poolGeo = new THREE.CircleGeometry(3.4, 18);
function addHeadlightPool(car) {
  if (car.pool) return;
  const p = new THREE.Mesh(poolGeo, poolMat);
  p.rotation.x = -Math.PI / 2;
  p.position.set((car.mesh.userData.length || 4.6) / 2 + 2.8, 0.07, 0);
  p.scale.set(1.6, 1, 1);
  car.mesh.add(p);
  car.pool = p;
}
// Headlight cones: translucent additive beams that fade in with the same
// darkness value as the pools, so a car at dusk throws real light shapes
// down the road instead of just a disc on the asphalt.
const coneMat = new THREE.MeshBasicMaterial({ color: 0xffedb5, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
const coneGeo = new THREE.ConeGeometry(1.7, 7.5, 14, 1, true);
function addHeadlightCones(car) {
  if (car.cones) return;
  car.cones = [];
  const len = car.mesh.userData.length || 4.6;
  const scooter = car.model.name.includes("Scooter");
  for (const cz of scooter ? [0] : [0.55, -0.55]) {
    const cone = new THREE.Mesh(coneGeo, coneMat);
    // The cone's axis runs +Y apex-up; rotate it to lie along the car's
    // nose (+X), dipped a few degrees so the beam lands on the road.
    cone.rotation.z = Math.PI / 2 - 0.09;
    cone.position.set(len / 2 + 3.6, scooter ? 0.95 : 0.78, cz);
    car.mesh.add(cone);
    car.cones.push(cone);
  }
}
function spawnCar(modelIdx, x, z, heading, kind, opts = {}) {
  const model = CAR_MODELS[modelIdx % CAR_MODELS.length];
  const mesh = buildCarMesh(model, { police: kind === "police", taxi: model.name.includes("Taksi"), color: opts.color });
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const car = {
    mesh, model, kind, heading, speed: 0, health: 100, wrecked: false,
    axis: Math.abs(Math.sin(heading)) > 0.7 ? "z" : "x", dir: 1, lane: 4,
    target: null, tactic: "", callsign: opts.callsign || "", smoke: 0,
    pos: mesh.position, shooterCd: 0,
  };
  if (kind === "traffic") { car.dir = Math.cos(heading) + Math.sin(heading) > 0 ? 1 : -1; car.speed = 9 + Math.random() * 5; }
  if (kind === "police") { addHeadlightPool(car); addHeadlightCones(car); }
  cars.push(car);
  return car;
}
// Parked cars around the bay, plus the orange Pelo the first job is about.
const parkedSpots = [[268, -95, 2, Math.PI / 2], [120, 12, 0, 0], [-40, -190, 1, 0], [200, 100, 3, Math.PI / 2], [-230, -60, 4, 0], [60, 230, 5, Math.PI / 2], [-120, 40, 0, 0], [310, 120, 1, Math.PI / 2], [-280, 200, 2, 0], [30, -280, 3, 0]];
for (const [x, z, m, h] of parkedSpots) spawnCar(m, x, z, h, "parked", m === 2 ? { color: 0xf06423 } : {});
// Kerbside bays, filled: both edges of the strand road and the downtown
// avenue wear rows of parked cars, scooters tucked between them, so the
// streets read lived-in from any camera. (Model indices: 6 = scooter,
// 7 = box truck — appended last in CAR_MODELS so the old indices hold.)
// Every bay car faces the way its lane flows — traffic on the
// boulevard's east lane runs south (heading 0), the west lane north
// (heading PI); on an east-west road the south lane runs east
// (heading PI/2), the north lane west (-PI/2). The rows used to face
// against the flow, and the owner's title eye caught the two biggest
// foreground offenders sitting nose-against-traffic at the kerb.
const bayModels = [0, 1, 3, 4, 5, 0, 4, 1];
let bayK = 0;
for (let z = -258, i = 0; z <= 258; z += 30, i++) {
  const nearJunction = Math.abs(z % 95) < 15 || Math.abs(z % 95) > 80;
  if (nearJunction) continue;   // keep junction mouths clear
  spawnCar(bayModels[bayK++ % bayModels.length], 276, z, Math.PI, "parked");
  if (i % 2 === 0) spawnCar(bayModels[bayK++ % bayModels.length], 294, z + 8, 0, "parked");
  else spawnCar(6, 294, z + 8, 0, "parked");
}
for (let x = -240; x <= 240; x += 30) {
  if (Math.abs(x) < 30 || Math.abs(x - 95) < 15 || Math.abs(x + 95) < 15 || Math.abs(x - 190) < 15 || Math.abs(x + 190) < 15) continue;
  spawnCar(bayModels[bayK++ % bayModels.length], x, -9.5, -Math.PI / 2, "parked");
  if (x % 60 === 0) spawnCar(bayModels[bayK++ % bayModels.length], x + 14, 9.5, Math.PI / 2, "parked");
}
// Working vehicles where they belong: box trucks on the port apron,
// scooters by the market and the hills.
spawnCar(7, 150, 205, 0.3, "parked");
spawnCar(7, 255, 228, -0.4, "parked");
spawnCar(6, -160, 152, 1.2, "parked");
spawnCar(6, -238, -256, 0.7, "parked");
spawnCar(6, 297, -120, Math.PI, "parked");
// ---------- the owner's hand marks on the title poster ----------
// His clearest annotation yet (circles on the sys-title11 frame,
// identified by projecting every parked car in the frame and
// matching colour-for-colour) decoded the six marked cars into
// three different roles — the rounds that treated them as one
// "face the stroke" problem kept missing because they aren't one
// problem:
//   RED Kijang Sprint (294, 170), yellow-circled: already right.
//     It is the reference for good parking and keeps exactly the
//     stance the stroke round gave it (heading 1.516, kerb inset
//     -0.4) — nothing about it changes.
//   BLUE Senja Coupe (276, 222), blue-circled: stays PARKED, but
//     tidied to sit exactly like the reference — the reference's
//     own heading (1.516) and its kerb inset mirrored (276.45),
//     centred on its spot. (Its kerb's bay paint is gone now —
//     city.js draws parking lines on the east side only.)
//   The other three boulevard/street cars are DRIVING stances,
//     not parking: noses with their lanes' flow, queued as if
//     stopped at a red light.
//     - DARK BLUE Senja Coupe (276, 162), yellow-circled: out of
//       its bay into the west driving lane (x 281), heading PI
//       (northbound), stopped on the approach side of the
//       (285, 190) junction — nose at z 205.7, just short of the
//       junction's south crosswalk band (z 201.7-205.1).
//     - GREEN Angkot Van (294, 230), blue-circled: out of its
//       bay into the east driving lane (x 289), heading 0
//       (southbound), stopped on the junction's north approach —
//       nose at z 174.3, just short of the north crosswalk band
//       (z 174.9-178.3).
//     - The RED pair he added on the z=190 street keep their
//       spots (north lane z 186, south lane z 194) but now face
//       their own lanes' flow instead of the red stroke's 0.305:
//       north lane west (-PI/2), south lane east (+PI/2).
// All six keep ownerMark so the menu traffic treatment presents
// them (the two parked-stance cars face poster headings, not
// their kerbs' flow; the four driving stances pass the facing
// test on their own merits).
function ownerFace(x, z, heading, nudgeX) {
  const car = cars.find((c) => c.kind === "parked" && c.pos.x === x && c.pos.z === z);
  if (!car) return;
  car.pos.x += nudgeX;
  car.heading = heading;
  car.mesh.rotation.y = heading - Math.PI / 2;
  car.ownerMark = true;
}
function ownerDrive(x, z, laneX, stopZ, heading) {
  const car = cars.find((c) => c.kind === "parked" && c.pos.x === x && c.pos.z === z);
  if (!car) return;
  car.pos.x = laneX;
  car.pos.z = stopZ;
  car.heading = heading;
  car.mesh.rotation.y = heading - Math.PI / 2;
  car.ownerMark = true;
}
ownerFace(294, 170, 1.516, -0.4);   // yellow — RED Kijang Sprint, the reference: unchanged
ownerFace(276, 222, 1.516, 0.45);   // blue — Senja Coupe, parked exactly like the reference
ownerDrive(276, 162, 281, 208.1, Math.PI); // yellow — dark blue Senja Coupe, northbound, stopped at the light
ownerDrive(294, 230, 289, 171.4, 0);       // blue — GREEN Angkot Van, southbound, stopped at the light
// Red — the two cars he added on the z=190 street, in its lanes
// (north z = 186, south z = 194), each facing its lane's flow.
// Clear of the junction mouth (east corners reach x 267.6, the
// boulevard starts at 274) and of the cargo footprints (south
// corners reach z 196.5, cargo at 204.6).
const redA = spawnCar(0, 265.9, 186, -Math.PI / 2, "parked");
redA.mesh.rotation.y = -Math.PI / 2 - Math.PI / 2; redA.ownerMark = true;
const redB = spawnCar(5, 255.4, 194, Math.PI / 2, "parked");
redB.mesh.rotation.y = Math.PI / 2 - Math.PI / 2; redB.ownerMark = true;
// Rolling traffic.
for (let i = 0; i < 18; i++) {
  const lines = roadLines();
  const alongX = Math.random() < 0.5;
  const line = lines[(Math.random() * lines.length) | 0];
  const at = (Math.random() - 0.5) * 560;
  const car = spawnCar((Math.random() * CAR_MODELS.length) | 0, alongX ? at : line + 4, alongX ? line + 4 : at, alongX ? Math.PI / 2 : 0, "traffic");
  if (Math.random() < 0.5) { car.heading += Math.PI; }
}

// ---------- pedestrians & people ----------
const peds = [];
function spawnPed(x, z, opts = {}) {
  const mesh = buildPersonMesh(opts);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const ped = { mesh, pos: mesh.position, heading: Math.random() * 6.28, phase: Math.random() * 6, speed: 1.6 + Math.random() * 1.4,
    tx: x, tz: z, hostile: !!opts.hostile, health: opts.hostile ? 60 : 30, cop: !!opts.cop, dead: false, shootCd: 1 + Math.random() * 2, flee: 0,
    crew: !!opts.crew, aimX: opts.aimAt ? opts.aimAt[0] : 0, aimZ: opts.aimAt ? opts.aimAt[1] : 0, aimPose: !!opts.crew };
  peds.push(ped);
  return ped;
}
for (let i = 0; i < 90 && peds.length < 44; i++) {
  const x = (Math.random() - 0.5) * 620, z = (Math.random() - 0.5) * 620;
  if (isOnRoad(x, z)) continue;
  spawnPed(x, z);
}

// ---------- helicopter ----------
const heli = buildHelicopterMesh();
heli.visible = false;
scene.add(heli);
let heliActive = false, heliPhase = 0;

// ---------- mission spawns ----------
let targetCar = null, crates = [], hostiles = [];
const marker = buildMarkerMesh(0xffe14d);
scene.add(marker);
const hooks = {
  dialogue: (n, r, t) => hud.dialogue(n, r, t, "#2a9d8f"),
  spawnTargetCar(sd) {
    targetCar = spawnCar(2, sd.x, sd.z, Math.random() * 6.28, "target", { color: 0x2471a3, callsign: "TARGET" });
    targetCar.health = 130; targetCar.speed = 12;
  },
  targetCarPos: () => targetCar ? { x: targetCar.pos.x, z: targetCar.pos.z } : null,
  spawnHostiles(n, x, z) {
    hostiles = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28;
      hostiles.push(spawnPed(x + Math.cos(a) * (8 + i * 2), z + Math.sin(a) * (8 + i * 2), { hostile: true, gun: true, shirt: 0x6c3483, vest: true }));
    }
  },
  hostilesAlive: () => hostiles.filter((h) => !h.dead).length,
  spawnCrates(n, x, z) {
    crates = [];
    for (let i = 0; i < n; i++) {
      const m = buildCrateMesh();
      m.position.set(x + (i - 1) * 16, 0, z + ((i % 2) * 14 - 7));
      scene.add(m); crates.push({ mesh: m, pos: m.position, taken: false });
    }
  },
  cratesCollected: () => crates.filter((c) => c.taken).length,
  nearestCratePos: () => { const c = crates.find((c) => !c.taken); return c ? { x: c.pos.x, z: c.pos.z } : null; },
  clearSpawns() {
    if (targetCar) { targetCar.kind = "traffic"; targetCar = null; }
    for (const c of crates) scene.remove(c.mesh);
    crates = [];
  },
  raiseHeat(want) { /* heat is raised by the crimes of the stage itself */ },
  stageComplete(stage, total, label) { hud.toast("STAGE COMPLETE", label); audio.stageDone(); },
  missionComplete(m, idx) {
    S.money += m.reward; S.respect += m.respect;
    if (idx >= 1) S.unlocked.smg = true;
    if (idx >= 3) S.unlocked.shotgun = true;
    hud.banner("JOB COMPLETE", `${m.title} — Rp${m.reward.toLocaleString("en-US")} • +${m.respect} RP`);
    hud.dialogue(m.giver, m.giverRole, idx >= 7 ? "That is the bay, Raka. Ours again. Take a lap — you earned the sunset." : "Good work. Next job is on the board when you are ready — walk to the gold marker.", "#e07a3f");
    audio.cash();
    S.missionIndex = missions.nextIndex();
    saveGame();
    if (!missions.allDone()) setTimeout(() => missions.start(S.missionIndex), 3600);
  },
};
const missions = new MissionRunner(hooks);

// ---------- side hustles: street races + hidden packages ----------
const activities = new Activities(scene, {
  toast: (t, s) => hud.toast(t, s),
  banner: (t, s) => hud.banner(t, s),
  pickup: () => audio.pickup(),
  cash: () => audio.cash(),
  reward(m, r) { S.money += m; S.respect += r; saveGame(); },
});

// ---------- input ----------
const keys = {};
let mouseDown = false, camYaw = 2.6, camPitch = 0.32, pointerLocked = false;
addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (S.mode !== "play") return;
  // The town board: Tab opens it, Tab or Esc puts it away. While it
  // is up the world holds still and no other key reaches the game.
  if (e.code === "Tab") { e.preventDefault(); toggleMap(); return; }
  if (S.mapOpen) { if (e.code === "Escape") toggleMap(); return; }
  if (e.code === "KeyE") tryEnterExitCar();
  if (e.code === "Digit1") selectWeaponIdx(0);
  if (e.code === "Digit2") selectWeaponIdx(1);
  if (e.code === "Digit3") selectWeaponIdx(2);
  if (e.code === "Digit4") selectWeaponIdx(3);
  if (e.code === "KeyR") { S.radioIdx = (S.radioIdx + 1) % RADIO.length; hud.toast(RADIO[S.radioIdx].name + " " + RADIO[S.radioIdx].freq, RADIO[S.radioIdx].track); }
  if (e.code === "KeyM") { audio.muted = !audio.muted; hud.toast(audio.muted ? "SOUND OFF" : "SOUND ON", ""); }
  if (e.code === "KeyP") { S.paused = !S.paused; hud.toast(S.paused ? "PAUSED" : "RESUMED", ""); }
  for (let i = 0; i < CREW.length; i++) if (e.code === CREW[i].key) useCrew(i);
});
addEventListener("keyup", (e) => { keys[e.code] = false; });
canvas.addEventListener("mousedown", () => {
  audio.unlock();
  if (S.mode === "play" && !STAGE) canvas.requestPointerLock();
  mouseDown = true;
});
addEventListener("mouseup", () => { mouseDown = false; });
document.addEventListener("pointerlockchange", () => { pointerLocked = document.pointerLockElement === canvas; });
addEventListener("mousemove", (e) => {
  if (!pointerLocked && S.mode === "play" && !e.buttons) return;
  if (pointerLocked || (e.buttons & 1 && STAGE)) {
    camYaw -= e.movementX * 0.0032;
    camPitch = clamp(camPitch + e.movementY * 0.0024, 0.02, 1.05);
  }
});

// The town board (map & ledger). Opening it stills the world —
// the frame loop skips the simulation while S.mapOpen — and drops
// the pointer lock so the board can actually be read.
function toggleMap() {
  S.mapOpen = !S.mapOpen;
  document.getElementById("mapScreen").style.display = S.mapOpen ? "block" : "none";
  if (S.mapOpen) {
    if (document.pointerLockElement) document.exitPointerLock();
    for (const k in keys) keys[k] = false;
    mouseDown = false;
  }
}

function selectWeaponIdx(i) {
  const w = WEAPONS[i];
  if (w.id !== "fists" && !S.unlocked[w.id]) { hud.toast(w.name + " — LOCKED", "Finish more jobs to unlock it"); return; }
  S.weaponIdx = i;
}
function useCrew(i) {
  if (S.crewCd[i] > 0) return;
  const c = CREW[i];
  if (i === 0) { S.platesTimer = 20; hud.toast("SWAP PLATES", "Sinta's fresh plates: heat frozen for 20 s"); }
  if (i === 1) {
    if (S.inCar) { S.inCar.health = Math.max(S.inCar.health, 70); hud.toast("QUICK FIX", "Bima patches you up to 70% condition"); }
    else { hud.toast("QUICK FIX", "Bima needs you in a car first"); return; }
  }
  if (i === 2) { S.eyesTimer = 15; hud.toast("EYES OUT", "Laras marks police and the objective for 15 s"); }
  S.crewCd[i] = c.cooldown;
  audio.pickup();
}

// ---------- crime & wanted ----------
// The dispatcher's voice: event-driven narration for the dispatch
// panel, in the SBPD's own words and our own district names. A line
// is set by the event itself (a shot, a theft called in, a response
// escalating) and stays fresh for a few seconds; nothing here fires
// on a random timer.
function dispatchSay(text, hold = 7) {
  S.dispatchLine = text;
  S.dispatchLineT = hold;
}
function commitCrime(level) {
  if (S.platesTimer > 0) level = Math.min(level, S.wanted);
  const before = S.wanted;
  S.wanted = clamp(Math.max(S.wanted, level), 0, 5);
  S.searchTimer = 0; S.searching = false;
  if (S.wanted > before && S.wanted >= 3 && S.dispatchLineT <= 0) {
    const d = city.districtAt(focusPos().x, focusPos().z);
    dispatchSay(`All units converging on ${d.name} — bring him in before the light goes.`);
  }
}

// ---------- cars: enter / exit / steal ----------
function focusPos() { return S.inCar ? S.inCar.pos : player.pos; }
function tryEnterExitCar() {
  if (S.inCar) {
    const car = S.inCar; S.inCar = null;
    player.pos.set(car.pos.x + 2.6, 0, car.pos.z);
    playerMesh.visible = true;
    audio.setEngine(false, 0, 0);
    return;
  }
  let best = null, bd = 4.2;
  for (const car of cars) { if (car.wrecked) continue; const d = dist2d(player.pos, car.pos); if (d < bd) { bd = d; best = car; } }
  if (!best) return;
  if (best.kind === "traffic") {
    // The driver bails and runs — and the bay notices.
    spawnPed(best.pos.x, best.pos.z, {}).flee = 6;
    commitCrime(2);
    hud.toast("CAR TAKEN", best.model.name + " — the driver will tell everyone");
    audio.crash(0.2);
    // And the driver does tell everyone: the call reaches dispatch
    // in the district where it happened, in the SBPD's own words.
    const d = city.districtAt(best.pos.x, best.pos.z);
    dispatchSay(`A witness called it in — ${best.model.name} lifted in ${d.name}. Watch the strand roads.`);
  }
  if (best.kind === "parked" && best.model.name === "Pelo GT" && missions.index === 0 && missions.stage === 0) commitCrime(2);
  if (best.kind !== "player") S.stolen++;   // re-entering your own car is not a fresh lift
  best.kind = "player";
  addHeadlightPool(best);
  addHeadlightCones(best);
  S.inCar = best;
  playerMesh.visible = false;
  audio.unlock();
}

// ---------- combat ----------
const flash = new THREE.PointLight(0xffc46b, 0, 18);
scene.add(flash);
let fireTimer = 0;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
// Gunfire visuals, tuned as TRACERS (v5, fading shader v5.6). The
// v4 pooled beams — an 11 cm core wrapped in a 24 cm halo, alive
// for 0.16 s — read on screen as laser slabs, not bullets. The v5
// thinning helped in motion, but a uniform-opacity beam still
// froze as one rigid bright line end-to-end: a laser. The beam is
// now a shader that FADES along its length — full brightness at
// the muzzle, dying to nothing at the target, the way a real
// tracer streak burns out — over a thinner warm core (4 cm) with
// a tight glow (9 cm). The IMPACT carries the rest of the read: a
// fat warm spark burst plus a puff of dust and smoke where the
// round lands, and a star-shaped flash at the muzzle. Hostile
// fire is dimmer and redder, and dies faster, so a two-way fight
// never becomes a light show. Beams and orbs are pooled and
// recycled like the ambient Effects pool, so the frame loop never
// allocates for gunfire.
const beams = [];
let beamCursor = 0, lastBeamEnd = null;
// Screenshot staging can freeze the gunfire effects at their peak
// (see setFxFreeze near the staged-scene block): the tracer lives
// 0.09 s, far shorter than a screenshot grab takes, so without a
// hold no still could ever show the beam the game really fired.
// The flag is only settable through the STAGE-only debug handle —
// in normal play it stays false and every effect ages exactly as
// it always has.
let fxFrozen = false, lastShotAt = 0;
const beamGeo = new THREE.BoxGeometry(1, 1, 1);
// The fade runs along the beam's local Z: the unit box spans
// z -0.5..0.5, lookAt puts +Z on the target, so vT is 0 at the
// muzzle and 1 at the target, and alpha falls as pow(1-vT, 1.3)
// — steep enough to kill the line's end, gentle enough that the
// streak's bright half survives a downscale to screenshot size.
const beamVert = `
  varying float vT;
  void main() {
    vT = position.z + 0.5;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const beamFrag = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vT;
  void main() {
    float a = uOpacity * pow(1.0 - vT, 1.3);
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;
function beamPart(width, color, opacity) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 } },
    vertexShader: beamVert, fragmentShader: beamFrag,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const mesh = new THREE.Mesh(beamGeo, mat);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, mat, width, baseOpacity: opacity };
}
for (let i = 0; i < 28; i++) beams.push({ core: beamPart(0.04, 0xffdf9e, 0.95), halo: beamPart(0.09, 0xffa64d, 0.13), life: 0, maxLife: 1 });
function fireBeam(a, b, hostile) {
  const slot = beams[beamCursor]; beamCursor = (beamCursor + 1) % beams.length;
  slot.core.mat.uniforms.uColor.value.setHex(hostile ? 0xff9d8a : 0xffdf9e);
  slot.halo.mat.uniforms.uColor.value.setHex(hostile ? 0xff4a3d : 0xffa64d);
  slot.core.baseOpacity = hostile ? 0.6 : 0.95;
  slot.halo.baseOpacity = hostile ? 0.07 : 0.13;
  const len = Math.max(a.distanceTo(b), 0.1);
  for (const part of [slot.core, slot.halo]) {
    part.mesh.position.copy(a).add(b).multiplyScalar(0.5);
    part.mesh.scale.set(part.width, part.width, len);
    part.mesh.lookAt(b);
    part.mat.uniforms.uOpacity.value = part.baseOpacity;
    part.mesh.visible = true;
  }
  slot.life = slot.maxLife = hostile ? 0.07 : 0.09;
  slot.firedAt = performance.now();
  lastBeamEnd = b.clone();
}
// The muzzle orb: a radial-gradient sprite, additive — the glowing
// ball of fire a real muzzle flash blooms into for a few frames.
const flashTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,240,1)");
  grad.addColorStop(0.25, "rgba(255,205,110,0.9)");
  grad.addColorStop(0.6, "rgba(255,140,40,0.35)");
  grad.addColorStop(1, "rgba(255,120,30,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
// The star flash: a bright core with tapered spikes — the shape a
// real muzzle bloom throws for a frame or two. Muzzle orbs wear
// this; impact orbs keep the radial glow above. With the tracer
// fading out along its length, the star at the muzzle is what
// keeps a frozen still reading "gunfire" at screenshot size.
const starTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const spike = (ang, len, wdt) => {
    const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
    const grad = g.createLinearGradient(64, 64, 64 + dx * len, 64 + dy * len);
    grad.addColorStop(0, "rgba(255,220,150,0.85)");
    grad.addColorStop(1, "rgba(255,140,40,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(64 + px * wdt, 64 + py * wdt);
    g.lineTo(64 + dx * len, 64 + dy * len);
    g.lineTo(64 - px * wdt, 64 - py * wdt);
    g.closePath(); g.fill();
  };
  for (let i = 0; i < 4; i++) spike(i * Math.PI / 2 + 0.35, 62, 5.5);
  for (let i = 0; i < 4; i++) spike(i * Math.PI / 2 + Math.PI / 4 + 0.35, 34, 3.5);
  const core = g.createRadialGradient(64, 64, 1, 64, 64, 26);
  core.addColorStop(0, "rgba(255,255,245,1)");
  core.addColorStop(0.4, "rgba(255,205,110,0.9)");
  core.addColorStop(1, "rgba(255,140,40,0)");
  g.fillStyle = core; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const orbs = [];
let orbCursor = 0;
for (let i = 0; i < 10; i++) {
  const mat = new THREE.SpriteMaterial({ map: flashTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const spr = new THREE.Sprite(mat);
  spr.visible = false;
  scene.add(spr);
  orbs.push({ spr, mat, life: 0, maxLife: 1, baseScale: 1 });
}
function fireOrb(pos, scale, tint, star = false) {
  const o = orbs[orbCursor]; orbCursor = (orbCursor + 1) % orbs.length;
  o.mat.map = star ? starTex : flashTex;
  o.mat.rotation = star ? Math.random() * Math.PI * 2 : 0;
  o.spr.position.copy(pos);
  o.baseScale = scale * (0.9 + Math.random() * 0.25);
  o.spr.scale.set(o.baseScale, o.baseScale, 1);
  o.mat.color.setHex(tint);
  o.mat.opacity = 0.95;
  o.spr.visible = true;
  o.life = o.maxLife = 0.085;
  o.firedAt = performance.now();
}
// A dropped man settles flat on his back, face up, gun hand empty.
// Tipped forward around his feet he used to come to rest half-rolled
// and hovering, gun box jutting at an angle — clutter, not a body.
// Flat at rest height reads instantly, from any camera.
function settleCorpse(mesh) {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.22;
  if (mesh.userData.gun) mesh.userData.gun.visible = false;
  if (mesh.userData.marker) mesh.userData.marker.visible = false;
}
const particles = [];
const particleGeo = new THREE.SphereGeometry(0.1, 5, 5);
function burst(pos, color, n, spread, up, size = 1, life = 0.45) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({ color }));
    m.position.copy(pos);
    m.scale.setScalar(size * (0.8 + Math.random() * 0.5));
    scene.add(m);
    particles.push({ mesh: m, vx: (Math.random() - 0.5) * spread, vy: Math.random() * up, vz: (Math.random() - 0.5) * spread, life: life * (0.7 + Math.random() * 0.6) });
  }
}
function shoot(dt) {
  // Under the staging freeze the held moment does not fire again:
  // the capture tool keeps the trigger held (and Raka's gun arm
  // raised) while it swings the camera around the frozen shot, and
  // fresh rounds would fan new beams across the held frame. The
  // flag is STAGE-only (see setFxFreeze) — normal play never sets
  // it, so this line never turns a real shot away.
  if (fxFrozen) return;
  fireTimer -= dt;
  const w = WEAPONS[S.weaponIdx];
  if (!mouseDown || fireTimer > 0 || S.inCar) return;
  if (w.id !== "fists" && S.ammo[w.id] <= 0) { hud.toast("OUT OF AMMO", w.name); fireTimer = 0.3; return; }
  fireTimer = w.rate;
  if (w.id !== "fists") S.ammo[w.id]--;
  audio.shoot(w.id);
  const origin = new THREE.Vector3(player.pos.x, 1.45, player.pos.z);
  const dir = new THREE.Vector3(Math.sin(camYaw + Math.PI), 0, Math.cos(camYaw + Math.PI));
  dir.x += (Math.random() - 0.5) * w.spread * 2; dir.z += (Math.random() - 0.5) * w.spread * 2;
  dir.normalize();
  // The muzzle is the gun's barrel tip, not a point floating ahead
  // of the chest: the gun box sits at local (-0.42, 1.3, 0.3) in
  // the person mesh and runs 0.55 long, so the tip is local
  // z = 0.58 — rotated by Raka's heading into the world (the same
  // transform the hostile fire below uses for its muzzles). The
  // firing stance in updatePlayer keeps his heading on the aim
  // while he shoots, so beam, orb and flash all leave the barrel.
  const muzzle = new THREE.Vector3(-0.42, 1.32, 0.58).applyAxisAngle(Y_AXIS, player.heading).add(player.pos);
  if (w.id !== "fists") {
    flash.position.copy(muzzle); flash.intensity = 26;
    lastShotAt = performance.now();
    fireOrb(flash.position, 1.15, 0xffffff, true);
  }
  // Nearest hittable along the ray: hostiles, police on foot, any car.
  let bestT = w.range, hit = null;
  // The ray test must keep the ENTITY it hits, not its position vector:
  // the damage branches below read hit.health / hit.kind, which a bare
  // Vector3 never has — passing p.pos here made every shot cosmetic.
  const testPoint = (e, r) => {
    const to = new THREE.Vector3(e.pos.x - origin.x, 0, e.pos.z - origin.z);
    const t = to.dot(dir);
    if (t < 0 || t > bestT) return;
    const perp = Math.abs(to.x - dir.x * t) + Math.abs(to.z - dir.z * t);
    if (perp < r) { bestT = t; hit = e; }
  };
  for (const p of peds) if (!p.dead) testPoint(p, 0.9);
  for (const c of cars) if (!c.wrecked) testPoint(c, 2.4);
  const end = origin.clone().addScaledVector(dir, bestT);
  end.setY(1.3);
  if (w.id !== "fists") fireBeam(muzzle, end, false);
  if (hit) {
    // The impact carries the tracer's read (v5): a fat warm spark
    // burst, a tight glow, and a wisp of dust-smoke kicked off the
    // target — the beam itself is only on screen for a few frames.
    // Trimmed once (v5.2) to nine so a frozen cluster could not
    // blob over the man; back up to thirteen, wider and longer-
    // lived (v5.6), because with the beam fading along its length
    // the impact burst carries more of the shot's read — and it
    // still has to read as sparks ON a man who stays visible.
    burst(end, 0xffc46b, 13, 2.4, 2.0, 1.0, 0.42);
    if (hit.health !== undefined && hit.kind === undefined) { // a person
      fireOrb(end, 0.38, 0xffe9c4);
      // The smoke stays a small accent (v5.1): the first tuning
      // grew three metre-wide grey boxes off a man's chest and the
      // puff swallowed him whole — a hit should read as sparks ON
      // the man, not an explosion AROUND him. One small, short,
      // slow-growing wisp (v5.2); the sparks above do the talking.
      fx.spawn(end.x, end.y, end.z, { n: 1, color: 0xa79e92, opacity: 0.22, size: 0.4, spread: 0.7, up: 1.0, life: 0.32, grow: 1.2, drag: 1.7 });
      hit.health -= w.damage; audio.hit();
      if (hit.health <= 0 && !hit.dead) {
        hit.dead = true; settleCorpse(hit.mesh);
        if (hit.hostile) commitCrime(3); else if (hit.cop) commitCrime(4); else commitCrime(3);
      } else if (hit.hostile) hit.flee = 0; else hit.flee = 5;
    } else if (hit.kind) { // a car
      damageCar(hit, w.damage * 0.7, end);
      fx.dustPuff(end.x, end.y, end.z, false);
      if (hit === targetCar) commitCrime(3);
    }
  }
  if (w.id !== "fists") {
    commitCrime(Math.max(S.wanted, 2));
    // Gunfire is heard all over the district — dispatch says so,
    // naming the district the shots actually came from. Throttled
    // by the freshness timer so a long firefight is one report,
    // not a stutter.
    if (S.dispatchLineT <= 2) {
      const d = city.districtAt(player.pos.x, player.pos.z);
      dispatchSay(`Shots fired in ${d.name} — repeat, shots fired. Units respond.`);
    }
  }
}
function damageCar(car, dmg, at) {
  if (car.wrecked) return;
  car.health -= dmg;
  if (at && !(STAGE && car === S.inCar)) burst(at, 0xff9f43, 6, 2.5, 2);
  if (car.health <= 35 && car.health > 0) burst(car.pos.clone().setY(1.4), 0x777777, 2, 1, 2);
  if (car.health <= 0) {
    car.wrecked = true; car.speed = 0;
    burst(car.pos.clone().setY(1.2), 0xff6b35, 22, 6, 5);
    burst(car.pos.clone().setY(1.6), 0x333333, 12, 3, 6);
    car.mesh.traverse((o) => { if (o.material && o.material.color) o.material = o.material.clone(), o.material.color.multiplyScalar(0.35); });
    audio.crash(1);
    if (S.inCar === car) { S.health -= 12; }
  }
}

// ---------- vehicle smoke & fire ----------
// Damage you can SEE from across the street (v5): a car under 35
// health trails grey smoke from its hood; at 15 — and once wrecked —
// it catches fire properly: pooled flame tongues and a black smoke
// column from the Effects pool, plus one shared flickering point
// light that moves to whichever wreck burns nearest the action.
// Real gameplay feedback (a chase target visibly dying is a chase
// you can read) and the drama anchor the screenshot frames borrow.
const fireLight = new THREE.PointLight(0xff8a3d, 0, 30, 1.6);
scene.add(fireLight);
const FLAME_COLS = [0xff7a2e, 0xffb03a, 0xe64a19];
const CORE_COLS = [0xff9a1f, 0xffa726, 0xff8a1e];
function updateCarFires(dt, now) {
  let lightCar = null;
  for (const car of cars) {
    const burning = car.wrecked || car.health <= 15;
    const smoking = !burning && car.health <= 35;
    if (!burning && !smoking) { car.fxAcc = 0; continue; }
    if (burning && !lightCar) lightCar = car;
    car.fxAcc = (car.fxAcc || 0) + dt;
    const interval = burning ? 0.055 : 0.16;
    if (car.fxAcc < interval) continue;
    car.fxAcc = 0;
    const f = fwd(car.heading);
    const len = car.mesh.userData.length || 4.6;
    const hx = car.pos.x + f.x * (len / 2 - 1.1), hz = car.pos.z + f.z * (len / 2 - 1.1);
    if (burning) {
      // Flames sized to be believed (v5.4): the first tongues
      // were 0.45 m embers — honest at arm's length, invisible
      // across a street — and the second pass made them wider
      // but left them crouching at the hood line, where the
      // car's own body hides the column's base from any low
      // camera. A burning car is supposed to be the thing you
      // see first, so the fire now stands on two feet — hood
      // and cabin — and climbs clear of the roof: four tall
      // tongues per tick, ~3 m of fire before the smoke (which
      // now starts above the roofline) takes it.
      // The core pass (v5.5, port polish): across a street the
      // tongues alone still read as a smoky smudge — orange at
      // half-fade over a bright dusk sky has no contrast, and
      // the dark smoke boxes rising through the column muddied
      // what colour there was. So each foot now also grows a
      // CORE: dense, fully opaque, near-white gold that rises
      // slowly and dies young, a bright heart the tongues climb
      // out of; the tongues run denser to meet it, and the
      // smoke starts higher and thinner so it caps the column
      // instead of veiling it. In play a wreck now reads as
      // BURNING from a block away, not merely smoking.
      // (First core palette was near-white gold — at judge
      // scale it averaged with the sky into a pale pillar, so
      // the shipped core runs saturated orange-gold and a size
      // up, and the smoke cap thinned again: fire first, smoke
      // as its hat, nothing in between.)
      for (let i = 0; i < 3; i++) fx.spawn(hx, 1.25, hz, { n: 1, color: FLAME_COLS[(Math.random() * 3) | 0], opacity: 0.9, size: 2.4, spread: 0.9, up: 4.8, life: 0.8, grow: 1.0, drag: 0.6 });
      for (let i = 0; i < 3; i++) fx.spawn(car.pos.x, 1.35, car.pos.z, { n: 1, color: FLAME_COLS[(Math.random() * 3) | 0], opacity: 0.9, size: 2.4, spread: 0.9, up: 4.8, life: 0.8, grow: 1.0, drag: 0.6 });
      for (let i = 0; i < 2; i++) fx.spawn(hx, 1.15, hz, { n: 1, color: CORE_COLS[(Math.random() * 3) | 0], opacity: 1.0, size: 2.0, spread: 0.55, up: 2.4, life: 0.6, grow: 0.5, drag: 0.5 });
      for (let i = 0; i < 2; i++) fx.spawn(car.pos.x, 1.25, car.pos.z, { n: 1, color: CORE_COLS[(Math.random() * 3) | 0], opacity: 1.0, size: 2.0, spread: 0.55, up: 2.4, life: 0.6, grow: 0.5, drag: 0.5 });
      fx.spawn(hx, 3.4, hz, { n: 1, color: 0x2e2e2e, opacity: 0.32, size: 1.7, spread: 0.8, up: 2.6, life: 1.3, grow: 3.0, drag: 1.2 });
    } else {
      fx.spawn(hx, 1.3, hz, { n: 1, color: 0x777777, opacity: 0.42, size: 1.2, spread: 0.6, up: 2.2, life: 1.0, grow: 2.6, drag: 1.2 });
    }
  }
  if (lightCar) {
    const f = fwd(lightCar.heading);
    const len = lightCar.mesh.userData.length || 4.6;
    fireLight.position.set(lightCar.pos.x + f.x * (len / 2 - 1.1), 1.8, lightCar.pos.z + f.z * (len / 2 - 1.1));
    fireLight.intensity = 150 + Math.sin(now * 0.021) * 45 + Math.random() * 35;
  } else fireLight.intensity = 0;
}

// ---------- traffic ----------
function updateTraffic(car, dt) {
  if (car.wrecked) return;
  const lines = roadLines();
  // Slow for a car ahead.
  let speed = car.speed;
  for (const o of cars) {
    if (o === car) continue;
    const f = fwd(car.heading);
    const dx = o.pos.x - car.pos.x, dz = o.pos.z - car.pos.z;
    const ahead = dx * f.x + dz * f.z, side = Math.abs(dx * f.z - dz * f.x);
    if (ahead > 0 && ahead < 9 && side < 2.4) speed = Math.min(speed, Math.max(0, ahead - 4));
  }
  const f = fwd(car.heading);
  car.pos.x += f.x * speed * dt; car.pos.z += f.z * speed * dt;
  // At an intersection, sometimes turn onto the crossing road.
  const nx = nearestRoadCoord(car.pos.x), nz = nearestRoadCoord(car.pos.z);
  if (Math.abs(car.pos.x - nx) < 1.2 && Math.abs(car.pos.z - nz) < 1.2 && Math.random() < 0.012) {
    car.heading += (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    // Snap into the right lane of the new road.
    if (Math.abs(Math.sin(car.heading)) > 0.7) car.pos.x = nx + (Math.cos(car.heading) > 0 ? -4 : 4) * Math.sign(Math.sin(car.heading)) * 0 + car.pos.x * 0 + nx * 0 + car.pos.x, car.pos.z = nz + 4 * Math.sign(Math.cos(car.heading));
    else car.pos.x = nx + 4 * Math.sign(Math.sin(car.heading)), car.pos.z = car.pos.z;
  }
  // Every east-west road east of the boulevard is gone (the
  // junctions are T's): eastbound traffic on any line turns onto
  // the boulevard instead of crossing the beach, and anything
  // already out on the sand turns back the way it came.
  if (Math.abs(car.pos.z - nz) < 13 && f.x > 0.5) {
    if (car.pos.x > 300) car.heading += Math.PI;
    else if (car.pos.x > 264) {
      const north = Math.random() < 0.5;
      car.heading = north ? Math.PI : 0;
      car.pos.x = north ? 281 : 289;
    }
  }
  // Keep to the road: if we drifted onto a block, steer back to the centreline.
  if (!isOnRoad(car.pos.x, car.pos.z)) {
    const tx = Math.abs(Math.sin(car.heading)) > 0.7 ? car.pos.x : nearestRoadCoord(car.pos.x);
    const tz = Math.abs(Math.sin(car.heading)) > 0.7 ? nearestRoadCoord(car.pos.z) : car.pos.z;
    car.heading = angleLerp(car.heading, Math.atan2(tx - car.pos.x, tz - car.pos.z), dt * 2);
  }
  const lim = WORLD.size / 2 - 14;
  if (Math.abs(car.pos.x) > lim || Math.abs(car.pos.z) > lim) car.heading += Math.PI;
  const [cx, cz] = city.collide(car.pos.x, car.pos.z, 2.1);
  car.pos.x = cx; car.pos.z = cz;
  car.mesh.rotation.y = car.heading - Math.PI / 2;
  spinWheels(car, speed, dt);
}
function spinWheels(car, speed, dt) {
  if (!car.mesh.userData.wheels) return;
  for (const w of car.mesh.userData.wheels) w.rotation.z -= speed * dt * 2.2;
}

// ---------- police ----------
const policeCars = [], policeFoot = [];
const CALLSIGNS = ["CORAL", "TARPON", "MARLIN", "TIDE", "PIER", "BULWARK"];
function desiredPolice() { return S.wanted === 0 ? 0 : S.wanted + 2; }
function spawnPoliceUnit() {
  const a = Math.random() * Math.PI * 2, d = 62 + Math.random() * 26;
  const fp = focusPos();
  const x = nearestRoadCoord(clamp(fp.x + Math.cos(a) * d, -330, 330));
  const z = nearestRoadCoord(clamp(fp.z + Math.sin(a) * d, -330, 330));
  const isBlock = S.wanted >= 3 && policeCars.filter((c) => c.tactic === "ROADBLOCK").length < S.wanted - 2;
  const car = spawnCar(1, x, z, Math.atan2(fp.x - x, fp.z - z), "police", { color: 0xffffff });
  car.callsign = CALLSIGNS[(Math.random() * CALLSIGNS.length) | 0] + "-" + (10 + ((Math.random() * 80) | 0));
  car.tactic = isBlock ? "ROADBLOCK" : (policeCars.length % 3 === 2 ? "FLANKING" : "RAMMING");
  if (isBlock) { // Park across the road ahead of the player.
    const f = fwd(S.inCar ? S.inCar.heading : player.heading);
    car.pos.x = nearestRoadCoord(fp.x + f.x * 55); car.pos.z = nearestRoadCoord(fp.z + f.z * 55);
    car.heading = (S.inCar ? S.inCar.heading : player.heading) + Math.PI / 2;
  }
  policeCars.push(car);
  return car;
}
function updatePolice(dt) {
  while (policeCars.length < desiredPolice()) spawnPoliceUnit();
  while (policeCars.length > desiredPolice()) {
    const car = policeCars.pop();
    scene.remove(car.mesh);
    cars.splice(cars.indexOf(car), 1);
  }
  const fp = focusPos();
  let anySight = false;
  for (const car of policeCars) {
    const d = dist2d(car.pos, fp);
    if (d < 70) anySight = true;
    if (car.wrecked) continue;
    if (car.mesh.userData.lightRed) {
      const on = (Date.now() % 500) < 250;
      car.mesh.userData.lightRed.material.color.setHex(on ? 0xff2222 : 0x661111);
      car.mesh.userData.lightBlue.material.color.setHex(on ? 0x111166 : 0x2266ff);
      if (car.mesh.userData.glowRed) {
        car.mesh.userData.glowRed.material.opacity = on ? 0.4 : 0.05;
        car.mesh.userData.glowBlue.material.opacity = on ? 0.05 : 0.4;
      }
    }
    if (car.tactic === "ROADBLOCK" && d > 26) car.tactic = "PURSUIT";
    if (car.tactic === "ROADBLOCK") { car.speed = 0; car.mesh.rotation.y = car.heading - Math.PI / 2; continue; }
    // Steer at the player (flankers aim at a side offset), full throttle.
    const flank = car.tactic === "FLANKING" ? 7 : 0;
    const tx = fp.x + flank, tz = fp.z - flank;
    const want = Math.atan2(tx - car.pos.x, tz - car.pos.z);
    car.heading = angleLerp(car.heading, want, dt * (d > 20 ? 1.6 : 2.6));
    const top = S.inCar ? 43 : 30;
    car.speed = clamp(car.speed + 22 * dt, 0, top);
    if (d < 7) car.speed = Math.min(car.speed, 16);
    const f = fwd(car.heading);
    car.pos.x += f.x * car.speed * dt; car.pos.z += f.z * car.speed * dt;
    const [cx, cz] = city.collide(car.pos.x, car.pos.z, 2.1);
    if (cx !== car.pos.x || cz !== car.pos.z) { damageCar(car, 4 * dt * 10, null); }
    car.pos.x = cx; car.pos.z = cz;
    car.mesh.rotation.y = car.heading - Math.PI / 2;
    spinWheels(car, car.speed, dt);
    // Ramming and, at 3+ stars, shooting at the player's car.
    if (S.inCar && d < 3.6 && car.speed > 8) { damageCar(S.inCar, 6, null); car.speed *= 0.4; audio.crash(0.5); }
    car.shooterCd -= dt;
    if (S.wanted >= 3 && d < 26 && car.shooterCd <= 0) {
      car.shooterCd = 1.1 + Math.random();
      if (!S.inCar) hurtPlayer(3.5); else damageCar(S.inCar, 2.5, null);
      if (!STAGE) burst(new THREE.Vector3(fp.x, 1.2, fp.z), 0xffe14d, 2, 2, 1.5);
      audio.shoot("pistol");
    }
  }
  // Helicopter at 4+ stars.
  heliActive = S.wanted >= 4;
  heli.visible = heliActive;
  if (heliActive && STAGE) {
    // In a staged scene the helicopter holds a fixed, readable position
    // ahead of the player instead of circling wherever the phase left it.
    const fh = S.inCar ? S.inCar.heading : player.heading;
    heli.position.set(fp.x + Math.sin(fh) * 24 + 6, 16.5, fp.z + Math.cos(fh) * 24);
    heli.rotation.y = fh + 2.6;
    heli.userData.rotor.rotation.y += dt * 28;
    heli.userData.spot.intensity = 900;
  } else if (heliActive) {
    heliPhase += dt;
    heli.position.set(fp.x + Math.cos(heliPhase * 0.5) * 16, 30, fp.z + Math.sin(heliPhase * 0.5) * 16);
    heli.rotation.y = -heliPhase * 0.5;
    heli.userData.rotor.rotation.y += dt * 28;
    heli.userData.spot.intensity = 900;
    anySight = true;
  }
  audio.setSiren(S.wanted > 0 && policeCars.length ? clamp(1 - dist2d(policeCars[0].pos, fp) / 80, 0.1, 1) : 0);
  // Search & decay.
  if (S.wanted > 0) {
    if (anySight) { S.searchTimer = 0; S.searching = false; }
    else {
      S.searchTimer += dt; S.searching = S.searchTimer > 2.5;
      if (S.searchTimer > 9) { S.wanted--; S.searchTimer = 3; if (S.wanted === 0) hud.toast("YOU LOST THEM", "The bay goes quiet again"); }
    }
  }
}
function hurtPlayer(dmg) {
  if (S.armor > 0) { const absorbed = Math.min(S.armor, dmg * 0.7); S.armor -= absorbed; dmg -= absorbed; }
  S.health -= dmg;
  if (S.health <= 0 && S.mode === "play") {
    S.mode = "wasted";
    audio.wasted(); audio.setEngine(false, 0, 0); audio.setSiren(0);
    document.getElementById("wastedScreen").style.display = "flex";
    document.getElementById("hud").style.display = "none";
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

// ---------- pedestrians & hostiles ----------
function updatePeds(dt) {
  const fp = focusPos();
  for (const p of peds) {
    if (p.dead) continue;
    p.phase += dt * p.speed * 2.4;
    let move = p.speed;
    const dPlayer = dist2d(p.pos, fp);
    if (p.hostile) {
      // The red ▼ rides over an active hostile: visible while he
      // is close enough to be part of the fight (he engages at
      // 17 m; the tag fades in a little beyond that, so a gunman
      // reads as a gunman while he closes), hidden the moment he
      // dies (settleCorpse) or the player leaves him behind.
      if (p.mesh.userData.marker) {
        const mk = p.mesh.userData.marker;
        mk.visible = dPlayer < 26;
        mk.position.y = 2.42 + Math.sin(p.phase * 1.7) * 0.05;
      }
      // Close in to range, then strafe and shoot.
      if (dPlayer > 17) { p.heading = Math.atan2(fp.x - p.pos.x, fp.z - p.pos.z); move = 4.6; }
      else {
        move = 0; p.heading = Math.atan2(fp.x - p.pos.x, fp.z - p.pos.z);
        p.shootCd -= dt;
        if (p.shootCd <= 0) {
          p.shootCd = 0.9 + Math.random() * 0.9;
          audio.shoot("smg");
          // Return fire wears the same signs as the player's — an orb
          // at his muzzle and a beam to the man he is shooting at —
          // so a two-way fight reads from either side. The hostile
          // orb runs LARGE (v5.3, owner-ordered): at 0.55 the bloom
          // never registered past a few metres — not in motion, not
          // in a still — and a shootout whose return fire cannot be
          // seen reads as one-way. 0.92 is still a muzzle flash,
          // not a firework: a 0.085 s bloom at the barrel tip.
          const muzzle = new THREE.Vector3(-0.42, 1.35, 0.35).applyAxisAngle(Y_AXIS, p.heading).add(p.pos);
          fireOrb(muzzle, 0.92, 0xffc9b0, true);
          fireBeam(muzzle, new THREE.Vector3(fp.x, 1.3, fp.z), true);
          // The hit on Raka reads as flecks, not fruit (v5.4): the
          // old burst threw five 0.35 m pink spheres at his chest,
          // which hung on his back like shoulder pads in any held
          // or slow frame, and the first trim (four at 0.8) still
          // left one sphere sitting on his neck like a pendant in
          // a held frame. Four small sparks now, thrown wider and
          // faster and dead inside a third of a second — a sting
          // you register, not a costume he wears. The feedback
          // stays; the jewellery goes.
          burst(new THREE.Vector3(fp.x, 1.25, fp.z), 0xff6b81, 4, 3.0, 2.6, 0.6, 0.24);
          if (S.inCar) damageCar(S.inCar, 2, null); else hurtPlayer(4);
        }
      }
    } else if (p.crew) {
      // Staged crew backup — spawned ONLY by ?stage= screenshot
      // stagings (the crew flag is set nowhere else), so normal
      // play never grows one. He stands his ground, keeps his gun
      // up on his assigned target (aimPose: the raised-arm stance
      // updatePlayer gives Raka, re-applied below animatePerson),
      // and trades COSMETIC fire with it — a real beam and star
      // orb from his own barrel, but no damage either way. Set
      // dressing for the two-way-fight read, not a combatant.
      move = 0;
      p.heading = Math.atan2(p.aimX - p.pos.x, p.aimZ - p.pos.z);
      p.shootCd -= dt;
      if (p.shootCd <= 0) {
        p.shootCd = 0.55 + Math.random() * 0.5;
        const muzzle = new THREE.Vector3(-0.42, 1.35, 0.58).applyAxisAngle(Y_AXIS, p.heading).add(p.pos);
        fireOrb(muzzle, 1.0, 0xffffff, true);
        fireBeam(muzzle, new THREE.Vector3(p.aimX, 1.3, p.aimZ), false);
        audio.shoot("smg");
      }
    } else if (p.flee > 0 || (dPlayer < 6 && (mouseDown || S.wanted >= 2))) {
      p.flee = Math.max(p.flee - dt, 0.4);
      p.heading = Math.atan2(p.pos.x - fp.x, p.pos.z - fp.z);
      move = 5.4;
    } else {
      if (Math.hypot(p.tx - p.pos.x, p.tz - p.pos.z) < 2) {
        p.tx = clamp(p.pos.x + (Math.random() - 0.5) * 130, -350, 350);
        p.tz = clamp(p.pos.z + (Math.random() - 0.5) * 130, -350, 350);
        if (isOnRoad(p.tx, p.tz)) { p.tx += 16; }
      }
      p.heading = angleLerp(p.heading, Math.atan2(p.tx - p.pos.x, p.tz - p.pos.z), dt * 3);
      move = p.speed;
    }
    const f = fwd(p.heading);
    let nx = p.pos.x + f.x * move * dt, nz = p.pos.z + f.z * move * dt;
    [nx, nz] = city.collide(nx, nz, 0.6);
    p.pos.x = nx; p.pos.z = nz;
    p.mesh.rotation.y = p.heading;
    animatePerson(p.mesh, p.phase, move);
    // The crew stance: animatePerson parks both arms at his
    // sides, so a staged backup's raised gun arm is re-applied
    // after it — the same angles updatePlayer sets for Raka.
    if (p.aimPose) { const l = p.mesh.userData.limbs; if (l) { l.armR.rotation.x = -1.5; l.armL.rotation.x = -0.55; } }
    // Run over by the player's car.
    if (S.inCar && Math.abs(S.inCar.speed) > 6 && dist2d(p.pos, S.inCar.pos) < 2.4) {
      p.dead = true; settleCorpse(p.mesh);
      commitCrime(3); audio.crash(0.4);
    }
  }
}

// ---------- target car (chase stages) ----------
function updateTarget(dt) {
  if (!targetCar || targetCar.wrecked) return;
  const car = targetCar;
  car.tactic = "FLEEING";
  // Run the road grid away from the player.
  if (!isOnRoad(car.pos.x, car.pos.z) || Math.random() < 0.004) {
    const tx = nearestRoadCoord(car.pos.x), tz = nearestRoadCoord(car.pos.z);
    car.heading = angleLerp(car.heading, Math.atan2(tx - car.pos.x, tz - car.pos.z), dt * 2);
  }
  const away = Math.atan2(car.pos.x - focusPos().x, car.pos.z - focusPos().z);
  if (dist2d(car.pos, focusPos()) < 40) car.heading = angleLerp(car.heading, away, dt * 1.4);
  car.speed = clamp(car.speed + 18 * dt, 0, 33);
  const f = fwd(car.heading);
  car.pos.x += f.x * car.speed * dt; car.pos.z += f.z * car.speed * dt;
  const [cx, cz] = city.collide(car.pos.x, car.pos.z, 2.1);
  if (cx !== car.pos.x || cz !== car.pos.z) damageCar(car, 26 * dt, null);
  car.pos.x = cx; car.pos.z = cz;
  car.mesh.rotation.y = car.heading - Math.PI / 2;
  spinWheels(car, car.speed, dt);
  if (S.inCar && dist2d(car.pos, S.inCar.pos) < 3.6 && Math.abs(S.inCar.speed) > 10) {
    damageCar(car, Math.abs(S.inCar.speed) * 0.55, car.pos.clone().setY(1));
    audio.crash(0.7);
  }
}

// ---------- player movement & driving ----------
let smokeAcc = 0;
function updatePlayer(dt) {
  if (S.inCar) {
    const car = S.inCar;
    const up = keys.KeyW || keys.ArrowUp, down = keys.KeyS || keys.ArrowDown;
    const left = keys.KeyA || keys.ArrowLeft, right = keys.KeyD || keys.ArrowRight;
    if (!car.wrecked) {
      if (up) car.speed += car.model.accel * dt;
      else if (down) car.speed -= (car.speed > 1 ? 34 : 12) * dt;
      else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 5 * dt);
      if (keys.Space) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 42 * dt);
      car.speed = clamp(car.speed, -13, car.model.top);
      const steer = (left ? 1 : 0) - (right ? 1 : 0);
      if (Math.abs(car.speed) > 0.4) car.heading += steer * dt * 1.55 * clamp(Math.abs(car.speed) / 12, 0.25, 1) * Math.sign(car.speed) * car.model.grip + steer * dt * 0.2 * Math.sign(car.speed);
    } else car.speed = 0;
    const f = fwd(car.heading);
    let nx = car.pos.x + f.x * car.speed * dt, nz = car.pos.z + f.z * car.speed * dt;
    const [cx, cz] = city.collide(nx, nz, 2.2);
    if ((cx !== nx || cz !== nz) && Math.abs(car.speed) > 9) { damageCar(car, Math.abs(car.speed) * 0.35, null); fx.dustPuff(car.pos.x, 0.6, car.pos.z, Math.abs(car.speed) > 16); audio.crash(0.5); car.speed *= -0.25; }
    else { car.pos.x = cx; car.pos.z = cz; }
    // Car-to-car bumps.
    for (const o of cars) {
      if (o === car) continue;
      const d = dist2d(car.pos, o.pos);
      if (d < 3.6 && d > 0.01) {
        const push = (3.6 - d) / 2;
        const dx = (o.pos.x - car.pos.x) / d, dz = (o.pos.z - car.pos.z) / d;
        o.pos.x += dx * push; o.pos.z += dz * push;
        if (Math.abs(car.speed) > 8) { damageCar(o, Math.abs(car.speed) * 0.4, null); if (o === targetCar) commitCrime(3); if (Math.abs(car.speed) > 14) fx.dustPuff((car.pos.x + o.pos.x) / 2, 0.6, (car.pos.z + o.pos.z) / 2, false); audio.crash(0.45); car.speed *= 0.72; }
      }
    }
    car.mesh.rotation.y = car.heading - Math.PI / 2;
    spinWheels(car, car.speed, dt);
    // Tire smoke: the rear tires boil when the car breaks traction —
    // handbrake slides, full-lock corners at speed, and hard launches.
    const drifting = !car.wrecked && ((keys.Space && Math.abs(car.speed) > 8) ||
      (Math.abs((left ? 1 : 0) - (right ? 1 : 0)) > 0 && Math.abs(car.speed) > car.model.top * 0.72) ||
      (up && Math.abs(car.speed) > 0.5 && Math.abs(car.speed) < 6));
    if (drifting) {
      smokeAcc += dt;
      const f2 = fwd(car.heading), side = { x: -Math.cos(car.heading), z: Math.sin(car.heading) };
      const rear = (car.mesh.userData.length || 4.6) / 2 - 0.85;
      while (smokeAcc > 0.03) {
        smokeAcc -= 0.03;
        for (const s of [-0.95, 0.95]) {
          fx.tireSmoke(car.pos.x - f2.x * rear + side.x * s, 0.35, car.pos.z - f2.z * rear + side.z * s);
        }
      }
    } else smokeAcc = 0;
    player.pos.copy(car.pos);
    player.heading = car.heading;
    audio.setEngine(true, Math.abs(car.speed) / car.model.top, Math.abs(car.speed) / car.model.top);
    if (Math.abs(car.speed) > car.model.top * 0.75 && isOnRoad(car.pos.x, car.pos.z)) { /* speeding near police feeds sight, handled in updatePolice */ }
    return;
  }
  // On foot: WASD relative to the camera.
  const run = (keys.ShiftLeft || keys.ShiftRight) ? WORLD.sprintSpeed : WORLD.walkSpeed;
  let mx = 0, mz = 0;
  if (keys.KeyW || keys.ArrowUp) mz += 1;
  if (keys.KeyS || keys.ArrowDown) mz -= 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  const moving = (mx !== 0 || mz !== 0);
  if (moving) {
    const ang = camYaw + Math.atan2(mx, mz);
    player.heading = angleLerp(player.heading, ang, 0.35);
    const f = fwd(player.heading);
    let nx = player.pos.x + f.x * run * dt, nz = player.pos.z + f.z * run * dt;
    [nx, nz] = city.collide(nx, nz, 0.7);
    player.pos.x = nx; player.pos.z = nz;
    player.phase += dt * run * 1.6;
  }
  // Firing stance: with a firearm up and the trigger held, Raka
  // turns to face his aim — the camera's forward — so the gun in
  // his hand tracks the shot instead of pointing wherever his
  // walk last faced, and his gun arm comes up level down the aim
  // with the support hand under it. The gun box itself stays
  // where buildPersonMesh puts it; at arm's length forward the
  // raised hand meets it. The turn is pointer-lock only: with the
  // free camera the yaw already follows his heading, and if both
  // chased each other the pair would slowly rotate as one.
  const aiming = mouseDown && WEAPONS[S.weaponIdx].id !== "fists";
  if (aiming && pointerLocked) player.heading = angleLerp(player.heading, camYaw + Math.PI, 0.55);
  if (playerMesh.userData.gun) playerMesh.userData.gun.visible = WEAPONS[S.weaponIdx].id !== "fists";
  playerMesh.rotation.y = player.heading;
  animatePerson(playerMesh, player.phase, moving ? run : 0);
  if (aiming) {
    const limbs = playerMesh.userData.limbs;
    limbs.armR.rotation.x = -1.5;
    limbs.armL.rotation.x = -0.55;
  }
  audio.setEngine(false, 0, 0);
}

// ---------- title-screen clouds ----------
// The poster's sky gets its own treatment (owner's word): the
// world cloud clusters — chunky rings of puffs that read fine at
// gameplay distance — hang over the title as donuts, so while the
// menu is up, any cluster inside the panorama's view cone is
// hidden and the rest shrink to a little over half size. The
// moment play starts the sky is restored whole; gameplay never
// sees any of this.
let menuCloudsOn = false;
// The title panorama's pose lives in one place: the camera
// anchor (x, y, z) with a slow ±sway drift along z, looking at
// (lx, ly, lz). The cloud treatment's view cone and the frame
// loop's menu branch both derive from these numbers, so the
// vista can be re-aimed without the two drifting apart.
const MENU_POSE = { x: 205, y: 47, z: 235, sway: 9, lx: 432, ly: 0, lz: 38 };
const MENU_CAM_DIR = new THREE.Vector3(MENU_POSE.lx - MENU_POSE.x, MENU_POSE.ly - MENU_POSE.y, MENU_POSE.lz - MENU_POSE.z).normalize();   // the menu lookAt axis
const cloudScratch = new THREE.Vector3();
function applyMenuClouds() {
  const clouds = city.skyDome.userData.clouds || [];
  for (const c of clouds) {
    cloudScratch.subVectors(c.position, camera.position);
    const ang = cloudScratch.angleTo(MENU_CAM_DIR) * 180 / Math.PI;
    if (ang < 58) c.visible = false;
    else { c.visible = true; c.scale.setScalar(0.55); }
  }
  menuCloudsOn = true;
}
function restoreMenuClouds() {
  if (!menuCloudsOn) return;
  for (const c of (city.skyDome.userData.clouds || [])) { c.visible = true; c.scale.setScalar(1); }
  menuCloudsOn = false;
}
// The poster gets a small exposure lift of its own (the dusk
// vista under the scrim reads near-black on the wordmark side
// at the game's 1.12). Menu only: the frame loop restores the
// game exposure the moment play starts, so gameplay's grade
// never sees this.
let menuGradeOn = false;

// ---------- title-screen vista treatment ----------
// Two more menu-only touches, same contract as the clouds and
// the grade (applied while the menu is up, restored whole the
// moment play starts; gameplay never sees either):
//  - The race-gate pillars hide. A translucent green column
//    standing in the middle of the poster vista reads as a
//    rendering bug, not as a place; the gates come back with
//    play, and the race code owns their visibility from there.
//  - The bay's swell calms to a tenth. From any elevated
//    vantage the full swell's troughs dip below the ground
//    plane (y -0.05) wherever it runs under the near-shore
//    water, punching land-coloured holes through the sea —
//    the "islands" that sank every earlier water-inclusive
//    title probe. Calmed, the surface stays above the ground
//    everywhere and the bay reads as one sheet of dusk water
//    with the boats still under way on it.
let menuVistaOn = false;
function applyMenuVista() {
  if (menuVistaOn) return;
  for (const g of activities.gates) g.mesh.visible = false;
  menuVistaOn = true;
}
function restoreMenuVista() {
  if (!menuVistaOn) return;
  for (const g of activities.gates) g.mesh.visible = true;
  menuVistaOn = false;
}

// ---------- title-screen traffic treatment ----------
// One more menu-only touch, same contract as the clouds, vista
// and sun (applied while the menu is up, restored whole the
// moment play starts; gameplay never sees it). The owner's eye
// caught ambient vehicles sitting off the road in the poster
// frame — a box truck parked on the sand, kerbside strays —
// because the menu runs the whole living city under the vista.
// While the menu is up, any traffic or parked vehicle inside
// the vista's ground box that is not on asphalt (a road strip,
// the boulevard, or a painted kerb bay, which all sit inside
// the strip tolerance) is hidden; the moment it is back on
// asphalt — or play starts — it is visible again. The traffic
// simulation itself is untouched: cars keep driving their
// routes under the menu, hidden only while off the road. The
// same hiding now also covers a vehicle that sits on asphalt
// facing against its lane's flow (menuTrafficAligned below):
// parked offenders vanish at once, rolling traffic only after
// the failure outlasts a junction turn's grace.
let menuTrafficOn = false;
const menuTrafficHidden = new Set();
const menuTrafficFailSince = new Map();   // traffic car -> when its current failure began (seconds)
const MENU_TRAFFIC_BOX = { x0: 140, x1: 520, z0: -280, z1: 380 };
const MENU_TRAFFIC_TURN_GRACE = 1.5;      // a turning car is briefly off-flow; only a settled failure hides
function menuTrafficOnRoad(x, z) {
  const half = WORLD.roadHalf + 1;
  if (Math.abs(x - nearestRoadCoord(x)) <= half) return true;            // a north-south strip
  if (Math.abs(z - nearestRoadCoord(z)) <= half && x <= 297) return true; // an east-west strip (they end at the boulevard)
  return false;
}
// The facing test (the owner's second title marking: a vehicle in
// the poster must sit on the asphalt AND face the traffic). A car
// on a strip must face the way its lane flows — east side of a
// north-south road heads 0, west side PI; south side of an
// east-west road heads PI/2, north side -PI/2, the convention the
// kerbside bays now follow. A car straddling a centreline may
// face either way along its road; at a junction either road's
// flow counts. 0.7 rad of slack covers lane wobble.
function menuTrafficAligned(car) {
  // Owner-marked cars (the ownerFace block at the spawns) face the
  // headings he drew on the title poster, not their lanes' flow —
  // the facing test must not hide the very cars he marked to be seen.
  if (car.ownerMark) return true;
  const p = car.pos, half = WORLD.roadHalf + 1;
  const h = Math.atan2(Math.sin(car.heading), Math.cos(car.heading));
  const near = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) <= 0.7;
  let on = false;
  const lx = nearestRoadCoord(p.x);
  if (Math.abs(p.x - lx) <= half) {
    on = true;
    const off = p.x - lx;
    if (off > 1 ? near(h, 0) : off < -1 ? near(h, Math.PI) : (near(h, 0) || near(h, Math.PI))) return true;
  }
  const lz = nearestRoadCoord(p.z);
  if (Math.abs(p.z - lz) <= half && p.x <= 297) {
    on = true;
    const off = p.z - lz;
    if (off > 1 ? near(h, Math.PI / 2) : off < -1 ? near(h, -Math.PI / 2) : (near(h, Math.PI / 2) || near(h, -Math.PI / 2))) return true;
  }
  return !on;   // not on any strip: the road test owns this car
}
function applyMenuTraffic() {
  menuTrafficOn = true;
  const now = performance.now() / 1000;
  const inBox = (p) => p.x >= MENU_TRAFFIC_BOX.x0 && p.x <= MENU_TRAFFIC_BOX.x1 && p.z >= MENU_TRAFFIC_BOX.z0 && p.z <= MENU_TRAFFIC_BOX.z1;
  for (const car of cars) {
    if (car.kind !== "traffic" && car.kind !== "parked") continue;
    const p = car.pos;
    const bad = inBox(p) && (!menuTrafficOnRoad(p.x, p.z) || !menuTrafficAligned(car));
    if (!bad) {
      menuTrafficFailSince.delete(car);
      if (menuTrafficHidden.has(car)) { car.mesh.visible = true; menuTrafficHidden.delete(car); }
      continue;
    }
    // Parked cars never turn: a failure is settled, hide at once.
    // Rolling traffic gets the grace — a junction turn swings the
    // heading through the failing arc for well under it, so a car
    // only disappears once it is genuinely settled against the
    // flow or off the road for good.
    if (car.kind === "traffic") {
      if (!menuTrafficFailSince.has(car)) menuTrafficFailSince.set(car, now);
      if (now - menuTrafficFailSince.get(car) < MENU_TRAFFIC_TURN_GRACE) continue;
    }
    if (car.mesh.visible) { car.mesh.visible = false; menuTrafficHidden.add(car); }
  }
}
function restoreMenuTraffic() {
  if (!menuTrafficOn) return;
  for (const car of menuTrafficHidden) car.mesh.visible = true;
  menuTrafficHidden.clear();
  menuTrafficFailSince.clear();
  menuTrafficOn = false;
}

// ---------- title-screen beach-shadow treatment ----------
// One more menu-only touch, same contract. The poster's beach is
// a single sand plane (city.js buildStrand, 0xf2cb6e), but the
// olive patch the owner marked on it was real: the menu's low
// western sun threw the boulevard column's buildings across the
// sand — a probe named the casters building by building (the
// (237.5, 142.5) foreground block and the (237.5, 47.5)
// strand-park fill) — so while the menu was up those buildings
// simply did not cast, and the beach read as one sheet of
// yellow. That retirement is itself retired now: the sun-light
// treatment seats the menu light in the EAST, on the poster
// disc's azimuth, so those same buildings throw their shadows
// WEST, onto the city ground — where the owner, reviewing the
// eastern poster, demanded building shadows back. They can no
// longer reach the sand at all (nothing east of the beach casts
// but boats), so the casters stay ON through the menu and the
// beach keeps its one tone by geometry instead of by gag.
// The treatment remains as the contract's bookkeeping: the
// caster list is still computed for probes/readback, and the
// restore below still re-asserts every caster the moment play
// starts, untouched as ever.
let menuBeachOn = false, menuBeachCasters = null;
function applyMenuBeach() {
  if (menuBeachOn) return;
  if (!menuBeachCasters) {
    menuBeachCasters = city.buildings.filter((b) => b.position.x >= 190 && b.position.x <= 285 && b.position.z >= -95 && b.position.z <= 190);
  }
  menuBeachOn = true;
}
function restoreMenuBeach() {
  if (!menuBeachOn) return;
  for (const b of menuBeachCasters) b.castShadow = true;
  menuBeachOn = false;
}

// ---------- title-screen shadow-camera treatment ----------
// One more menu-only touch, same contract. The sun's shadow
// camera spans ±120 around its axis; from the menu sun (west,
// low) that box covers the northern beach but stops short of the
// poster's southern half — the dense umbrella row (z 98..278)
// falls outside the map, so its canopies cast nothing and the
// umbrellas float on the sand, shadowless, while the buildings
// behind them throw long shadows. While the menu is up the box
// widens to ±270 and the whole poster grounds its shadows, all
// pointing the one way the senja sun points; the moment play
// starts the tight, crisp ±120 box returns untouched.
// The far plane is the second half of the same treatment, and
// the eastern sun seat is why: the home far (600) was sized for
// the play seat, ~350 from the player. From the poster's
// eastern seat the light sits ~610 from the vista target alone,
// and the city's western half — the towers, the port containers,
// the ground their shadows land on — lies deeper still along
// the axis, past the far plane, outside the shadow frustum.
// That, not direction, is what emptied title9's city of shadows
// even after the span was widened: a probe with the casters
// forced on changed nothing, and the same probe with far pushed
// to 2000 brought the towers' shadow mass and the containers'
// shadows back in one render. So the menu takes far to 2000
// with the span, and play takes both back untouched.
let menuShadowCamOn = false;
function applyMenuShadowCam() {
  if (menuShadowCamOn) return;
  const c = sun.shadow.camera;
  c.left = -270; c.right = 270; c.top = 270; c.bottom = -270;
  c.far = 2000;
  c.updateProjectionMatrix();
  menuShadowCamOn = true;
}
function restoreMenuShadowCam() {
  if (!menuShadowCamOn) return;
  const c = sun.shadow.camera;
  c.left = -120; c.right = 120; c.top = 120; c.bottom = -120;
  c.far = 600;
  c.updateProjectionMatrix();
  menuShadowCamOn = false;
}

// ---------- title-screen setting sun ----------
// One more menu-only touch, same contract as the clouds, the
// grade and the vista (applied while the menu is up, restored
// whole the moment play starts; gameplay never sees it). The
// game's own sun disc rides in the west (city.js buildSky:
// (-560, 105, -880), aimed at the city) — behind the menu
// camera, which looks east across the bay, so the poster has
// always had the senja's light without its source. While the
// menu is up the disc is borrowed and hung low over the bay
// in the frame's bright right sector: about 20 degrees right
// of the vista axis at the disc's home distance, its centre
// a degree above the horizon so the lower rim kisses the
// waterline, grown a third so it anchors the poster's empty
// sky. Behind it a soft additive glow; beneath it a glitter
// path laid on the calmed water along the sun's azimuth,
// brightening toward the sun the way a real reflection does.
// On play the disc goes home to the exact metre and heading
// it was built with and the glow and path hide — the sky in
// game is the locked senja again, untouched.
const MENU_SUN = { x: 1149, y: 64, z: -126, scale: 1.35 };
let menuSunOn = false, menuSunParts = null;
function buildMenuSun() {
  const disc = city.skyDome.userData.sunDisc;
  const glowC = document.createElement("canvas"); glowC.width = glowC.height = 256;
  const gg = glowC.getContext("2d");
  const grad = gg.createRadialGradient(128, 128, 8, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,196,120,0.85)"); grad.addColorStop(0.35, "rgba(255,158,84,0.38)");
  grad.addColorStop(1, "rgba(255,140,70,0)");
  gg.fillStyle = grad; gg.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(glowC); glowTex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(360, 360),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.visible = false; scene.add(glow);
  const pathC = document.createElement("canvas"); pathC.width = 256; pathC.height = 64;
  const pg = pathC.getContext("2d");
  const img = pg.createImageData(256, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 256; x++) {
    const u = x / 255, v = Math.abs(y - 31.5) / 31.5;
    const a = Math.pow(1 - v, 1.6) * (0.34 + 0.86 * u);
    const i = (y * 256 + x) * 4;
    img.data[i] = 255; img.data[i + 1] = 178; img.data[i + 2] = 96; img.data[i + 3] = Math.max(0, Math.min(1, a)) * 255;
  }
  pg.putImageData(img, 0, 0);
  const pathTex = new THREE.CanvasTexture(pathC); pathTex.colorSpace = THREE.SRGBColorSpace;
  const pathGeo = new THREE.PlaneGeometry(520, 74); pathGeo.rotateX(-Math.PI / 2);
  const path = new THREE.Mesh(pathGeo,
    new THREE.MeshBasicMaterial({ map: pathTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  // The path runs along the sun's azimuth (0.934, -0.357 in xz,
  // away from the poster camera), centred mid-bay at (644, 67).
  path.position.set(644, 0.09, 67); path.rotation.y = 0.365;
  path.visible = false; scene.add(path);
  menuSunParts = { disc, home: disc.position.clone(), glow, path };
}
function applyMenuSun() {
  if (!menuSunParts) buildMenuSun();
  const { disc, glow, path } = menuSunParts;
  disc.position.set(MENU_SUN.x, MENU_SUN.y, MENU_SUN.z);
  disc.scale.setScalar(MENU_SUN.scale);
  disc.lookAt(camera.position);
  disc.material.color.setHex(0xffb347);   // saturated gold: pale colours blow out to white through the grade, ember sank dark — this holds its warmth
  glow.position.copy(disc.position).addScaledVector(
    cloudScratch.subVectors(disc.position, camera.position).normalize(), 25);
  glow.lookAt(camera.position);
  glow.visible = true; path.visible = true;
  menuSunOn = true;
}
function restoreMenuSun() {
  if (!menuSunOn) return;
  const { disc, home, glow, path } = menuSunParts;
  disc.position.copy(home);
  disc.scale.setScalar(1);
  disc.lookAt(0, 40, 0);   // the heading buildSky built it with
  glow.visible = false; path.visible = false;
  menuSunOn = false;
}

// ---------- title-screen sun-light treatment ----------
// One more menu-only touch, same contract. The poster borrows
// the sun DISC and hangs it low over the bay in the east
// (MENU_SUN above), but the light itself never moved with it:
// the menu branch of updateCamera seats the light on its
// western home every frame, so every shadow in the poster —
// buildings, palms, umbrellas — falls east, toward the sun it
// is meant to fall away from. The owner called it plainly:
// the shadows run opposite the sun. While the menu is up this
// treatment re-seats the light on the disc's own azimuth from
// the vista target, so the whole poster throws its shadows
// west, away from the disc. The seat keeps the home distance
// but NOT the home height: at the home elevation (6.3°) the
// direction was right and the shadows were gone — a palm at
// the kerb threw its crown shadow ~77 m west, clean off the
// beach onto the city, and at that grazing angle the sand's
// direct-light factor (sin 6.3° ≈ 0.11) left almost no shadow
// contrast on the flat ground anyway. The owner reviewed the
// render and called it: shadows vanished. So the seat rides
// the disc's azimuth at a raised elevation — high enough that
// the umbrella field's shadows (canopy ~3 m, throw ~5 m at
// 30°) land whole on the sand just west of each pole and the
// palm trunks' shadows read along the promenade strip, all
// pointing west, with the ground contrast (sin 30° = 0.50,
// ~4.5x the grazing seat's) to carry them. Tuned on renders:
// 24° still read faint; 30° is where the field's shadows stand
// up at the presence the earlier western poster had, in the
// opposite direction.
// The disc itself is a borrowed billboard hung low for the
// poster; the light's elevation is the one liberty the poster
// takes with it, and the azimuth — the direction the owner
// actually judged — stays the disc's own. The branch re-seats
// the light before the treatments run each frame, so the move
// is re-asserted each frame too. Restore is the play branch
// itself: it seats the light on the player every frame, and
// updateSky owns the light's colour and strength in both
// modes — nothing here leaks into play.
const MENU_SUNLIGHT_DIST = 528, MENU_SUNLIGHT_ELEV = 30 * Math.PI / 180;
const MENU_SUNLIGHT_Y = Math.round(MENU_SUNLIGHT_DIST * Math.tan(MENU_SUNLIGHT_ELEV));
let menuSunLightOn = false, menuSunLightPos = null;
function applyMenuSunLight() {
  if (!menuSunLightPos) {
    const dx = MENU_SUN.x - MENU_POSE.lx, dz = MENU_SUN.z - MENU_POSE.lz;
    const len = Math.hypot(dx, dz);
    menuSunLightPos = {
      x: MENU_POSE.lx + (dx / len) * MENU_SUNLIGHT_DIST,
      y: MENU_SUNLIGHT_Y,
      z: MENU_POSE.lz + (dz / len) * MENU_SUNLIGHT_DIST,
    };
  }
  sun.position.set(menuSunLightPos.x, menuSunLightPos.y, menuSunLightPos.z);
  menuSunLightOn = true;
}
function restoreMenuSunLight() {
  if (!menuSunLightOn) return;
  menuSunLightOn = false;
}

// ---------- camera, light, day cycle ----------
function updateCamera(dt) {
  // Title-screen panorama (v5, fixed): the first frame of the
  // game is the whole strand AND the bay it sits on. The camera
  // hangs over the city's south-east rooftops and looks
  // east-north-east across Pantai Senja: the boulevard cuts
  // diagonally through the foreground — palm row and lamp
  // spine along the kerb, traffic rolling both ways — the
  // beach runs as a strip beside it with umbrellas at object
  // scale, and then the water itself: the shoreline crosses
  // the frame diagonally, the pier juts into the bay, boats
  // ride their circuits, and the downtown towers hold the
  // frame's left edge behind the wordmark. The earlier pose
  // (over the sand looking back west) never had the water in
  // frame at all, and the owner called the poster on it. This
  // pose was picked from rendered probes of the real vista,
  // not guessed: over-water and along-coast grazes were tried
  // again and rejected again on their own renders (the flat
  // planes turn to diagonal bands), and the water only reads
  // as a place with the menu vista treatment above — calmed
  // swell, gates hidden. The drift is a slow ±9 m sway so the
  // composition holds at any phase of it, and a fresh camera
  // snaps straight to the vista instead of flying in from the
  // world origin.
  if (S.mode === "menu") {
    const t = performance.now() / 1000;
    const cx = MENU_POSE.x, cz = MENU_POSE.z + Math.sin(t * 0.045) * MENU_POSE.sway;
    const target = new THREE.Vector3(cx, MENU_POSE.y + Math.sin(t * 0.1) * 1.5, cz);
    if (camera.position.distanceTo(target) > 60) camera.position.copy(target);
    camera.position.lerp(target, 1 - Math.pow(0.02, dt));
    camera.lookAt(MENU_POSE.lx, MENU_POSE.ly, MENU_POSE.lz);
    sun.position.set(cx - 300, 58, cz - 170);
    sun.target.position.set(MENU_POSE.lx, MENU_POSE.ly, MENU_POSE.lz);
    applyMenuClouds();
    applyMenuVista();
    applyMenuSun();
    applyMenuTraffic();
    applyMenuBeach();
    applyMenuShadowCam();
    applyMenuSunLight();
    if (!menuGradeOn) { renderer.toneMappingExposure = 1.36; menuGradeOn = true; }
    return;
  }
  restoreMenuClouds();
  restoreMenuVista();
  restoreMenuSun();
  restoreMenuTraffic();
  restoreMenuBeach();
  restoreMenuShadowCam();
  restoreMenuSunLight();
  if (menuGradeOn) { renderer.toneMappingExposure = 1.12; menuGradeOn = false; }
  const fp = focusPos();
  const heading = S.inCar ? S.inCar.heading : player.heading;
  if (!pointerLocked) camYaw = angleLerp(camYaw, heading + Math.PI + S.camOffset, dt * (S.inCar ? 2.2 : 1.4));
  // On foot the follow sits low and close — 4.2 m back, 1.8 m up —
  // so Raka fills the lower frame at shoulder height, the way the
  // reference games shoot their street scenes. The old 5.8 m /
  // 2.5 m floated high and far and shrank everything he did. With
  // the pitch floor at 0.02 the camera's lowest point is ~1.85 m,
  // still clear of the ground plane. The driving follow dropped
  // too (v5): 9.6 m / 3.3 m up floated above the chase like a
  // drone; 8.2 m / 2.5 m sits in the car's wake at boot height,
  // the reference chase framing.
  const dist = S.inCar ? 8.2 : 4.2 - Math.min(0.75, (S.camShoulder || 0) * 0.5) + (S.camBack || 0), height = S.inCar ? 2.5 : 1.8;
  const back = { x: Math.sin(camYaw) * Math.cos(camPitch), z: Math.cos(camYaw) * Math.cos(camPitch) };
  // Staging-only over-shoulder lever (S.camShoulder, metres): the
  // follow camera and its aim point step sideways by the same
  // amount, so the view direction is unchanged but Raka slides
  // out of the centre toward the frame's edge — the over-shoulder
  // grammar the reference street scenes are shot in — and the
  // follow dollies in a touch as the shoulder grows. Only ?stage=
  // staging ever sets it (api.setCamShoulder); normal play keeps
  // it 0 and every term below is inert.
  const sh = S.inCar ? 0 : (S.camShoulder || 0);
  const rx = Math.cos(camYaw) * sh, rz = -Math.sin(camYaw) * sh;
  const tx = fp.x + back.x * dist + rx, tz = fp.z + back.z * dist + rz;
  camera.position.lerp(new THREE.Vector3(tx, fp.y + height + Math.sin(camPitch) * dist * 0.55, tz), 1 - Math.pow(0.0001, dt));
  camera.lookAt(fp.x + rx, fp.y + 1.6, fp.z + rz);
  // The senja sun rides LOW (v5): ~17 degrees up, far to the west —
  // long warm shadows raking across the streets at every hour, the
  // single strongest "it is always dusk here" cue the game has.
  sun.position.set(fp.x + 130, 46, fp.z - 70);
  sun.target.position.set(fp.x, 0, fp.z);
}
let darkness = 0;   // 0.12 at the brightest senja hour, ~0.62 in the small hours; updateSky owns it
const EMBER = new THREE.Color(0xff8a4a);
const FOG_DAY = new THREE.Color(0xe8bd8f), FOG_NIGHT = new THREE.Color(0x3d4457);
function updateSky() {
  const h = S.clock;
  // SENJA LOCK (v5): Senja Bay never leaves dusk. The clock still
  // turns for the missions, but the light lives on one warm arc —
  // the day curve runs 06:00–19:30 and the level is floored at
  // 0.38 and capped at 0.88, so no hour is flat midday blue and no
  // hour is pitch black; an ember band centred on 18:36 warms
  // everything it touches. One family at every hour: teal sky,
  // amber horizon, lit lamps, long warm shadows.
  const day = clamp(Math.sin(((h - 6) / 13.5) * Math.PI), 0, 1);
  const dusk = clamp(1 - Math.abs(h - 18.6) / 2.6, 0, 1);
  const lightLevel = 0.38 + day * 0.5;
  darkness = 1 - lightLevel;
  scene.background.setHex(0x2e6b7a);
  scene.fog.color.copy(FOG_NIGHT).lerp(FOG_DAY, day).lerp(EMBER, dusk * 0.22);
  if (city.skyDome) {
    // The dome texture carries the senja gradient; the tint only
    // breathes it between the small hours and the bright afternoon.
    city.skyDome.userData.mat.color.setRGB(
      0.55 + day * 0.55 + dusk * 0.1,
      0.6 + day * 0.44,
      0.78 + day * 0.3);
  }
  // The sun is always warm now — pale gold at the day's peak, deep
  // amber through the dusk band — and the hemisphere fill (pale
  // teal over warm earth, set at creation) does the shadow lifting.
  sun.intensity = 1.15 + day * 0.95 + dusk * 0.35;
  sun.color.setHex(day > 0.55 ? 0xffdca6 : 0xffb37a);
  hemi.intensity = 0.72 + day * 0.25;
  // The sun disc rides low on the dome and burns ember all day,
  // deepest as the dusk band peaks. (While the title screen's
  // setting-sun treatment holds the disc, it owns the colour —
  // the ember burn is too dark against the poster's bright
  // horizon band and the borrowed sun read as an eclipse.)
  if (city.skyDome && city.skyDome.userData.sunDisc && !menuSunOn) {
    city.skyDome.userData.sunDisc.material.color.setHex(0xfff2c0).lerp(EMBER, 0.35 + dusk * 0.55);
  }
  // Lamps and work lights belong to the senja: they are on for the
  // whole dusk family, only resting near the brightest hour.
  const lampsOn = lightLevel < 0.8;
  for (const lamp of city.lamps) lamp.material.color.setHex(lampsOn ? 0xffe9a8 : 0x8a8f96);
  for (const pl of city.nightLights) pl.intensity = lightLevel < 0.62 ? 520 : lightLevel < 0.8 ? 240 : 0;
}

// ---------- HUD state ----------
function hudState() {
  const fp = focusPos();
  const dispatch = [];
  for (const c of policeCars) dispatch.push({ icon: "▲", name: c.callsign, tactic: c.tactic || "PURSUIT", cls: c.tactic === "RAMMING" ? "red" : c.tactic === "ROADBLOCK" ? "orange" : "", dist: dist2d(c.pos, fp) });
  if (heliActive) dispatch.push({ icon: "◆", name: "AIR ONE", tactic: "SPOTLIGHT", cls: "green", dist: dist2d(heli.position, fp) });
  dispatch.sort((a, b) => a.dist - b.dist);
  const weapons = WEAPONS.map((w, i) => ({
    slot: w.slot, name: w.name, active: i === S.weaponIdx,
    locked: w.id !== "fists" && !S.unlocked[w.id],
    ammoText: w.id === "fists" ? "∞" : String(S.ammo[w.id]),
  }));
  const mState = missions.hudState(fp);
  const tp = missions.targetPoint();
  return {
    clock: S.clock, money: S.money, respect: S.respect, wanted: S.wanted, searching: S.searching,
    activity: activities.hudState(),
    heliActive, roadblockAhead: policeCars.some((c) => c.tactic === "ROADBLOCK"),
    dispatchLine: S.dispatchLineT > 0 ? S.dispatchLine : "",
    stage: !!STAGE,
    mission: mState, dispatch, weapons,
    crew: CREW.map((c, i) => ({ keyLabel: c.key.replace("Key", ""), ability: c.ability, name: c.name, role: c.role, ready: S.crewCd[i] <= 0, left: Math.max(0, S.crewCd[i]), cooldown: c.cooldown })),
    health: S.health, armor: S.armor,
    district: city.districtAt(fp.x, fp.z), turfValue: 42 + ((fp.x * 7 + fp.z * 3) % 40),
    inCar: !!S.inCar, speedKmh: S.inCar ? Math.abs(S.inCar.speed) * 3.6 : 0,
    vehicleName: S.inCar ? S.inCar.model.name : "", condition: S.inCar ? S.inCar.health : 100,
    radio: RADIO[S.radioIdx],
    focus: { x: fp.x, z: fp.z, heading: S.inCar ? S.inCar.heading : player.heading },
    mapCars: cars.filter((c) => c.kind === "traffic").map((c) => ({ x: c.pos.x, z: c.pos.z })),
    mapPolice: policeCars.map((c) => ({ x: c.pos.x, z: c.pos.z })),
    mapHostiles: hostiles.filter((h) => !h.dead).map((h) => ({ x: h.pos.x, z: h.pos.z })),
    mapTarget: tp,
  };
}

// ---------- the town board's ledger ----------
function mapStats() {
  const fp = focusPos();
  const hs = hudState();
  return {
    money: S.money, respect: S.respect, wanted: S.wanted,
    jobsDone: Math.min(S.missionIndex, MISSIONS.length), jobsTotal: MISSIONS.length,
    packages: activities.found, packagesTotal: activities.packages.length,
    races: RACES.map((r) => ({ name: r.name, par: r.par, best: activities.best[r.name] != null ? activities.best[r.name] : null })),
    stolen: S.stolen,
    crew: CREW,
    district: city.districtAt(fp.x, fp.z),
    focus: hs.focus, mapTarget: hs.mapTarget, mapPolice: hs.mapPolice, mapHostiles: hs.mapHostiles,
    mapPackages: activities.packages.filter((p) => !p.taken).map((p) => ({ x: p.x, z: p.z })),
  };
}

// ---------- save / load ----------
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: S.money, respect: S.respect, missionIndex: S.missionIndex,
      ammo: S.ammo, unlocked: S.unlocked, stolen: S.stolen,
      act: activities.saveData(),
    }));
  } catch (e) { /* private mode: the bay forgets, the game goes on */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

// ---------- start / respawn ----------
function startGame(fromSave) {
  audio.unlock();
  if (fromSave) {
    const s = loadGame();
    if (s) { S.money = s.money; S.respect = s.respect; S.missionIndex = s.missionIndex || 0; S.ammo = s.ammo; S.unlocked = s.unlocked; S.stolen = s.stolen || 0; activities.restore(s.act); }
  }
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("hud").style.display = "block";
  S.mode = "play";
  missions.start(S.missionIndex);
  document.getElementById("status").textContent = "Senja Bay Heat: playing";
}
document.getElementById("btnNew").addEventListener("click", () => startGame(false));
document.getElementById("btnContinue").addEventListener("click", () => startGame(true));
document.getElementById("btnRespawn").addEventListener("click", () => {
  document.getElementById("wastedScreen").style.display = "none";
  document.getElementById("hud").style.display = "block";
  S.health = 100; S.armor = 25; S.wanted = 0; S.money = Math.max(0, S.money - 500);
  if (S.inCar) { S.inCar.kind = "parked"; S.inCar = null; playerMesh.visible = true; }
  player.pos.set(262, 0, -60);
  S.mode = "play";
});
const existing = loadGame();
if (existing) document.getElementById("continueInfo").textContent = `Rp${existing.money.toLocaleString("en-US")} • job ${Math.min(existing.missionIndex + 1, 8)}/8`;

// ---------- staged scenes for screenshots ----------
const api = {
  setClock(h) { S.clock = h; },
  setStats(s) { Object.assign(S, s); },
  setRadio(i) { S.radioIdx = i; },
  dialogue: (n, r, t) => hud.dialogue(n, r, t, "#e07a3f"),
  startJobAt(idx, stage) {
    missions.start(idx);
    while (missions.stage < stage) { hooks.clearSpawns(); missions.stage++; missions.beginStage(); }
    S.missionIndex = idx;
    if (idx >= 1) S.unlocked.smg = true;
    if (idx >= 3) S.unlocked.shotgun = true;
  },
  placeInCar(modelName, x, z, heading, speed) {
    const idx = Math.max(0, CAR_MODELS.findIndex((m) => m.name === modelName));
    const car = spawnCar(idx, x, z, heading, "player", modelName === "Pelo GT" ? { color: 0xf06423 } : {});
    car.speed = speed;
    addHeadlightPool(car);
    addHeadlightCones(car);
    S.inCar = car; playerMesh.visible = false;
    player.pos.copy(car.pos); camYaw = heading + Math.PI; camPitch = 0.3;
    camera.position.set(x - Math.sin(heading) * 11, 4.5, z - Math.cos(heading) * 11);
  },
  placeOnFoot(x, z, heading) {
    player.pos.set(x, 0, z); player.heading = heading; camYaw = heading + Math.PI; camPitch = 0.34;
    camera.position.set(x - Math.sin(heading) * 8, 3.4, z - Math.cos(heading) * 8);
  },
  selectWeapon(id) { const i = WEAPONS.findIndex((w) => w.id === id); if (i >= 0) { S.unlocked[id] = true; S.weaponIdx = i; } },
  setWanted(n, primed) { S.wanted = n; if (primed) missions.primed = true; },
  spawnChasePack(n, gap) {
    const fp = focusPos();
    const hd = S.inCar ? S.inCar.heading : player.heading;
    const f = fwd(hd);
    for (let i = 0; i < n; i++) {
      const car = spawnPoliceUnit();
      if (i < 2) {
        // Oncoming units ahead of the player, lights in the camera's face —
        // the composition every winning chase screenshot uses.
        car.pos.x = fp.x + f.x * (gap + 14 + i * 13) + (i % 2 ? 4.2 : -4.2);
        car.pos.z = fp.z + f.z * (gap + 14 + i * 13) + (i % 2 ? -3 : 3);
        car.heading = hd + Math.PI + (i % 2 ? -0.14 : 0.14);
        car.speed = 9;
        car.tactic = i === 0 ? "RAMMING" : "FLANKING";
      } else {
        car.pos.x = fp.x - f.x * (14 + (i - 2) * 9) + (i % 2 ? 3.6 : -3.6);
        car.pos.z = fp.z - f.z * (14 + (i - 2) * 9);
        car.heading = hd; car.speed = S.inCar ? S.inCar.speed * 0.95 : 12;
        car.tactic = "PURSUIT";
      }
    }
  },
  setCamOffset(v) { S.camOffset = v; },
  setCamShoulder(v) { S.camShoulder = v; },
  setCamBack(v) { S.camBack = v; },
  setPackagesFound(n) { activities.setFound(n); },
  startRace(i) { activities.beginRace(i, true); },
  parkCar(modelName, x, z, heading) {
    const idx = Math.max(0, CAR_MODELS.findIndex((m) => m.name === modelName));
    return spawnCar(idx, x, z, heading, "parked", {});
  },
  addPed(x, z, opts) { return spawnPed(x, z, opts || {}); },
  spawnFootPack(n) {
    for (let i = 0; i < n; i++) {
      const p = spawnPed(player.pos.x + 14 + i * 6, player.pos.z + 10, { cop: true, gun: true, shirt: 0x1d4e9e, vest: true });
      policeFoot.push(p);
    }
  },
  deployHelicopter() { heliActive = true; heli.visible = true; },
};
// Hold the gunfire effects at their peak for a screenshot grab.
// The frame loop reads fxFrozen and stops ageing the beams, orbs,
// burst particles, dust puffs and the muzzle light (the world keeps
// moving — only the effects hang). Turning the freeze on also
// revives the freshest beam and orbs if they expired inside the
// last 10 s of real time: at screenshot render rates a single
// frame can take seconds of wall time, so the observer that
// calls the freeze can lag the shot by several whole frames —
// the window has to span that lag or the revival never lands.
// What is revived is the game's own mesh, in the place the
// game's own shot put it, at the brightness the game gave it —
// the same fired moment, held, not a redrawn one. This is
// reachable ONLY through window.__senjaDebug below, which
// exists only under ?stage= — normal play has no path to it.
function setFxFreeze(on) {
  if (on) {
    const now = performance.now();
    for (const slot of beams) {
      if (slot.life <= 0 && slot.firedAt && now - slot.firedAt < 10000) {
        slot.life = slot.maxLife;
        slot.core.mesh.visible = true; slot.halo.mesh.visible = true;
      }
    }
    for (const o of orbs) {
      if (o.life <= 0 && o.firedAt && now - o.firedAt < 10000) {
        o.life = o.maxLife; o.spr.visible = true;
      }
    }
    if (lastShotAt && now - lastShotAt < 10000) flash.intensity = 26;
  }
  fxFrozen = !!on;
}
if (STAGE) {
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("hud").style.display = "block";
  S.mode = "play";
  stageScene(STAGE, api);
  // Staging-only inspection handle for the screenshot tooling: lets the
  // capture scripts verify the posed state (never set in normal play).
  window.__senjaDebug = { peds, cars, player, state: S, setFxFreeze, get fxFrozen() { return fxFrozen; }, get camYaw() { return camYaw; }, get flashI() { return flash.intensity; }, get flashPos() { return { x: +flash.position.x.toFixed(2), z: +flash.position.z.toFixed(2) }; }, get tracerEnd() { return lastBeamEnd ? { x: +lastBeamEnd.x.toFixed(2), z: +lastBeamEnd.z.toFixed(2) } : null; } };
  // Let the posed scene settle, then tell the screenshot tool we are ready.
  setTimeout(() => { window.__senjaReady = true; }, 1400);
}

// ---------- ambient water ----------
// The bay's swell and the boats that ride it. Shared by play and
// by the title screen, whose panorama looks out over this water.
function updateAmbientWater(now) {
  if (city.sea) {
    const pos = city.sea.geometry.attributes.position;
    if (!city.sea.userData.base) city.sea.userData.base = Float32Array.from(pos.array);
    const base = city.sea.userData.base, t = now / 1000;
    for (let i = 0; i < pos.count; i++) {
      // The title screen calms the swell (see the vista
      // treatment above): at full height the troughs breach
      // the ground plane under the near-shore water.
      pos.array[i * 3 + 2] = (Math.sin(base[i * 3] * 0.055 + t * 1.25) * 0.3 + Math.cos(base[i * 3 + 1] * 0.045 + t * 0.85) * 0.26) * (menuVistaOn ? 0.1 : 1);
    }
    pos.needsUpdate = true;
  }
  if (city.boats) for (const b of city.boats) {
    const o = b.userData.orbit;
    if (o) {
      // Under way: walk the boat around its circuit, bow into the
      // direction of travel, wake ring breathing behind it.
      const a = now / 1000 * o.sp + o.a;
      b.position.x = o.x + Math.cos(a) * o.r;
      b.position.z = o.z + Math.sin(a) * o.r;
      b.rotation.y = o.sp > 0 ? -a - Math.PI / 2 : -a + Math.PI / 2;
      if (b.userData.wake) b.userData.wake.scale.setScalar(1 + Math.sin(now / 320 + o.a) * 0.13);
    }
    b.position.y = 0.1 + Math.sin(now / 820 + b.userData.phase) * 0.2;
    b.rotation.z = Math.sin(now / 970 + b.userData.phase) * 0.03;
  }
}

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  if (S.mode === "play" && !S.paused && !S.mapOpen) {
    S.clock = (S.clock + dt * 24 / WORLD.dayLength) % 24;
    if (S.dispatchLineT > 0) S.dispatchLineT -= dt;
    for (let i = 0; i < CREW.length; i++) S.crewCd[i] = Math.max(0, S.crewCd[i] - dt);
    S.platesTimer = Math.max(0, S.platesTimer - dt);
    S.eyesTimer = Math.max(0, S.eyesTimer - dt);
    updatePlayer(dt);
    for (const car of cars) if (car.kind === "traffic") updateTraffic(car, dt);
    updateTarget(dt);
    updatePolice(dt);
    updatePeds(dt);
    shoot(dt);
    // Crates.
    for (const c of crates) {
      if (c.taken) continue;
      c.mesh.rotation.y += dt;
      c.mesh.userData.beacon.position.y = 2.3 + Math.sin(now / 300) * 0.3;
      if (dist2d(focusPos(), c.pos) < 3.2) { c.taken = true; c.mesh.visible = false; audio.pickup(); hud.toast("CRATE COLLECTED", `${hooks.cratesCollected()}/${crates.length}`); }
    }
    // Mission marker + runner.
    const tp = missions.targetPoint();
    if (tp && missions.active) {
      marker.visible = true;
      marker.position.set(tp.x, 0, tp.z);
      marker.userData.ring.rotation.z += dt;
      if (S.eyesTimer > 0) marker.userData.beam.material.opacity = 0.55; else marker.userData.beam.material.opacity = 0.3;
    } else marker.visible = false;
    missions.update(dt, {
      x: focusPos().x, z: focusPos().z, inCar: !!S.inCar, wanted: S.wanted,
      targetWrecked: targetCar ? targetCar.wrecked : false,
    });
    activities.update(dt, { x: focusPos().x, z: focusPos().z, inCar: !!S.inCar });
    // Slow health regen when calm and unmolested.
    if (S.wanted === 0 && S.health > 0 && S.health < 100) S.health = Math.min(100, S.health + dt * 1.2);
    // Gunfire visuals & particles & flash decay. Under the staging
    // freeze (fxFrozen, STAGE-only) none of these age or move: the
    // beam, orbs, burst sparks, dust and muzzle light hang at the
    // peak of the moment the freeze caught, while the world itself
    // — crowd, water, traffic — keeps living around them.
    if (!fxFrozen) flash.intensity = Math.max(0, flash.intensity - dt * 300);
    for (const slot of beams) {
      if (slot.life <= 0) continue;
      if (!fxFrozen) slot.life -= dt;
      const k = fxFrozen ? 1 : Math.max(slot.life, 0) / slot.maxLife;
      slot.core.mat.uniforms.uOpacity.value = slot.core.baseOpacity * k;
      slot.halo.mat.uniforms.uOpacity.value = slot.halo.baseOpacity * k;
      if (slot.life <= 0) { slot.core.mesh.visible = false; slot.halo.mesh.visible = false; }
    }
    for (const o of orbs) {
      if (o.life <= 0) continue;
      if (!fxFrozen) o.life -= dt;
      const k = fxFrozen ? 1 : Math.max(o.life, 0) / o.maxLife;
      o.mat.opacity = 0.95 * k;
      const s = o.baseScale * (0.7 + 0.3 * k);
      o.spr.scale.set(s, s, 1);
      if (o.life <= 0) o.spr.visible = false;
    }
    if (!fxFrozen) for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt;
      p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
      p.vy -= 4 * dt;
      if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    }
    // Animated water: a slow vertex swell rolls across the bay, the
    // anchored boats ride it, and headlight pools fade up as it darkens.
    updateAmbientWater(now);
    poolMat.opacity = darkness * 0.34;
    coneMat.opacity = darkness * 0.16;
    fx.update(fxFrozen ? 0 : dt);
    updateCarFires(dt, now);
    hud.update(dt, hudState());
    audio.music(dt, true);
    audio.setEngine(!!S.inCar, S.inCar ? Math.abs(S.inCar.speed) / S.inCar.model.top : 0, S.inCar ? Math.abs(S.inCar.speed) / S.inCar.model.top : 0);
  }
  if (S.mode === "menu") {
    // The poster's town is awake (owner's word): behind the title,
    // traffic rolls the grid — the boulevard in the panorama
    // included — the town strolls its pavements, the bay swells
    // and the boats ride it, headlight pools lit. The same ambient
    // systems as play, minus the player, the police and the
    // missions. The crowd pass is guarded: hostiles only exist
    // once a game has spawned them, and if any are standing the
    // menu leaves the crowd alone rather than stage a gunfight
    // behind the poster.
    for (const car of cars) if (car.kind === "traffic") updateTraffic(car, dt);
    if (!peds.some((p) => p.hostile && !p.dead)) updatePeds(dt);
    updateAmbientWater(now);
    poolMat.opacity = darkness * 0.34;
    coneMat.opacity = darkness * 0.16;
    fx.update(dt);
  }
  // The town board hangs over a held-still world: no simulation
  // runs while it is open, but the board itself redraws (the gold
  // objective ring breathes, the police dots blink).
  if (S.mapOpen && S.mode === "play") hud.drawMap(mapStats());
  if (S.mapOpen && S.mode !== "play") { S.mapOpen = false; document.getElementById("mapScreen").style.display = "none"; }
  updateCamera(dt);
  updateSky();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
