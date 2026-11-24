// main.js — Senja Bay Heat: the game itself. State, input, people
// and traffic, the SBPD's wanted system, gunfire through the streak
// effects, the eight story jobs, races and packages, the camera the
// screenshot casts measured, and the loop that ties it together.
// Presentation lives in hud.js, the world in city.js, bodies in
// actors.js, ballistics in effects.js; this file is the referee.

import { WORLD, DISTRICTS, RANKS, WEAPONS, CAR_FAMILIES, CAR_PAINTS, RADIO, DISPATCH_PREFIXES, DISPATCH_TACTICS, DISPATCH_LINES, CREW, SAVE_KEY, DAY_START } from "./config.js";
import { City, isOnRoad, roadLines } from "./city.js";
import { Effects } from "./effects.js";
import { HUD } from "./hud.js";
import { SoundBank } from "./audio.js";
import { buildPerson, buildGunMesh, buildHeroGunMesh, buildCarMesh, giveGun, updateAimPose, updateGunAnchor, gunMuzzleWorld, animatePerson, settleCorpse } from "./actors.js";
import { JOBS, stageObjective } from "./missions.js";
import { RACES, PACKAGE_SPOTS, RaceDirector, racesWon, completionPct } from "./activities.js";
import { applyStage } from "./shots.js";
import * as THREE from "../vendor/three.min.js";

// The vendored three.js is an ES module build: take its namespace
// and publish it where the sibling modules reach for it.
window.THREE = THREE;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const rand = (a, b) => a + Math.random() * (b - a);
const STAGING = new URLSearchParams(location.search).has("stage");

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.36;
$("gl").appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe08a52, 200, 1350);
const camera = new THREE.PerspectiveCamera(63, window.innerWidth / window.innerHeight, 0.1, 3200);

const city = new City(scene);
const fx = new Effects(scene);
const hud = new HUD();
const sound = new SoundBank();
fx.onCasingLand = () => sound.casingTick();

// ---------- state ----------
function freshState() {
  return {
    clock: DAY_START, money: 250, respect: 0, health: 100, armour: 0,
    missionIndex: 0, stageIndex: 0, stageLeft: 0,
    wanted: 0, heat: 0, ammo: { pistol: 48, smg: 120, shotgun: 12 },
    unlocked: { pistol: true, smg: false, shotgun: false },
    weapon: "pistol", stolen: 0,
    act: { best: {}, taken: [] },
    inCar: null, camOffset: 0, camShoulder: 0, camBack: 0,
    crewCd: { plates: 0, fix: 0, eyes: 0 },
    radioIdx: 0, muted: false, hiddenT: 0, eyesOutT: 0, dead: false,
  };
}
let S = freshState();

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: S.money, respect: S.respect, missionIndex: S.missionIndex, stageIndex: S.stageIndex,
      ammo: S.ammo, unlocked: S.unlocked, stolen: S.stolen, act: S.act,
      health: S.health, armour: S.armour,
    }));
  } catch (e) { /* private mode: the bay forgets, the game goes on */ }
}
function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function refreshContinue() {
  const sv = readSave();
  $("continueInfo").textContent = sv ? `Rp${Math.round(sv.money).toLocaleString("en-US")} • job ${(sv.missionIndex || 0) + 1}/8` : "no save";
}

// ---------- entities ----------
const peds = [];
const cars = [];
let pedSeq = 0;

const RAKA_LOOK = { skin: 0xc98d5f, shirt: 0x0d5c63, pants: 0x22252a, cap: 0x1d2126 };
const GANG_SHIRTS = [0x7d3c98, 0x9b2d8f, 0x6c3483, 0x8e44ad];
const CIV_SHIRTS = [0xd9c9a8, 0x7fb3d5, 0xe5989b, 0xa3c585, 0xf0e6d2, 0x5d8aa8, 0xd35450, 0xf5b041];

function spawnPed(kind, x, z, opts = {}) {
  let look, gunKind = null;
  if (kind === "gang") {
    look = { skin: [0xe8b98d, 0xc98d5f, 0x9c6b43][pedSeq % 3], shirt: GANG_SHIRTS[pedSeq % 4], pants: 0x1e2023, bandana: 0xffd21f };
    gunKind = "smg";
  } else if (kind === "crew") {
    look = opts.look || { skin: 0x9c6b43, shirt: 0x8a5a2e, pants: 0x2a2d33, cap: 0x3a3f45 };
  } else {
    look = { skin: [0xe8b98d, 0xc98d5f, 0x9c6b43, 0x7a4f2e][pedSeq % 4], shirt: CIV_SHIRTS[pedSeq % CIV_SHIRTS.length], pants: [0x2e4053, 0x4a3728, 0x23262b, 0x5d6d7e][pedSeq % 4] };
    if (pedSeq % 3 === 0) look.hair = 0x241a12;
  }
  const mesh = buildPerson(look);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = opts.heading || 0;
  scene.add(mesh);
  const ped = {
    id: pedSeq++, kind, pos: mesh.position, heading: opts.heading || 0, mesh,
    health: opts.health != null ? opts.health : 100, dead: false,
    hostile: kind === "gang", crew: !!opts.crew, mission: !!opts.mission,
    speed: 0, shootCd: rand(0.4, 1.2), fireAnimT: 0, lastShotT: -9,
    home: { x, z }, wanderT: rand(0, 3), tx: x, tz: z, fleeT: 0,
    name: opts.name || "", gunKind,
  };
  if (gunKind) giveGun(mesh, buildGunMesh(gunKind));
  if (kind === "crew" && opts.heroGun) giveGun(mesh, buildHeroGunMesh());
  peds.push(ped);
  return ped;
}

function familyOf(key) { return CAR_FAMILIES.find((f) => f.key === key) || CAR_FAMILIES[0]; }

function spawnCar(familyKey, paint, x, z, heading, kind) {
  const family = familyOf(familyKey);
  const mesh = buildCarMesh(family, paint);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  const car = {
    family, paint, kind: kind || "traffic", pos: mesh.position, heading, mesh,
    speed: 0, health: 100, condition: 100, wrecked: false,
    countedTheft: false, dispatchName: "", tactic: "PURSUIT",
    laneLine: 0, laneAxis: "z", laneDir: 1, cruise: family.top * rand(0.45, 0.6),
    aiT: rand(0, 2), steerVis: 0,
  };
  cars.push(car);
  return car;
}

// The player.
const playerMesh = buildPerson(RAKA_LOOK);
scene.add(playerMesh);
const player = { pos: playerMesh.position, heading: Math.PI, mesh: playerMesh, fireCd: 0, trigger: false, lastShotT: -9, speed: 0 };
player.pos.set(285, 0, -52);
playerMesh.rotation.y = Math.PI;
giveGun(playerMesh, buildGunMesh("pistol"));

function setPlayerWeapon(key) {
  S.weapon = key;
  if (key === "fists") giveGun(playerMesh, null);
  else if (key === "smg") giveGun(playerMesh, buildHeroGunMesh());
  else giveGun(playerMesh, buildGunMesh(key));
}

