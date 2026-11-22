// main.js — SENJA BAY HEAT: boot, the game loop, and every live system that
// does not live in its own module: the player on foot and in cars, arcade
// driving, traffic, pedestrians, the SBPD wanted response (cars, roadblocks,
// foot units and the Air One helicopter), combat, crew abilities, the day
// cycle, saving, and the staged screenshot scenes.

import * as THREE from "three";
import { WORLD, WEAPONS, CAR_MODELS, CREW, RADIO, SAVE_KEY } from "./config.js";
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
const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.9);
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
  clock: 15.5,             // hour of day
  money: 850, respect: 0,
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
};

// ---------- player ----------
const playerMesh = buildPersonMesh({ shirt: 0xd8493b, pants: 0x22304a, cap: 0x14202e });
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
const bayModels = [0, 1, 3, 4, 5, 0, 4, 1];
let bayK = 0;
for (let z = -258, i = 0; z <= 258; z += 30, i++) {
  const nearJunction = Math.abs(z % 95) < 15 || Math.abs(z % 95) > 80;
  if (nearJunction) continue;   // keep junction mouths clear
  spawnCar(bayModels[bayK++ % bayModels.length], 276, z, 0, "parked");
  if (i % 2 === 0) spawnCar(bayModels[bayK++ % bayModels.length], 294, z + 8, Math.PI, "parked");
  else spawnCar(6, 294, z + 8, Math.PI, "parked");
}
for (let x = -240; x <= 240; x += 30) {
  if (Math.abs(x) < 30 || Math.abs(x - 95) < 15 || Math.abs(x + 95) < 15 || Math.abs(x - 190) < 15 || Math.abs(x + 190) < 15) continue;
  spawnCar(bayModels[bayK++ % bayModels.length], x, -9.5, Math.PI / 2, "parked");
  if (x % 60 === 0) spawnCar(bayModels[bayK++ % bayModels.length], x + 14, 9.5, -Math.PI / 2, "parked");
}
// Working vehicles where they belong: box trucks on the port apron,
// scooters by the market and the hills.
spawnCar(7, 150, 205, 0.3, "parked");
spawnCar(7, 255, 228, -0.4, "parked");
spawnCar(6, -160, 152, 1.2, "parked");
spawnCar(6, -238, -256, 0.7, "parked");
spawnCar(6, 297, -120, Math.PI, "parked");
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
    tx: x, tz: z, hostile: !!opts.hostile, health: opts.hostile ? 60 : 30, cop: !!opts.cop, dead: false, shootCd: 1 + Math.random() * 2, flee: 0 };
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
    camPitch = clamp(camPitch + e.movementY * 0.0024, 0.06, 1.05);
  }
});

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
function commitCrime(level) {
  if (S.platesTimer > 0) level = Math.min(level, S.wanted);
  S.wanted = clamp(Math.max(S.wanted, level), 0, 5);
  S.searchTimer = 0; S.searching = false;
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
  }
  if (best.kind === "parked" && best.model.name === "Pelo GT" && missions.index === 0 && missions.stage === 0) commitCrime(2);
  best.kind = "player";
  addHeadlightPool(best);
  addHeadlightCones(best);
  S.inCar = best;
  playerMesh.visible = false;
  audio.unlock();
}