// ---------- population ----------
function populate() {
  // Civilians on their errands, everywhere the light is good.
  for (let i = 0; i < 46; i++) {
    const line = roadLines()[i % roadLines().length];
    const along = rand(-360, 360);
    const side = (i % 2 ? 1 : -1) * rand(13, 17);
    if (i % 2) spawnPed("civ", line + side, along); else spawnPed("civ", along, line + side);
  }
  // Ambient Kerang Boys on their corners.
  const gangSpots = [
    [200.2, 189.9], [203.3, 190.3], [206.5, 193.5], [208.5, 196.8], [209.7, 198.6], [208.0, 200.8],
    [222, 232], [196, 244], [-212, 104], [-204, 116], [-224, 110], [-150, -120], [-142, -112], [24, 66],
  ];
  for (const [x, z] of gangSpots) spawnPed("gang", x, z, { heading: rand(0, 6.28) });
  // Traffic: a living grid.
  const fams = ["coupe", "kijang", "bemo", "pelo", "coupe", "kijang"];
  for (let i = 0; i < 16; i++) {
    const fam = fams[i % fams.length];
    const line = roadLines()[(i * 2) % roadLines().length];
    const axis = i % 2 ? "x" : "z";
    const dir = i % 3 ? 1 : -1;
    const along = rand(-330, 330);
    const laneOff = 3.4 * dir;
    const car = axis === "z"
      ? spawnCar(fam, CAR_PAINTS[i % CAR_PAINTS.length], line + laneOff, along, dir > 0 ? 0 : Math.PI, "traffic")
      : spawnCar(fam, CAR_PAINTS[(i + 3) % CAR_PAINTS.length], along, line - laneOff, dir > 0 ? Math.PI / 2 : -Math.PI / 2, "traffic");
    car.laneLine = line; car.laneAxis = axis; car.laneDir = dir;
    car.speed = car.cruise * 0.7;
  }
  // Parked cars along the kerbs — the strand row the title frame loves.
  const parked = [
    ["kijang", 0xc23b2a, 293.6, 170, 1.516], ["coupe", 0x2471a3, 293.6, 230, 1.516],
    ["coupe", 0x2c3e50, 293.6, 118, 1.516], ["bemo", 0xe9c46a, 293.6, -30, 1.516],
    ["kijang", 0x2e8b6e, 276.5, -120, -1.62], ["coupe", 0x7d3c98, -80, 82.5, Math.PI / 2],
    ["bemo", 0xd9a441, -188, 82.5, Math.PI / 2], ["kijang", 0x707b7c, 108, -82.5, -Math.PI / 2],
    ["coupe", 0xe8e4da, 150, 178, 0.2], ["kijang", 0x148f77, -40, -178, Math.PI],
    ["bemo", 0xb03a5b, -262, -82.5, Math.PI / 2], ["coupe", 0xc23b2a, 40, 272.5, 0],
  ];
  for (const [fam, paint, x, z, h] of parked) spawnCar(fam, paint, x, z, h, "parked");
}
populate();

// Police pool: six cruisers, asleep at the depot until the bay calls.
const policePool = [];
for (let i = 0; i < 6; i++) {
  const c = spawnCar("cruiser", 0xf2f3f5, 60 + i * 6, 330, Math.PI, "police");
  c.active = false; c.mesh.visible = false;
  policePool.push(c);
}

// Air One: a dark shape, a rotor, and a cone of light that owns the street.
const heli = (() => {
  const grp = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x22262b });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 5.2), bodyMat); grp.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.4), bodyMat); tail.position.set(0, 0.3, -4.4); grp.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.06, 0.7), bodyMat); rotor.position.y = 1.1; grp.add(rotor);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(10, 46, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  cone.position.y = -24; grp.add(cone);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = -51.4;
  grp.add(pool);
  grp.visible = false;
  scene.add(grp);
  return { grp, rotor, active: false };
})();

// Packages: gold parcels with a halo, bobbing over their corners.
const packageMeshes = PACKAGE_SPOTS.map((spot, i) => {
  const grp = new THREE.Group();
  const boxM = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), new THREE.MeshLambertMaterial({ color: 0xd8a83c, emissive: 0x6a4a08 }));
  boxM.position.y = 0.8; boxM.castShadow = true; grp.add(boxM);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.y = 0.8; grp.add(halo);
  grp.position.set(spot.x, 0, spot.z);
  scene.add(grp);
  return { grp, boxM, id: i };
});

// Race gates: two green posts and a banner per course + one roaming
// checkpoint pillar that marks the live route.
const gateMeshes = RACES.map((race) => {
  const grp = new THREE.Group();
  const postMat = new THREE.MeshBasicMaterial({ color: 0x39d98a });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.4, 0.4), postMat);
    const right = { x: Math.cos(race.gate.heading), z: -Math.sin(race.gate.heading) };
    post.position.set(race.gate.x + right.x * 6 * s, 2.7, race.gate.z + right.z * 6 * s);
    grp.add(post);
  }
  scene.add(grp);
  return grp;
});
const checkpointMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(6, 6, 16, 20, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
);
checkpointMesh.visible = false;
scene.add(checkpointMesh);
const races = new RaceDirector();

// ---------- input ----------
const keys = {};
let camYaw = Math.PI * 2, camPitchDrag = -75;
let triggerHeld = false, pointerLocked = false, started = false, paused = false, boardOpen = false;
let mouseLookT = -9;

window.addEventListener("keydown", (e) => {
  if (e.code === "Tab") { e.preventDefault(); if (started && !S.dead) toggleBoard(); return; }
  keys[e.code] = true;
  if (!started) return;
  sound.wake();
  if (e.code === "KeyP") { paused = !paused; $("pausedTag").style.display = paused ? "" : "none"; }
  if (e.code === "KeyM") { S.muted = !S.muted; sound.setMuted(S.muted); hud.toast(S.muted ? "SOUND OFF" : "SOUND ON", ""); }
  if (e.code === "Digit1") tryWeapon("fists");
  if (e.code === "Digit2") tryWeapon("pistol");
  if (e.code === "Digit3") tryWeapon("smg");
  if (e.code === "Digit4") tryWeapon("shotgun");
  if (e.code === "KeyE") interact();
  if (e.code === "KeyZ") crewAbility("plates");
  if (e.code === "KeyX") crewAbility("fix");
  if (e.code === "KeyC") crewAbility("eyes");
  if (e.code === "KeyR" && S.inCar) { S.radioIdx = (S.radioIdx + 1) % RADIO.length; hud.toast("OMBAK FM 98.4", RADIO[S.radioIdx].track); }
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });
window.addEventListener("mousemove", (e) => {
  if (!started) return;
  if (pointerLocked) {
    camYaw -= e.movementX * 0.0032;
    camPitchDrag = clamp(camPitchDrag + e.movementY, -160, 160);
    mouseLookT = perfNow();
  } else if (STAGING && e.buttons === 1) {
    camYaw -= e.movementX * 0.0032;
    camPitchDrag = clamp(camPitchDrag + e.movementY, -160, 160);
    mouseLookT = perfNow();
  }
});
renderer.domElement.addEventListener("mousedown", (e) => {
  sound.wake();
  if (!started || paused || boardOpen) return;
  triggerHeld = true;
  if (!STAGING && !pointerLocked) {
    try { renderer.domElement.requestPointerLock(); } catch (err) { /* headless: fire anyway */ }
  }
});
window.addEventListener("mouseup", () => { triggerHeld = false; });
document.addEventListener("pointerlockchange", () => { pointerLocked = document.pointerLockElement === renderer.domElement; });
window.addEventListener("blur", () => { for (const k of Object.keys(keys)) keys[k] = false; triggerHeld = false; });

function perfNow() { return performance.now() / 1000; }

function tryWeapon(key) {
  if (key !== "fists" && !S.unlocked[key]) { sound.denied(); hud.toast("LOCKED", "That iron is not yours yet — work the jobs."); return; }
  setPlayerWeapon(key);
}

// ---------- crime & wanted ----------
let crimeCd = 0, lastSeenT = -99, dispatchLineT = 0;
function addHeat(points) {
  if (S.wanted >= 5) { S.heat = 0; return; }
  S.heat += points;
  while (S.heat >= 100 && S.wanted < 5) { S.wanted++; S.heat -= 100; onStarUp(); }
}
function onStarUp() {
  hud.toast("WANTED " + "★".repeat(S.wanted), S.wanted >= 4 ? "Air One is overhead." : "SBPD units are rolling.");
  setDispatchLine(S.wanted >= 4 ? 2 : 1);
}
function setDispatchLine(i) { S.dispatchLine = DISPATCH_LINES[i % DISPATCH_LINES.length]; dispatchLineT = 9; }

function policeSeen() {
  if (S.wanted === 0) return false;
  if (heli.active) return true;
  if (S.eyesOutT > 0) return false;
  const fp = focusPos();
  for (const c of policePool) {
    if (!c.active) continue;
    if (Math.hypot(c.pos.x - fp.x, c.pos.z - fp.z) < 72) return true;
  }
  return false;
}

function focusPos() { return S.inCar ? S.inCar.pos : player.pos; }

// ---------- combat ----------
function aimYawNow() { return camYaw - Math.PI; }

function muzzleOf(ped) {
  const w = gunMuzzleWorld(ped.mesh);
  if (w) return w;
  const f = new THREE.Vector3(Math.sin(ped.heading), 0, Math.cos(ped.heading));
  return ped.pos.clone().addScaledVector(f, 0.45).add(new THREE.Vector3(0, 1.32, 0));
}

function fireShot(shooter, weaponKey, targetPed, aimPoint) {
  const THREEv = THREE;
  const from = muzzleOf(shooter);
  const to = aimPoint.clone();
  const isPlayer = shooter === player;
  fx.flash(from, weaponKey === "shotgun" ? 0.8 : 0.5);
  fx.fireStreak(from, to, isPlayer ? 0xffdf9e : 0xff9a5e, isPlayer ? 120 : 110);
  const back = new THREEv.Vector3(Math.sin(shooter.heading), 0, Math.cos(shooter.heading));
  fx.ejectCasing(from.clone().addScaledVector(back, -0.4).add(new THREEv.Vector3(0, -0.04, 0)), shooter.heading);
  sound.shot(weaponKey);
  shooter.lastShotT = perfNow();
  if (targetPed) fx.burst(to, false);
  else fx.burst(to, true);
}

function damagePed(ped, dmg, byPlayer) {
  if (ped.dead) return;
  ped.health -= dmg;
  ped.fleeT = Math.max(ped.fleeT, 2);
  if (ped.health <= 0) {
    ped.dead = true;
    settleCorpse(ped.mesh);
    if (byPlayer) {
      if (ped.kind === "civ") { addHeat(100); setDispatchLine(3); }
      else if (ped.kind === "gang") addHeat(40);
      S.respect += ped.kind === "gang" ? 6 : 0;
    }
  }
}

function playerShoot(dt) {
  player.fireCd -= dt;
  const w = WEAPONS.find((x) => x.key === S.weapon);
  const wantFire = triggerHeld && !S.inCar && !boardOpen;
  if (wantFire && player.fireCd <= 0) {
    if (w.reserve && S.ammo[w.reserve] <= 0) {
      player.fireCd = 0.3;
      sound.denied();
      hud.toast("CLICK — EMPTY", "That weapon is dry.");
      triggerHeld = false;
      return;
    }
    player.fireCd = w.rate;
    if (w.reserve) S.ammo[w.reserve] -= 1;
    const aim = aimYawNow();
    player.heading = aim;
    if (S.weapon === "fists") {
      // A swung fist: nearest ped inside arm's reach and arc.
      let best = null, bd = w.range;
      for (const p of peds) {
        if (p.dead) continue;
        const d = Math.hypot(p.pos.x - player.pos.x, p.pos.z - player.pos.z);
        if (d < bd && Math.abs(angDiff(Math.atan2(p.pos.x - player.pos.x, p.pos.z - player.pos.z), aim)) < 0.8) { best = p; bd = d; }
      }
      player.lastShotT = perfNow();
      if (best) { damagePed(best, w.damage, true); fx.burst(best.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), false); }
      return;
    }
    for (let pellet = 0; pellet < w.pellets; pellet++) {
      const shotAim = aim + rand(-1, 1) * w.spread * 8;
      const dir = new THREE.Vector3(Math.sin(shotAim), 0, Math.cos(shotAim));
      let best = null, bestScore = Infinity;
      for (const p of peds) {
        if (p.dead) continue;
        const rel = new THREE.Vector3().subVectors(p.pos, player.pos);
        const fwd = rel.x * dir.x + rel.z * dir.z;
        if (fwd < 0.5 || fwd > w.range) continue;
        const lat = Math.abs(rel.x * dir.z - rel.z * dir.x);
        if (lat < 0.9 && fwd < bestScore) { bestScore = fwd; best = p; }
      }
      const muzzle = muzzleOf(player);
      if (best) {
        const hit = best.pos.clone().add(new THREE.Vector3(rand(-0.15, 0.15), rand(0.9, 1.45), rand(-0.15, 0.15)));
        fireShot(player, w.key, best, hit);
        damagePed(best, w.damage, true);
      } else {
        const end = muzzle.clone().addScaledVector(dir, w.range * 0.8);
        end.y = 1.25;
        fireShot(player, w.key, null, end);
      }
    }
    if (crimeCd <= 0) { addHeat(7); crimeCd = 1.1; }
  }
}

function hostileShoot(ped, targetPos, dmgToPlayer) {
  const w = { key: "smg" };
  const hit = Math.random() < 0.5;
  const aimAt = targetPos.clone().add(new THREE.Vector3(0, 1.15, 0));
  if (!hit) aimAt.add(new THREE.Vector3(rand(-1.6, 1.6), rand(-0.3, 0.5), rand(-1.6, 1.6)));
  fireShot(ped, w.key, hit ? player : null, aimAt);
  ped.lastShotT = perfNow();
  if (hit && dmgToPlayer) hurtPlayer(rand(1.6, 3.2));
}

function hurtPlayer(dmg) {
  if (S.dead) return;
  const absorbed = Math.min(S.armour, dmg * 0.6);
  S.armour -= absorbed;
  S.health -= (dmg - absorbed);
  if (S.health <= 0) { S.health = 0; onPlayerDown(); }
}

function onPlayerDown() {
  S.dead = true;
  hud.banner("DOWN", "The bay keeps your cut — you wake at the safehouse.");
  setTimeout(() => {
    S.dead = false; S.health = 60; S.armour = 0; S.wanted = 0; S.heat = 0;
    S.money = Math.max(0, Math.round(S.money * 0.9));
    if (S.inCar) exitCar();
    player.pos.set(285, 0, -52); player.heading = Math.PI;
    saveGame();
  }, 2600);
}