// ---------- combat ----------
const tracers = [];
const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9 });
const flash = new THREE.PointLight(0xffc46b, 0, 18);
scene.add(flash);
let fireTimer = 0;
const particles = [];
const particleGeo = new THREE.SphereGeometry(0.1, 5, 5);
function burst(pos, color, n, spread, up) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({ color }));
    m.position.copy(pos);
    scene.add(m);
    particles.push({ mesh: m, vx: (Math.random() - 0.5) * spread, vy: Math.random() * up, vz: (Math.random() - 0.5) * spread, life: 0.3 + Math.random() * 0.3 });
  }
}
function shoot(dt) {
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
  flash.position.copy(origin).addScaledVector(dir, 1.2); flash.intensity = 26;
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
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin.clone().setY(1.45), end.setY(1.3)]), tracerMat);
  scene.add(line); tracers.push({ line, life: 0.07 });
  if (hit) {
    burst(end, 0xffd166, 5, 3, 2.5);
    if (hit.health !== undefined && hit.kind === undefined) { // a person
      hit.health -= w.damage; audio.hit();
      if (hit.health <= 0 && !hit.dead) {
        hit.dead = true; hit.mesh.rotation.x = Math.PI / 2; hit.mesh.position.y = 0.3;
        if (hit.hostile) commitCrime(3); else if (hit.cop) commitCrime(4); else commitCrime(3);
      } else if (hit.hostile) hit.flee = 0; else hit.flee = 5;
    } else if (hit.kind) { // a car
      damageCar(hit, w.damage * 0.7, end);
      if (hit === targetCar) commitCrime(3);
    }
  }
  if (w.id !== "fists") commitCrime(Math.max(S.wanted, 2));
}
function damageCar(car, dmg, at) {
  if (car.wrecked) return;
  car.health -= dmg;
  if (at && !(STAGE && car === S.inCar)) burst(at, 0xff9f43, 4, 2.5, 2);
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
      // Close in to range, then strafe and shoot.
      if (dPlayer > 17) { p.heading = Math.atan2(fp.x - p.pos.x, fp.z - p.pos.z); move = 4.6; }
      else {
        move = 0; p.heading = Math.atan2(fp.x - p.pos.x, fp.z - p.pos.z);
        p.shootCd -= dt;
        if (p.shootCd <= 0) {
          p.shootCd = 0.9 + Math.random() * 0.9;
          audio.shoot("smg");
          burst(new THREE.Vector3(fp.x, 1.2, fp.z), 0xff6b81, 2, 2, 1.5);
          if (S.inCar) damageCar(S.inCar, 2, null); else hurtPlayer(4);
        }
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
    // Run over by the player's car.
    if (S.inCar && Math.abs(S.inCar.speed) > 6 && dist2d(p.pos, S.inCar.pos) < 2.4) {
      p.dead = true; p.mesh.rotation.x = Math.PI / 2; p.mesh.position.y = 0.3;
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
  playerMesh.rotation.y = player.heading;
  animatePerson(playerMesh, player.phase, moving ? run : 0);
  audio.setEngine(false, 0, 0);
}

// ---------- camera, light, day cycle ----------
function updateCamera(dt) {
  const fp = focusPos();
  const heading = S.inCar ? S.inCar.heading : player.heading;
  if (!pointerLocked) camYaw = angleLerp(camYaw, heading + Math.PI + S.camOffset, dt * (S.inCar ? 2.2 : 1.4));
  const dist = S.inCar ? 9.6 : 5.8, height = S.inCar ? 3.3 : 2.5;
  const back = { x: Math.sin(camYaw) * Math.cos(camPitch), z: Math.cos(camYaw) * Math.cos(camPitch) };
  const tx = fp.x + back.x * dist, tz = fp.z + back.z * dist;
  camera.position.lerp(new THREE.Vector3(tx, fp.y + height + Math.sin(camPitch) * dist * 0.55, tz), 1 - Math.pow(0.0001, dt));
  camera.lookAt(fp.x, fp.y + 1.6, fp.z);
  sun.position.set(fp.x + 90, 130, fp.z + 50);
  sun.target.position.set(fp.x, 0, fp.z);
}
let darkness = 0;   // 0 at noon, 1 at deep night; updateSky owns it
const EMBER = new THREE.Color(0xff8a4a);
function updateSky() {
  const h = S.clock;
  // Sunrise 06:30, sunset 19:30; a long golden dusk band centred on 19:00.
  const day = clamp(Math.sin(((h - 6.5) / 13) * Math.PI), 0, 1);
  const dusk = clamp(1 - Math.abs(h - 19.0) / 2.1, 0, 1);
  const lightLevel = clamp(day * 1.25 + dusk * 0.55, 0, 1);
  darkness = 1 - lightLevel;
  const skyCol = new THREE.Color(0x1c2a4a).lerp(new THREE.Color(0x87b5d9), lightLevel).lerp(new THREE.Color(0xff9a5c), dusk * 0.4);
  scene.background.copy(skyCol);
  scene.fog.color.copy(skyCol).lerp(new THREE.Color(0xffffff), 0.25);
  if (city.skyDome) {
    // The dome carries the gradient; tint it from night navy to full day.
    city.skyDome.userData.mat.color.setRGB(
      0.22 + lightLevel * 0.78 + dusk * 0.25,
      0.26 + lightLevel * 0.74,
      0.45 + lightLevel * 0.55);
  }
  // The look stays bright and stylised at every hour: the sun never drops
  // below a moonlight floor, and the hemisphere fill does most of the work.
  sun.intensity = 0.8 + day * 1.6 + dusk * 0.6;
  sun.color.setHex(dusk > 0.35 ? 0xffb37a : day < 0.2 ? 0xaac4ff : 0xffe3b3);
  hemi.intensity = 0.78 + day * 0.3;
  // The sun disc deepens to ember orange as the dusk band peaks, and the
  // dome's horizon band (already warm in the gradient) picks it up.
  if (city.skyDome && city.skyDome.userData.sunDisc) {
    city.skyDome.userData.sunDisc.material.color.setHex(0xfff2c0).lerp(EMBER, dusk * 0.85);
  }
  const night = lightLevel < 0.45;
  for (const lamp of city.lamps) lamp.material.color.setHex(night ? 0xffe9a8 : 0x8a8f96);
  for (const pl of city.nightLights) pl.intensity = lightLevel < 0.3 ? 520 : 0;
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

// ---------- save / load ----------
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: S.money, respect: S.respect, missionIndex: S.missionIndex,
      ammo: S.ammo, unlocked: S.unlocked,
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
    if (s) { S.money = s.money; S.respect = s.respect; S.missionIndex = s.missionIndex || 0; S.ammo = s.ammo; S.unlocked = s.unlocked; activities.restore(s.act); }
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
if (STAGE) {
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("hud").style.display = "block";
  S.mode = "play";
  stageScene(STAGE, api);
  // Staging-only inspection handle for the screenshot tooling: lets the
  // capture scripts verify the posed state (never set in normal play).
  window.__senjaDebug = { peds, cars, player, state: S, get camYaw() { return camYaw; }, get flashI() { return flash.intensity; }, get flashPos() { return { x: +flash.position.x.toFixed(2), z: +flash.position.z.toFixed(2) }; }, get tracerEnd() { const t = tracers[tracers.length - 1]; if (!t) return null; const a = t.line.geometry.attributes.position; return { x: +a.getX(1).toFixed(2), z: +a.getZ(1).toFixed(2) }; } };
  // Let the posed scene settle, then tell the screenshot tool we are ready.
  setTimeout(() => { window.__senjaReady = true; }, 1400);
}

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  if (S.mode === "play" && !S.paused) {
    S.clock = (S.clock + dt * 24 / WORLD.dayLength) % 24;
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
    // Tracers & particles & flash decay.
    flash.intensity = Math.max(0, flash.intensity - dt * 300);
    for (let i = tracers.length - 1; i >= 0; i--) { tracers[i].life -= dt; if (tracers[i].life <= 0) { scene.remove(tracers[i].line); tracers.splice(i, 1); } }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt;
      p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
      p.vy -= 4 * dt;
      if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    }
    // Animated water: a slow vertex swell rolls across the bay, the
    // anchored boats ride it, and headlight pools fade up as it darkens.
    if (city.sea) {
      const pos = city.sea.geometry.attributes.position;
      if (!city.sea.userData.base) city.sea.userData.base = Float32Array.from(pos.array);
      const base = city.sea.userData.base, t = now / 1000;
      for (let i = 0; i < pos.count; i++) {
        pos.array[i * 3 + 2] = Math.sin(base[i * 3] * 0.055 + t * 1.25) * 0.3 + Math.cos(base[i * 3 + 1] * 0.045 + t * 0.85) * 0.26;
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
    poolMat.opacity = darkness * 0.36;
    coneMat.opacity = darkness * 0.14;
    fx.update(dt);
    hud.update(dt, hudState());
    audio.music(dt, true);
    audio.setEngine(!!S.inCar, S.inCar ? Math.abs(S.inCar.speed) / S.inCar.model.top : 0, S.inCar ? Math.abs(S.inCar.speed) / S.inCar.model.top : 0);
  }
  updateCamera(dt);
  updateSky();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