// ---------- crew abilities ----------
function crewAbility(keyName) {
  const meta = CREW.find((c) => c.key === keyName);
  if (!meta || S.crewCd[keyName] > 0) { sound.denied(); return; }
  S.crewCd[keyName] = meta.cooldown;
  if (keyName === "plates") {
    if (S.inCar && S.wanted > 0) { S.wanted = Math.max(0, S.wanted - 1); S.heat = 0; hud.toast("SWAP PLATES", "Sinta's plates are on — one star cools off."); }
    else hud.toast("SWAP PLATES", "No heat to shed right now.");
  } else if (keyName === "fix") {
    if (S.inCar) { S.inCar.condition = Math.min(100, S.inCar.condition + 35); S.inCar.health = Math.min(100, S.inCar.health + 35); hud.toast("QUICK FIX", "Bima leans out and makes it run right."); }
    else { S.health = Math.min(100, S.health + 22); hud.toast("QUICK FIX", "Bima patches you up."); }
  } else if (keyName === "eyes") {
    S.eyesOutT = 8;
    hud.toast("EYES OUT", "Laras calls the blind corners — the SBPD loses your scent.");
  }
  sound.chime(440);
}

// ---------- cars: enter / exit / drive ----------
function interact() {
  if (S.inCar) { exitCar(); return; }
  let best = null, bd = 3.4;
  for (const c of cars) {
    if (c.wrecked && c.condition <= 2) continue;
    const d = Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z);
    if (d < bd) { best = c; bd = d; }
  }
  if (best) enterCar(best);
}
function enterCar(car) {
  S.inCar = car;
  player.mesh.visible = false;
  if (!car.countedTheft && car.kind !== "police") { car.countedTheft = true; S.stolen++; addHeat(35); saveGame(); }
  else if (!car.countedTheft && car.kind === "police") { car.countedTheft = true; S.stolen++; addHeat(70); }
  sound.setRadio(true);
  hud.toast(car.family.name, car.kind === "parked" ? "Lifted clean." : "Yours now — drive.");
}
function exitCar() {
  const car = S.inCar;
  if (!car) return;
  const side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
  player.pos.set(car.pos.x + side.x * 2.2, 0, car.pos.z + side.z * 2.2);
  player.heading = car.heading;
  player.mesh.visible = true;
  S.inCar = null;
  sound.setRadio(false);
}

function driveCar(dt) {
  const car = S.inCar;
  if (!car) return;
  if (car.autopilot) {
    // Staging drives itself: hold the staged speed and heading
    // unless the capture's own hands take the wheel.
    const driven = keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD;
    if (!driven) {
      car.speed += clamp(29 - car.speed, -6 * dt, 6 * dt);
      stepCar(car, dt, true);
      return;
    }
    car.autopilot = false;
  }
  const fam = car.family;
  const fwdIn = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const steerIn = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
  const hand = keys.Space;
  const topSpeed = car.condition <= 5 ? 4 : fam.top;
  if (fwdIn > 0) car.speed += fam.accel * dt * (1 - Math.max(0, car.speed) / (topSpeed * 1.15));
  else if (fwdIn < 0) car.speed -= (car.speed > 0.5 ? 16 : fam.accel * 0.5) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), (hand ? 14 : 1.1) * dt);
  car.speed = clamp(car.speed, -9, topSpeed);
  if (Math.abs(car.speed) > 0.2) {
    const turn = steerIn * fam.grip * dt * clamp(Math.abs(car.speed) / 8, 0.25, 1) * Math.sign(car.speed);
    car.heading += turn * (hand ? 1.5 : 1);
  }
  stepCar(car, dt, true);
}

function stepCar(car, dt, isPlayerCar) {
  const nx = car.pos.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.pos.z + Math.cos(car.heading) * car.speed * dt;
  const hit = city.collides(nx, nz, 1.7);
  if (hit) {
    if (Math.abs(car.speed) > 7) {
      car.condition = Math.max(0, car.condition - Math.abs(car.speed) * 0.55);
      if (isPlayerCar) { addHeat(10); hurtPlayer(Math.abs(car.speed) * 0.12); }
    }
    car.speed *= -0.25;
  } else { car.pos.x = nx; car.pos.z = nz; }
  car.pos.x = clamp(car.pos.x, -392, 452);
  car.pos.z = clamp(car.pos.z, -392, 392);
  car.mesh.rotation.y = car.heading;
  const spin = car.speed * dt / 0.34;
  for (const w of car.mesh.userData.wheels || []) w.rotation.x += spin;
  if (car.condition <= 5 && !car.wrecked) { car.wrecked = true; }
  // Pedestrians in the path.
  if (Math.abs(car.speed) > 4) {
    for (const p of peds) {
      if (p.dead) continue;
      const d = Math.hypot(p.pos.x - car.pos.x, p.pos.z - car.pos.z);
      if (d < 1.7) {
        damagePed(p, Math.abs(car.speed) * 2.4, !!isPlayerCar);
        if (isPlayerCar && p.kind === "civ") addHeat(55);
      }
    }
  }
}

// Traffic: follow a grid line, mind the car ahead, turn at junctions.
function updateTrafficCar(car, dt) {
  if (car.kind !== "traffic") return;
  car.aiT -= dt;
  let want = car.cruise;
  for (const other of cars) {
    if (other === car) continue;
    const rel = { x: other.pos.x - car.pos.x, z: other.pos.z - car.pos.z };
    const fwd = rel.x * Math.sin(car.heading) + rel.z * Math.cos(car.heading);
    const lat = Math.abs(rel.x * Math.cos(car.heading) - rel.z * Math.sin(car.heading));
    if (fwd > 0 && fwd < 10 && lat < 2.2) want = Math.min(want, Math.max(0, (fwd - 5) * 1.4));
  }
  const fp = focusPos();
  if (Math.hypot(fp.x - car.pos.x, fp.z - car.pos.z) < 7 && !S.inCar) want = 0;
  car.speed += clamp(want - car.speed, -14 * dt, car.family.accel * 0.7 * dt);
  // Junction turns.
  const nearLine = roadLines().find((l) => Math.abs((car.laneAxis === "z" ? car.pos.z : car.pos.x) - l) < 3);
  if (nearLine != null && car.aiT <= 0 && Math.random() < 0.4) {
    car.aiT = rand(2, 5);
    const cross = car.laneAxis === "z" ? car.pos.x : car.pos.z;
    const crossLine = roadLines().reduce((a, b) => Math.abs(b - cross) < Math.abs(a - cross) ? b : a, 0);
    const turnDir = Math.random() < 0.5 ? 1 : -1;
    if (car.laneAxis === "z") { car.laneAxis = "x"; car.laneLine = crossLine; car.laneDir = turnDir; }
    else { car.laneAxis = "z"; car.laneLine = crossLine; car.laneDir = turnDir; }
  }
  // Steer back onto the lane.
  const laneCoord = car.laneAxis === "z" ? car.laneLine + 3.4 * car.laneDir : car.laneLine - 3.4 * car.laneDir;
  const err = car.laneAxis === "z" ? laneCoord - car.pos.x : laneCoord - car.pos.z;
  const targetHeading = car.laneAxis === "z"
    ? (car.laneDir > 0 ? 0 : Math.PI) + clamp(err * 0.06, -0.4, 0.4)
    : (car.laneDir > 0 ? Math.PI / 2 : -Math.PI / 2) + clamp(-err * 0.06, -0.4, 0.4);
  car.heading += clamp(angDiff(targetHeading, car.heading), -1.6 * dt, 1.6 * dt);
  if (Math.abs(car.pos.x) > 372 || Math.abs(car.pos.z) > 372) {
    car.laneDir *= -1;
    car.heading += Math.PI;
  }
  stepCar(car, dt, false);
}

// Police: converge, ram at speed, hold a ring on foot.
function updatePolice(dt) {
  const want = S.wanted === 0 ? 0 : Math.min(policePool.length, S.wanted + 2);
  const fp = focusPos();
  let activeCount = 0;
  policePool.forEach((car, i) => {
    const should = i < want;
    if (should && !car.active) {
      car.active = true; car.mesh.visible = true;
      car.dispatchName = DISPATCH_PREFIXES[i % DISPATCH_PREFIXES.length] + "-" + (20 + ((i * 37 + Math.floor(Math.random() * 40)) % 70));
      const ang = rand(0, Math.PI * 2), dist = rand(62, 92);
      car.pos.set(clamp(fp.x + Math.sin(ang) * dist, -370, 370), 0, clamp(fp.z + Math.cos(ang) * dist, -370, 370));
      car.speed = 12; car.condition = 100; car.wrecked = false; car.health = 100;
    } else if (!should && car.active) {
      car.active = false; car.mesh.visible = false;
      car.pos.set(60 + i * 6, 0, 330);
    }
    if (!car.active) return;
    activeCount++;
    const d = Math.hypot(fp.x - car.pos.x, fp.z - car.pos.z);
    const roadblock = S.wanted >= 3 && i === want - 1;
    let tx = fp.x, tz = fp.z, wantSpeed = car.family.top * 0.92;
    if (roadblock && d > 26) {
      const ahead = 24;
      const fh = S.inCar ? S.inCar.heading : player.heading;
      tx = fp.x + Math.sin(fh) * ahead; tz = fp.z + Math.cos(fh) * ahead;
      wantSpeed = car.family.top;
      car.tactic = "ROADBLOCK";
    } else if (roadblock && d <= 26) {
      wantSpeed = 0; car.tactic = "ROADBLOCK";
    } else if (!S.inCar && d < 27) {
      // On foot they hold a cordon ring and wait for him to run —
      // a wall of cruisers at shouting distance, not a demolition derby.
      wantSpeed = 0; car.tactic = d < 15 ? "RAMMING" : "PURSUIT";
    } else {
      car.tactic = d < 15 ? "RAMMING" : (i % 3 === 2 ? "FLANKING" : "PURSUIT");
      if (car.tactic === "FLANKING") {
        tx = fp.x + Math.cos(player.heading) * 12; tz = fp.z - Math.sin(player.heading) * 12;
      }
    }
    const targetHeading = Math.atan2(tx - car.pos.x, tz - car.pos.z);
    car.heading += clamp(angDiff(targetHeading, car.heading), -2.2 * dt, 2.2 * dt);
    car.speed += clamp(wantSpeed - car.speed, -18 * dt, car.family.accel * dt);
    if (wantSpeed === 0) car.speed = Math.max(0, car.speed - 20 * dt);
    stepCar(car, dt, false);
    if (S.inCar && d < 3.4 && Math.abs(car.speed) > 6) {
      S.inCar.condition = Math.max(0, S.inCar.condition - 4);
      hurtPlayer(1.2);
    }
    // Light bar chase strobe.
    const bars = car.mesh.userData.lightBar;
    if (bars) { const ph = Math.floor(perfNow() * 6 + i) % 2; bars[0].visible = ph === 0; bars[1].visible = ph === 1; }
  });
  heli.active = S.wanted >= 4;
  heli.grp.visible = heli.active;
  if (heli.active) {
    const t = perfNow();
    heli.grp.position.set(fp.x + Math.sin(t * 0.3) * 7, 52, fp.z + Math.cos(t * 0.23) * 7);
    heli.rotor.rotation.y += dt * 28;
  }
  S.roadblockAhead = policePool.some((c) => c.active && c.tactic === "ROADBLOCK");
  return activeCount;
}

// ---------- people AI ----------
let shotsHeardT = -99, shotsHeardPos = null;
function updatePed(ped, dt) {
  if (ped.dead) return;
  const dp = Math.hypot(player.pos.x - ped.pos.x, player.pos.z - ped.pos.z);
  ped.shootCd -= dt;
  let moveSpeed = 0, moveHeading = ped.heading;

  if (ped.kind === "gang") {
    const aggro = ped.mission || (perfNow() - shotsHeardT < 5 && shotsHeardPos && Math.hypot(shotsHeardPos.x - ped.pos.x, shotsHeardPos.z - ped.pos.z) < 30) || dp < 8;
    if (aggro && !S.inCar && dp < 19) {
      moveHeading = Math.atan2(player.pos.x - ped.pos.x, player.pos.z - ped.pos.z);
      ped.heading += clamp(angDiff(moveHeading, ped.heading), -8 * dt, 8 * dt);
      if (dp > 12.5) { moveSpeed = 3.3; }
      else if (ped.shootCd <= 0) {
        hostileShoot(ped, player.pos, true);
        ped.shootCd = rand(0.85, 1.6);
      }
    } else if (aggro && S.inCar && dp < 15) {
      moveHeading = Math.atan2(player.pos.x - ped.pos.x, player.pos.z - ped.pos.z);
      ped.heading += clamp(angDiff(moveHeading, ped.heading), -8 * dt, 8 * dt);
      if (ped.shootCd <= 0) { hostileShoot(ped, S.inCar.pos, false); ped.shootCd = rand(1, 1.8); if (Math.random() < 0.3) { S.inCar.condition = Math.max(0, S.inCar.condition - 1.5); } }
    } else {
      ped.wanderT -= dt;
      if (ped.wanderT <= 0) {
        ped.wanderT = rand(2, 5);
        ped.tx = ped.home.x + rand(-7, 7); ped.tz = ped.home.z + rand(-7, 7);
      }
      const dd = Math.hypot(ped.tx - ped.pos.x, ped.tz - ped.pos.z);
      if (dd > 0.6) { moveSpeed = 1.1; moveHeading = Math.atan2(ped.tx - ped.pos.x, ped.tz - ped.pos.z); ped.heading += clamp(angDiff(moveHeading, ped.heading), -4 * dt, 4 * dt); }
    }
  } else if (ped.kind === "crew") {
    // The staged ally: holds his ground, trades fire with the gang.
    let target = null, td = 20;
    for (const p of peds) {
      if (p.kind !== "gang" || p.dead) continue;
      const d = Math.hypot(p.pos.x - ped.pos.x, p.pos.z - ped.pos.z);
      if (d < td) { td = d; target = p; }
    }
    if (target) {
      ped.heading += clamp(angDiff(Math.atan2(target.pos.x - ped.pos.x, target.pos.z - ped.pos.z), ped.heading), -8 * dt, 8 * dt);
      if (ped.shootCd <= 0) {
        const from = muzzleOf(ped);
        const hitP = target.pos.clone().add(new THREE.Vector3(0, 1.15, 0));
        fx.flash(from, 0.5);
        fx.fireStreak(from, hitP, 0xffdf9e, 120);
        fx.ejectCasing(from.clone().add(new THREE.Vector3(0, -0.04, 0)), ped.heading);
        sound.shot("smg");
        ped.lastShotT = perfNow();
        if (Math.random() < 0.35) damagePed(target, 5, false);
        ped.shootCd = rand(0.5, 1.0);
      }
    }
  } else {
    // Civilians: stroll, and run from gunfire.
    const scared = perfNow() - shotsHeardT < 4 && shotsHeardPos && Math.hypot(shotsHeardPos.x - ped.pos.x, shotsHeardPos.z - ped.pos.z) < 26;
    if (scared) ped.fleeT = Math.max(ped.fleeT, 1.5);
    if (ped.fleeT > 0) {
      ped.fleeT -= dt;
      const away = Math.atan2(ped.pos.x - (shotsHeardPos ? shotsHeardPos.x : ped.pos.x), ped.pos.z - (shotsHeardPos ? shotsHeardPos.z : ped.pos.z));
      ped.heading += clamp(angDiff(away, ped.heading), -6 * dt, 6 * dt);
      moveSpeed = 5.4;
    } else {
      ped.wanderT -= dt;
      if (ped.wanderT <= 0) {
        ped.wanderT = rand(3, 7);
        ped.tx = ped.home.x + rand(-22, 22); ped.tz = ped.home.z + rand(-22, 22);
      }
      const dd = Math.hypot(ped.tx - ped.pos.x, ped.tz - ped.pos.z);
      if (dd > 0.8) { moveSpeed = 1.5; moveHeading = Math.atan2(ped.tx - ped.pos.x, ped.tz - ped.pos.z); ped.heading += clamp(angDiff(moveHeading, ped.heading), -4 * dt, 4 * dt); }
    }
  }

  if (moveSpeed > 0) {
    const nx = ped.pos.x + Math.sin(ped.heading) * moveSpeed * dt;
    const nz = ped.pos.z + Math.cos(ped.heading) * moveSpeed * dt;
    if (!city.collides(nx, nz, 0.45)) { ped.pos.x = nx; ped.pos.z = nz; }
    ped.pos.x = clamp(ped.pos.x, -390, 448);
    ped.pos.z = clamp(ped.pos.z, -390, 390);
  }
  ped.speed = moveSpeed;
  ped.mesh.rotation.y = ped.heading;
}

// ---------- missions ----------
let jobIntroShown = -1;
const missionPeds = [];
let liftTargetCar = null;

function currentJob() { return JOBS[S.missionIndex] || null; }

function stageInit() {
  const job = currentJob();
  if (!job) return;
  const stage = job.stages[S.stageIndex];
  if (!stage) return;
  if (stage.verb === "clear") {
    S.stageLeft = stage.n;
    for (let i = 0; i < stage.n; i++) {
      const a = (i / stage.n) * Math.PI * 2;
      const p = spawnPed("gang", stage.x + Math.cos(a) * rand(4, 11), stage.z + Math.sin(a) * rand(4, 11), { mission: true, heading: rand(0, 6.28) });
      missionPeds.push(p);
    }
  } else if (stage.verb === "lift") {
    liftTargetCar = spawnCar(stage.family, stage.paint, stage.x, stage.z, Math.PI / 2, "parked");
    S.stageLeft = 0;
  } else {
    S.stageLeft = 0;
  }
  if (jobIntroShown !== S.missionIndex) {
    jobIntroShown = S.missionIndex;
    hud.dialogue(job.open.name, job.open.role, job.open.text, job.open.color);
  }
}

function stageComplete() {
  const job = currentJob();
  const stagePay = Math.round(job.pay / 3);
  S.money += stagePay;
  S.respect += 40;
  sound.jobDone();
  S.stageIndex++;
  for (const p of missionPeds) p.mission = false; // survivors walk off the books
  missionPeds.length = 0;
  liftTargetCar = null;
  if (S.stageIndex >= job.stages.length) {
    S.money += job.pay - stagePay * 2;
    S.respect += job.respect;
    hud.banner("JOB COMPLETE", `${job.title} — Rp${job.pay.toLocaleString("en-US")} and the bay remembers.`);
    if (S.missionIndex === 1) { S.unlocked.smg = true; hud.toast("KEBUN SMG UNLOCKED", "Bima leaves it under the bengkel counter."); }
    if (S.missionIndex === 3) { S.unlocked.shotgun = true; hud.toast("12G LARAS UNLOCKED", "Oman's gift. Mind the spread."); }
    S.missionIndex++;
    S.stageIndex = 0;
    jobIntroShown = -1;
  } else {
    hud.toast("STAGE CLEAR", job.stages[S.stageIndex].obj);
  }
  stageInit();
  saveGame();
}

function updateMission(dt) {
  if (S.stageLock) return; // staged frames hold their job card still
  const job = currentJob();
  if (!job) return;
  const stage = job.stages[S.stageIndex];
  if (!stage) return;
  const fp = focusPos();
  if (stage.verb === "goto") {
    const d = Math.hypot(fp.x - stage.x, fp.z - stage.z);
    if (d < stage.r && (!stage.car || S.inCar)) stageComplete();
  } else if (stage.verb === "clear") {
    S.stageLeft = missionPeds.filter((p) => !p.dead).length;
    if (S.stageLeft <= 0) stageComplete();
  } else if (stage.verb === "escape") {
    if (S.wanted === 0 || S.hiddenT >= 5) { S.wanted = 0; S.heat = 0; stageComplete(); }
  } else if (stage.verb === "lift") {
    if (liftTargetCar && S.inCar === liftTargetCar) {
      addHeat(120);
      setDispatchLine(1);
      stageComplete();
    }
  }
}

// ---------- activities ----------
function updateActivities(dt) {
  // Packages.
  for (const pm of packageMeshes) {
    const taken = S.act.taken.includes(pm.id);
    pm.grp.visible = !taken;
    if (taken) continue;
    pm.boxM.rotation.y += dt * 1.6;
    pm.boxM.position.y = 0.8 + Math.sin(perfNow() * 2 + pm.id) * 0.12;
    const fp = focusPos();
    if (Math.hypot(fp.x - pm.grp.position.x, fp.z - pm.grp.position.z) < 2.4) {
      S.act.taken.push(pm.id);
      S.money += 250;
      sound.pickup();
      hud.toast(`PACKAGE ${S.act.taken.length}/12`, "+Rp250 — the bay provides.");
      saveGame();
    }
  }
  // Races.
  if (S.inCar) {
    const startedRace = races.tryStart(S, S.inCar.pos);
    if (startedRace) {
      hud.banner("🏁 " + startedRace.name, `Beat ${startedRace.par} s — follow the gold gates.`);
      sound.chime(392);
    }
  }
  races.update(dt, S, S.inCar ? S.inCar.pos : player.pos, {
    onCheckpoint: (race, n, total) => hud.toast(race.name, `Gate ${n}/${total}`),
    onFinish: (race, t, prev) => {
      S.money += 600; S.respect += 60;
      hud.banner("🏁 " + t.toFixed(1) + " s", prev != null && t >= prev ? `Best stays ${prev.toFixed(1)} s.` : "New best — +Rp600.");
      sound.jobDone();
      saveGame();
    },
    onAbort: () => hud.toast("RACE OFF", "Out of the car, out of the race."),
  });
  const target = races.currentTarget();
  if (target) {
    checkpointMesh.visible = true;
    checkpointMesh.position.set(target.x, 8, target.z);
  } else checkpointMesh.visible = false;
}

// ---------- player movement ----------
function updatePlayer(dt) {
  if (S.inCar) { driveCar(dt); return; }
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  const moving = ix !== 0 || iz !== 0;
  const sprint = keys.ShiftLeft || keys.ShiftRight;
  const speed = sprint ? 8.2 : 5.2;
  if (moving) {
    // Input walks in camera space: W is where the camera looks,
    // D is its right hand. Build the vector, then take its heading.
    const fwd = { x: -Math.sin(camYaw), z: -Math.cos(camYaw) };
    const right = { x: Math.cos(camYaw), z: -Math.sin(camYaw) };
    const mv = { x: fwd.x * -iz + right.x * ix, z: fwd.z * -iz + right.z * ix };
    const moveYaw = Math.atan2(mv.x, mv.z);
    player.heading += clamp(angDiff(moveYaw, player.heading), -11 * dt, 11 * dt);
    const nx = player.pos.x + Math.sin(player.heading) * speed * dt;
    const nz = player.pos.z + Math.cos(player.heading) * speed * dt;
    if (!city.collides(nx, player.pos.z, 0.45)) player.pos.x = nx;
    if (!city.collides(player.pos.x, nz, 0.45)) player.pos.z = nz;
    player.pos.x = clamp(player.pos.x, -390, 448);
    player.pos.z = clamp(player.pos.z, -390, 390);
    player.speed = speed;
  } else player.speed = 0;
  player.mesh.rotation.y = player.heading;
  playerShoot(dt);
}

// ---------- camera ----------
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  if (!started) {
    // The poster frame: high over the shore junction, the whole
    // senja bay — beach, containers, sun on the water — in one look.
    const t = perfNow() * 0.02;
    camTarget.set(196 + Math.sin(t) * 6, 47, 292 + Math.cos(t * 0.7) * 4);
    camera.position.lerp(camTarget, Math.min(1, dt * 2));
    camera.lookAt(322, 0, 128);
    return;
  }
  const fp = focusPos();
  const focusHeading = S.inCar ? S.inCar.heading : player.heading;
  if (STAGING || !pointerLocked) {
    const desired = focusHeading + Math.PI + S.camOffset;
    camYaw += angDiff(desired, camYaw) * Math.min(1, dt * 4.5);
  } else if (S.inCar && perfNow() - mouseLookT > 2.5) {
    const desired = focusHeading + Math.PI;
    camYaw += angDiff(desired, camYaw) * Math.min(1, dt * 1.6);
  }
  const pitch = 0.34 + camPitchDrag * 0.0024;
  const shoulder = S.camShoulder, back = S.camBack + (S.inCar ? 2.3 : 0);
  const dist = (4.2 - Math.min(0.75, shoulder * 0.5) + back) * (S.inCar ? 1.3 : 1);
  const bx = Math.sin(camYaw) * Math.cos(pitch), bz = Math.cos(camYaw) * Math.cos(pitch);
  const rx = Math.cos(camYaw) * shoulder, rz = -Math.sin(camYaw) * shoulder;
  camTarget.set(
    fp.x + bx * dist + rx,
    fp.y + 1.8 + Math.sin(pitch) * dist * 0.55 + (S.inCar ? 0.7 : 0),
    fp.z + bz * dist + rz
  );
  camera.position.lerp(camTarget, Math.min(1, dt * (STAGING ? 14 : 9)));
  camera.lookAt(fp.x + rx, fp.y + 1.6 + (S.inCar ? 0.5 : 0), fp.z + rz);
}

// ---------- HUD view ----------
function buildView() {
  const job = currentJob();
  const fp = focusPos();
  const district = city.districtAt(fp.x, fp.z);
  const stage = job ? job.stages[S.stageIndex] : null;
  let mission = null, mapTarget = null;
  if (job && stage) {
    mission = {
      index: S.missionIndex, total: JOBS.length, giver: job.giver,
      stage: S.stageIndex, stageCount: job.stages.length, title: job.title,
      objective: stageObjective(job, S.stageIndex, S.stageLeft),
      next: stage.next,
      distance: stage.x != null ? Math.hypot(fp.x - stage.x, fp.z - stage.z) : null,
    };
    if (stage.verb === "clear") {
      const alive = missionPeds.find((p) => !p.dead);
      if (alive) mapTarget = { x: alive.pos.x, z: alive.pos.z };
    } else if (stage.x != null) mapTarget = { x: stage.x, z: stage.z };
  }
  const raceTarget = races.currentTarget();
  if (raceTarget) mapTarget = raceTarget;
  const dispatch = policePool.filter((c) => c.active).map((c) => ({
    name: c.dispatchName || "UNIT", tactic: c.tactic,
    cls: c.tactic === "RAMMING" ? "ram" : c.tactic === "ROADBLOCK" ? "blk" : c.tactic === "FLANKING" ? "fla" : "pur",
    dist: Math.hypot(c.pos.x - fp.x, c.pos.z - fp.z),
  })).sort((a, b) => a.dist - b.dist);
  const weapons = WEAPONS.map((w) => ({
    slot: w.slot, name: w.name,
    ammoText: w.reserve ? String(S.ammo[w.reserve]) : "∞",
    active: S.weapon === w.key, locked: w.reserve ? !S.unlocked[w.key] : false,
  }));
  const crew = CREW.map((c) => ({
    keyLabel: c.keyLabel, ability: c.ability, name: c.name, role: c.role,
    ready: S.crewCd[c.key] <= 0, left: Math.max(0, S.crewCd[c.key]), cooldown: c.cooldown,
  }));
  const near = (list, r) => list.filter((e) => Math.hypot(e.pos.x - fp.x, e.pos.z - fp.z) < r);
  return {
    clock: S.clock, money: S.money, wanted: S.wanted,
    searching: S.wanted > 0 && perfNow() - lastSeenT > 2.5,
    heliActive: heli.active, respect: S.respect,
    activity: {
      line1: races.line(S) || "🏁 STREET RACES — 3 COURSES",
      line2: `📦 PACKAGES ${S.act.taken.length}/12`,
    },
    mission, dispatch, dispatchLine: dispatchLineT > 0 ? S.dispatchLine : null,
    roadblockAhead: !!S.roadblockAhead,
    weapons, crew,
    health: S.health, armour: S.armour,
    district, turfValue: { HOSTILE: 82, CONTESTED: 58, WATCHED: 46, FRIENDLY: 24, NEUTRAL: 36 }[district.turf] || 40,
    inCar: !!S.inCar,
    speedKmh: S.inCar ? Math.abs(S.inCar.speed) * 3.6 : 0,
    vehicleName: S.inCar ? S.inCar.family.name : "",
    condition: S.inCar ? S.inCar.condition : 100,
    radio: RADIO[S.radioIdx],
    focus: { x: fp.x, z: fp.z, heading: S.inCar ? S.inCar.heading : player.heading },
    mapCars: near(cars.filter((c) => c.kind === "traffic"), 175),
    mapPolice: policePool.filter((c) => c.active),
    mapHostiles: near(peds.filter((p) => p.kind === "gang" && !p.dead), 175),
    mapTarget, stage: STAGING,
  };
}

function boardView() {
  const fp = focusPos();
  const view = buildView();
  return {
    money: S.money, respect: S.respect,
    jobsDone: S.missionIndex, jobsTotal: JOBS.length,
    packages: S.act.taken.length, packagesTotal: PACKAGE_SPOTS.length,
    stolen: S.stolen, racesWon: racesWon(S), racesTotal: RACES.length,
    district: view.district, wanted: S.wanted,
    completion: completionPct(S, S.missionIndex, JOBS.length),
    crew: CREW.map((c) => ({ name: c.name, role: c.role, ability: c.ability, color: c.color })),
    races: RACES.map((r) => ({ name: r.name, best: S.act.best[r.id] != null ? S.act.best[r.id] : null, par: r.par })),
    focus: view.focus,
    mapPackages: PACKAGE_SPOTS.filter((s, i) => !S.act.taken.includes(i)),
    mapPolice: view.mapPolice, mapHostiles: view.mapHostiles, mapTarget: view.mapTarget,
  };
}

function toggleBoard() {
  boardOpen = !boardOpen;
  $("mapBoard").style.display = boardOpen ? "" : "none";
  if (boardOpen) hud.drawMap(boardView());
}

// ---------- start / menu ----------
function startGame(fromSave) {
  if (fromSave) {
    const sv = readSave();
    if (sv) {
      S.money = sv.money != null ? sv.money : S.money;
      S.respect = sv.respect || 0;
      S.missionIndex = sv.missionIndex || 0;
      S.stageIndex = sv.stageIndex || 0;
      S.ammo = Object.assign(S.ammo, sv.ammo || {});
      S.unlocked = Object.assign(S.unlocked, sv.unlocked || {});
      S.stolen = sv.stolen || 0;
      S.act = sv.act || { best: {}, taken: [] };
      S.health = sv.health != null ? sv.health : 100;
      S.armour = sv.armour || 0;
    }
  }
  started = true;
  $("startScreen").style.display = "none";
  $("hud").style.display = "";
  city.applyLightRig(false);
  renderer.toneMappingExposure = 1.12;
  player.pos.set(285, 0, -52);
  player.heading = Math.PI;
  camYaw = Math.PI * 2 + S.camOffset;
  setPlayerWeapon(S.unlocked.smg ? "smg" : "pistol");
  if (fromSave && !S.unlocked.smg) setPlayerWeapon("pistol");
  jobIntroShown = -1;
  stageInit();
  sound.wake();
}
$("btnNew").addEventListener("click", () => { S = freshState(); startGame(false); });
$("btnContinue").addEventListener("click", () => { if (readSave()) startGame(true); else hud.toast("NO SAVE", "The bay has not met you yet."); });
refreshContinue();

// ---------- the loop ----------
const clockT = new THREE.Clock();
let saveT = 0, flameSlot = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clockT.getDelta());
  const frozen = fx.frozen;

  if (!paused && !boardOpen) {
    if (!frozen) {
      // World time: an hour of bay time every ~4 minutes of play.
      S.clock += dt / 240;
      if (S.clock >= 24) S.clock -= 24;
      crimeCd = Math.max(0, crimeCd - dt);
      dispatchLineT = Math.max(0, dispatchLineT - dt);
      for (const k of Object.keys(S.crewCd)) S.crewCd[k] = Math.max(0, S.crewCd[k] - dt);
      S.eyesOutT = Math.max(0, S.eyesOutT - dt);

      if (started && !S.dead) {
        updatePlayer(dt);
        for (const car of cars) if (car !== S.inCar) updateTrafficCar(car, dt);
        updatePolice(dt);
        for (const ped of peds) updatePed(ped, dt);
        updateMission(dt);
        updateActivities(dt);
        // Wanted bookkeeping: being seen holds the heat; hiding bleeds it.
        if (policeSeen()) { lastSeenT = perfNow(); S.hiddenT = 0; }
        else if (S.wanted > 0) {
          S.hiddenT += dt;
          if (S.hiddenT >= 7) { S.hiddenT = 0; S.wanted = Math.max(0, S.wanted - 1); if (S.wanted === 0) S.heat = 0; }
        }
        if (player.lastShotT > 0 && perfNow() - player.lastShotT < 0.1) { shotsHeardT = perfNow(); shotsHeardPos = player.pos; }
        sound.setSiren(S.wanted >= 2 && policeSeen(), S.wanted);
      } else if (!started) {
        // The menu vista breathes: traffic rolls through the frame.
        for (const car of cars) updateTrafficCar(car, dt);
        for (const ped of peds) if (ped.kind === "civ") updatePed(ped, dt);
      }
      // Burning wrecks get flame slots, nearest first.
      const wrecks = cars.filter((c) => c.wrecked).slice(0, 8);
      for (let i = 0; i < 8; i++) {
        const w = wrecks[i];
        fx.setFlame(i, w ? w.pos.clone().add(new THREE.Vector3(0, 0.8, 0)) : null);
      }
      fx.update(dt);
      city.update(dt);
      saveT += dt;
      if (saveT > 10 && started) { saveT = 0; saveGame(); }
    }
    // Aim poses + gun anchors settle even inside the freeze — the
    // held frame finishes raising its arm.
    const aimFor = (ped) => {
      if (ped === player) return triggerHeld || perfNow() - player.lastShotT < 0.35;
      if (ped.dead) return false;
      if (ped.kind === "gang") return Math.hypot(player.pos.x - ped.pos.x, player.pos.z - ped.pos.z) < 19 && perfNow() - ped.lastShotT < 1.2 || ped.shootCd < 0.4;
      if (ped.kind === "crew") return perfNow() - ped.lastShotT < 1.2;
      return false;
    };
    if (!S.inCar) {
      updateAimPose(player.mesh, dt, aimFor(player) && !S.inCar);
      player.mesh.userData.gunYaw = angDiff(aimYawNow(), player.heading);
      updateGunAnchor(player.mesh);
    }
    for (const ped of peds) {
      if (ped.dead) continue;
      if (!frozen) animatePerson(ped.mesh, ped.speed, dt);
      updateAimPose(ped.mesh, dt, aimFor(ped));
      if (ped.mesh.userData.gun) {
        ped.mesh.userData.gunYaw = 0;
        updateGunAnchor(ped.mesh);
      }
    }
    if (started && !S.inCar && !frozen) animatePerson(player.mesh, player.speed, dt);
  }

  updateCamera(dt);
  if (started) hud.update(dt, buildView());
    // The district card flows under whatever the left column holds
    // tonight — the dispatch board grows with the wanted level — and
    // the crew cards ride up when the speed cluster takes the corner.
    const mpEl = $("missionPanel"), dpEl = $("dispatchPanel");
    let dTop = 28 + mpEl.offsetHeight;
    if (dpEl.style.display !== "none") dTop += dpEl.offsetHeight + 12;
    $("districtTitle").style.top = dTop + "px";
    $("crewPanel").style.bottom = S.inCar ? "176px" : "16px";
  if (boardOpen) hud.drawMap(boardView());
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- staging (screenshot casts only) ----------
const gameApi = {
  get state() { return S; },
  player, peds, cars, city, fx, hud, sound, scene, camera,
  pinDispatch: (i) => { S.dispatchLine = DISPATCH_LINES[i % DISPATCH_LINES.length]; dispatchLineT = 9999; },
  setDispatchLine,
  cam: { get yaw() { return camYaw; }, set yaw(v) { camYaw = v; }, get pitchDrag() { return camPitchDrag; }, set pitchDrag(v) { camPitchDrag = v; } },
  spawnPed, spawnCar, setPlayerWeapon,
  getCamYaw: () => camYaw, setCamYaw: (v) => { camYaw = v; },
  getPitchDrag: () => camPitchDrag, setPitchDrag: (v) => { camPitchDrag = v; },
  startGame, stageInit,
  setStarted: (v) => { started = v; },
  refreshContinue,
  THREE,
};
if (STAGING) applyStage(gameApi);
