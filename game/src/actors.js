// actors.js — low-poly builders for everything that moves: cars (civilian,
// taxi, police, the Regent), people (player, pedestrians, crew, hostiles,
// police on foot) and the SBPD helicopter with its searchlight.

import * as THREE from "three";

const MAT = {
  tyre: new THREE.MeshLambertMaterial({ color: 0x181a1c }),
  glass: new THREE.MeshLambertMaterial({ color: 0x14202e }),
  chrome: new THREE.MeshLambertMaterial({ color: 0xd7dde3 }),
  white: new THREE.MeshLambertMaterial({ color: 0xf4f6f7 }),
  black: new THREE.MeshLambertMaterial({ color: 0x22262b }),
};

function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true;
  parent.add(m); return m;
}

export function buildCarMesh(model, opts = {}) {
  const g = new THREE.Group();
  if (model.name.includes("Scooter")) {
    // A step-through scooter: two thin wheels, a floor spine, a leg
    // shield, a long seat and a handlebar with a single round headlight.
    const bodyMat = new THREE.MeshLambertMaterial({ color: opts.color ?? model.color });
    const hlS = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
    const tlS = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    box(1.15, 0.16, 0.34, bodyMat, -0.1, 0.42, 0, g);
    box(0.5, 0.52, 0.3, bodyMat, 0.62, 0.74, 0, g);
    box(0.74, 0.16, 0.4, MAT.black, -0.42, 0.8, 0, g);
    box(0.32, 0.36, 0.36, bodyMat, -0.98, 0.64, 0, g);
    box(0.1, 0.44, 0.1, MAT.chrome, 0.72, 1.06, 0, g);
    box(0.08, 0.08, 0.62, MAT.black, 0.72, 1.3, 0, g);
    box(0.14, 0.2, 0.24, hlS, 0.84, 1.04, 0, g);
    box(0.08, 0.12, 0.2, tlS, -1.14, 0.74, 0, g);
    const wheels = [];
    const wgS = new THREE.CylinderGeometry(0.34, 0.34, 0.14, 12);
    const rgS = new THREE.CylinderGeometry(0.18, 0.18, 0.16, 10);
    const rimMatS = new THREE.MeshLambertMaterial({ color: 0xe9eef3 });
    for (const wx of [0.8, -0.88]) {
      const w = new THREE.Mesh(wgS, MAT.tyre);
      w.rotation.x = Math.PI / 2; w.position.set(wx, 0.34, 0); w.castShadow = true;
      g.add(w); wheels.push(w);
      const rim = new THREE.Mesh(rgS, rimMatS);
      rim.rotation.x = Math.PI / 2; rim.position.set(wx, 0.34, 0); g.add(rim);
    }
    g.userData.wheels = wheels;
    g.userData.length = 2.1;
    return g;
  }
  const bodyMat = new THREE.MeshLambertMaterial({ color: opts.color ?? model.color });
  const trimMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(opts.color ?? model.color).multiplyScalar(0.68) });
  const isVan = model.name.includes("Van");
  const isPickup = model.name.includes("Pickup");
  const isTruck = model.name.includes("Truck");
  const isSport = model.name.includes("GT") || model.name.includes("Coupe");
  const L = isTruck ? 7.4 : isVan ? 5.6 : 4.6, W = isTruck ? 2.3 : 2.0;
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  const tl = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
  const plateMat = new THREE.MeshBasicMaterial({ color: 0xf2f4f6 });
  const rimMat = new THREE.MeshLambertMaterial({ color: 0xe9eef3 });

  if (isTruck) {
    // A cab up front and a tall cargo box behind it: the box rides higher
    // than the cab roof and wears a body-colour stripe down its flank.
    box(1.9, 1.5, W, bodyMat, L / 2 - 0.95, 1.25, 0, g);
    box(1.7, 0.62, W * 0.92, MAT.glass, L / 2 - 1.0, 1.66, 0, g);
    box(L * 0.64, 2.5, W * 0.98, new THREE.MeshLambertMaterial({ color: 0xf0ead8 }), -L * 0.17, 1.78, 0, g);
    box(L * 0.64, 0.34, W * 0.99, bodyMat, -L * 0.17, 1.95, 0, g);
    box(L * 0.97, 0.16, W + 0.03, trimMat, 0, 0.42, 0, g);
    box(0.14, 0.2, 0.36, MAT.black, L / 2 - 0.45, 1.72, W / 2 + 0.1, g);
    box(0.14, 0.2, 0.36, MAT.black, L / 2 - 0.45, 1.72, -W / 2 - 0.1, g);
  } else if (isVan) {
    // One tall box, broken up: a glasshouse band, a windshield block, a
    // sliding-door panel in darker trim and the angkot's white stripe.
    box(L, 1.62, W, bodyMat, 0, 1.36, 0, g);
    box(L * 0.88, 0.5, W + 0.04, MAT.glass, -0.15, 1.78, 0, g);
    box(0.75, 0.66, W * 0.88, MAT.glass, L / 2 - 0.34, 1.02, 0, g);
    box(1.5, 1.06, W + 0.05, trimMat, -0.75, 1.28, 0, g);
    box(L * 0.96, 0.22, W + 0.05, MAT.white, 0, 0.72, 0, g);
    box(0.14, 0.2, 0.36, MAT.black, L / 2 - 0.5, 1.62, W / 2 + 0.1, g);
    box(0.14, 0.2, 0.36, MAT.black, L / 2 - 0.5, 1.62, -W / 2 - 0.1, g);
  } else if (isPickup) {
    // Cab forward, and an open bed behind: floor, side walls, tailgate.
    box(L, 0.72, W, bodyMat, 0, 0.91, 0, g);
    box(1.8, 0.78, W * 0.92, MAT.glass, 1.0, 1.64, 0, g);
    box(1.95, 0.13, W * 0.97, bodyMat, 1.0, 2.08, 0, g);
    box(2.3, 0.14, W * 0.94, MAT.black, -1.15, 1.12, 0, g);
    box(2.3, 0.52, 0.1, bodyMat, -1.15, 1.36, W / 2 - 0.05, g);
    box(2.3, 0.52, 0.1, bodyMat, -1.15, 1.36, -W / 2 + 0.05, g);
    box(0.1, 0.52, W * 0.94, trimMat, -2.28, 1.36, 0, g);
    box(L * 0.97, 0.15, W + 0.03, trimMat, 0, 0.44, 0, g);
    box(0.12, 0.18, 0.34, MAT.black, 1.78, 1.5, W / 2 + 0.1, g);
    box(0.12, 0.18, 0.34, MAT.black, 1.78, 1.5, -W / 2 - 0.1, g);
  } else {
    // Three-box profile: lower body, a sloped hood, a dark glass cabin
    // under a body-colour roof, and a distinct trunk deck behind it.
    box(L, 0.66, W, bodyMat, 0, 0.64, 0, g);
    const hood = box(L * 0.36, 0.3, W * 0.9, bodyMat, L * 0.3, isSport ? 0.99 : 1.03, 0, g);
    hood.rotation.z = -0.07;
    box(L * 0.3, 0.3, W * 0.94, bodyMat, -L * 0.33, 1.0, 0, g);
    box(2.05, 0.6, W * 0.84, MAT.glass, -0.25, 1.3, 0, g);
    box(2.2, 0.13, W * 0.9, bodyMat, -0.25, 1.66, 0, g);
    box(L * 0.97, 0.15, W + 0.03, trimMat, 0, 0.42, 0, g);
    // Side mirrors on the cabin's front corners.
    box(0.12, 0.18, 0.34, MAT.black, 0.68, 1.34, W / 2 + 0.1, g);
    box(0.12, 0.18, 0.34, MAT.black, 0.68, 1.34, -W / 2 - 0.1, g);
    if (isSport) {
      // Rear spoiler on struts and a centre stripe over roof and hood.
      box(0.26, 0.44, W * 0.8, MAT.black, -L / 2 + 0.28, 1.28, 0, g);
      box(0.52, 0.09, W * 0.98, MAT.black, -L / 2 + 0.28, 1.55, 0, g);
      const stripe = box(2.2, 0.05, 0.5, MAT.white, -0.25, 1.74, 0, g);
      stripe.castShadow = false;
      const stripe2 = box(L * 0.34, 0.05, 0.5, MAT.white, L * 0.3, 1.21, 0, g);
      stripe2.castShadow = false;
    }
  }
  // Headlights, tail lights, bumpers, license plates and an exhaust.
  const hlY = (isVan || isTruck) ? 1.0 : 0.8, tlY = (isVan || isTruck) ? 1.05 : 0.84;
  box(0.12, 0.22, 0.5, hl, L / 2 + 0.03, hlY, 0.55, g);
  box(0.12, 0.22, 0.5, hl, L / 2 + 0.03, hlY, -0.55, g);
  box(0.12, 0.2, 0.5, tl, -L / 2 - 0.03, tlY, 0.55, g);
  box(0.12, 0.2, 0.5, tl, -L / 2 - 0.03, tlY, -0.55, g);
  box(0.3, 0.3, W, MAT.black, L / 2, 0.32, 0, g);
  box(0.3, 0.3, W, MAT.black, -L / 2, 0.32, 0, g);
  box(0.06, 0.3, 0.85, plateMat, -L / 2 - 0.06, 0.68, 0, g);
  box(0.06, 0.26, 0.8, plateMat, L / 2 + 0.06, 0.62, 0, g);
  box(0.3, 0.12, 0.14, MAT.chrome, -L / 2 - 0.04, 0.28, 0.62, g);
  // Wheels with pale rim discs over the tyres.
  const wheels = [];
  const wg = new THREE.CylinderGeometry(0.52, 0.52, 0.34, 12);
  const rg = new THREE.CylinderGeometry(0.3, 0.3, 0.37, 10);
  for (const [wx, wz] of [[L / 2 - 0.85, W / 2 + 0.04], [L / 2 - 0.85, -W / 2 - 0.04], [-L / 2 + 0.85, W / 2 + 0.04], [-L / 2 + 0.85, -W / 2 - 0.04]]) {
    const w = new THREE.Mesh(wg, MAT.tyre);
    w.rotation.x = Math.PI / 2; w.position.set(wx, 0.52, wz); w.castShadow = true;
    g.add(w); wheels.push(w);
    const rim = new THREE.Mesh(rg, rimMat);
    rim.rotation.x = Math.PI / 2; rim.position.set(wx, 0.52, wz); g.add(rim);
  }
  if (opts.police) {
    box(L * 0.94, 0.6, W + 0.05, MAT.white, 0, 0.66, 0, g);
    box(1.15, 0.2, 0.95, MAT.black, -0.25, 1.84, 0, g);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.42),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(0.0, 2.02, 0); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.42),
      new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    blue.position.set(-0.5, 2.02, 0); g.add(blue);
    const glowR = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.3, depthWrite: false }));
    glowR.position.copy(red.position); g.add(glowR);
    const glowB = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x2266ff, transparent: true, opacity: 0.3, depthWrite: false }));
    glowB.position.copy(blue.position); g.add(glowB);
    g.userData.glowRed = glowR; g.userData.glowBlue = glowB;
    g.userData.lightRed = red; g.userData.lightBlue = blue;
    const stripe = box(L * 0.9, 0.28, W + 0.07, new THREE.MeshLambertMaterial({ color: 0x1d4e9e }), 0, 0.7, 0, g);
    stripe.castShadow = false;
  }
  if (opts.taxi) {
    box(1.0, 0.3, 0.6, new THREE.MeshBasicMaterial({ color: 0xfff2a8 }), -0.25, 1.9, 0, g);
    box(L * 0.92, 0.16, W + 0.04, MAT.black, 0, 0.5, 0, g);
  }
  g.userData.wheels = wheels;
  g.userData.length = L;
  return g;
}

// ---- person detail system (v5 character pass) ----
// The owner's verdict on the old crowd: "too plain" — flat
// single-colour blocks, bare heads, nobody distinguishable from
// anybody. Every body now gets a per-person detail stream from
// a seeded RNG: skin tone, hair or headwear, a two-tone outfit
// (an open jacket layer or contrast sleeves on some), long
// trousers or shorts, a belt, shoes, sometimes a wristwatch or
// the shoulder bag. Fixed identities ride on top: the Kerang
// Boys all wear the SAME yellow bandana over the gang purple,
// the SBPD wear a navy police cap, and Raka's look is passed
// in whole by his caller and never randomises. Detail parts
// share one cached geometry/material per part across all 45+
// bodies, so the detail costs no extra programs and few meshes.
const SKIN = [0xffdbac, 0xf2c79b, 0xe0ac69, 0xc68863, 0xa06a38, 0x8d5524, 0x6f4420];
const SHIRTS = [0xe63946, 0x2a9d8f, 0xf4a261, 0x457b9d, 0xe9c46a, 0x9b5de5, 0xf1fa8c, 0xffffff, 0x06d6a0, 0xef476f];
const PANTS_COLS = [0x2b2d42, 0x1f2733, 0x34558b, 0x4a4238, 0x9a8a68, 0x5b6770, 0x71563f, 0x3a3f4a];
const JACKET_COLS = [0x37474f, 0x5d4037, 0x274156, 0x6b2737, 0x2e4a34, 0x71563f, 0x22262b];
const HAIR_COLS = [0x17120e, 0x2a1a10, 0x453016, 0x6e4f26, 0x8a8d90, 0xb8b0a4];
const CAP_COLS = [0xe63946, 0x14202e, 0xf4f1e6, 0x2a9d8f, 0xe9c46a, 0x243447];
const BANDANA_COLS = [0xb03a2e, 0x2a6f6f, 0xe8e3d8, 0x51648a];
const GANG_BANDANA = 0xffd21f;   // Kerang Boys signature — every hostile, every mission

const _geoCache = new Map();
function cgeo(w, h, d) {
  const k = w + "x" + h + "x" + d;
  let geo = _geoCache.get(k);
  if (!geo) { geo = new THREE.BoxGeometry(w, h, d); _geoCache.set(k, geo); }
  return geo;
}
const _matCache = new Map();
function lam(color) {
  let m = _matCache.get(color);
  if (!m) { m = new THREE.MeshLambertMaterial({ color }); _matCache.set(color, m); }
  return m;
}
function cbox(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(cgeo(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true;
  parent.add(m); return m;
}
function personRng() {
  let s = ((Math.random() * 0xffffffff) >>> 0) || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// -- Hand weapons (v5 detail pass, contrast revision) ---------------
// The old gun was a single small black box: at duel distances you
// saw beams but no weapon. The first v5 pass gave each class a
// two-tone silhouette, but the owner still could not find the
// guns in the proof frames: the pale tan furniture washed out
// under the senja grade against the lit road pool, and the
// profiles were too thin to name at 11–21 m. This revision is
// contrast-first — near-black bodies so the SILHOUETTE carries
// the read, one thin steel line along the barrel/slide as the
// only accent, and thicker, longer profiles per class (pistol
// chunky, SMG with a big magazine block, long gun unmistakably
// long). Meshes only: no stats, poses or firing logic live
// here. Class is picked from the role the caller already
// declares (cop / hostile / other), varied by the person's rng.
function buildGunMesh(opts, rnd) {
  const gun = new THREE.Group();
  gun.position.set(-0.42, 1.28, 0.02);
  const body = lam(0x131418), steel = lam(0x93a3b1);
  const cls = opts.weapon
    ?? (opts.cop ? (rnd() < 0.35 ? "long" : "pistol")
      : opts.hostile ? (rnd() < 0.45 ? "smg" : rnd() < 0.62 ? "long" : "pistol")
      : "smg");
  if (cls === "pistol") {
    cbox(0.11, 0.17, 0.52, body, 0, 0.03, 0.22, gun);        // frame + barrel
    cbox(0.115, 0.035, 0.5, steel, 0, 0.125, 0.22, gun);    // slide line
    const grip = cbox(0.105, 0.3, 0.14, body, 0, -0.13, 0.0, gun);
    grip.rotation.x = 0.28;
    cbox(0.05, 0.06, 0.05, body, 0, 0.17, 0.44, gun);        // front sight
  } else if (cls === "smg") {
    cbox(0.13, 0.21, 0.62, body, 0, 0.04, 0.28, gun);       // receiver
    cbox(0.09, 0.1, 0.42, body, 0, 0.06, 0.78, gun);        // barrel
    cbox(0.095, 0.045, 0.4, steel, 0, 0.125, 0.78, gun);    // barrel line
    const mag = cbox(0.1, 0.42, 0.14, body, 0, -0.22, 0.32, gun);
    mag.rotation.x = -0.14;
    cbox(0.11, 0.16, 0.26, body, 0, 0.02, -0.18, gun);      // stock
    cbox(0.09, 0.2, 0.08, body, 0, -0.14, 0.62, gun);       // foregrip
    const grip = cbox(0.09, 0.2, 0.1, body, 0, -0.13, 0.02, gun);
    grip.rotation.x = 0.2;
  } else {
    // Long gun (the 12G Laras pattern): black furniture, one
    // long barrel with a steel line, the bead at the muzzle.
    cbox(0.12, 0.2, 0.6, body, 0, 0.04, 0.24, gun);         // receiver
    cbox(0.08, 0.09, 0.72, body, 0, 0.08, 0.9, gun);        // barrel
    cbox(0.085, 0.04, 0.7, steel, 0, 0.14, 0.9, gun);       // barrel line
    cbox(0.14, 0.15, 0.34, body, 0, -0.02, 0.72, gun);      // fore-end / pump
    const stock = cbox(0.11, 0.24, 0.4, body, 0, -0.04, -0.24, gun);
    stock.rotation.x = -0.1;
    cbox(0.05, 0.08, 0.05, steel, 0, 0.19, 1.22, gun);      // bead sight
    const grip = cbox(0.09, 0.22, 0.12, body, 0, -0.16, 0.28, gun);
    grip.rotation.x = -0.1;
  }
  // Crop-test iteration: at duel distance the SMG/long profiles
  // still shrank to a wedge at the beam's origin, so the two long
  // classes get one more presence step (the pistol stays true to
  // size — it reads at the ranges pistols are seen).
  if (cls !== "pistol") gun.scale.setScalar(1.3);
  return gun;
}

export function buildPersonMesh(opts = {}) {
  const g = new THREE.Group();
  const rnd = personRng();
  const pick = (arr) => arr[(rnd() * arr.length) | 0];
  const isCop = !!opts.cop, isGang = !!opts.hostile;
  const skin = lam(opts.skin ?? pick(SKIN));
  const shirt = lam(opts.shirt ?? pick(SHIRTS));
  const pants = lam(opts.pants ?? (isGang ? 0x23232c : isCop ? 0x16233d : pick(PANTS_COLS)));
  // The model faces +Z: shoulders and hips spread along X, the gun arm
  // reaches forward along +Z, and limb swings rotate around the X axis.
  const torso = cbox(0.62, 0.78, 0.34, shirt, 0, 1.12, 0, g);
  // Two-tone layer: an open jacket/overshirt — side panels and a
  // back panel over the shirt, the shirt still showing at the
  // chest, the sleeves in the jacket's colour. Raka's is passed
  // in (opts.jacket); part of the crowd rolls its own. Without a
  // jacket, some civilians get contrast (raglan) sleeves instead.
  let armMat = shirt;
  let jacket = null;
  if (opts.jacket) jacket = lam(opts.jacket);
  else if (!isCop && !isGang && !opts.vest && rnd() < 0.38) jacket = lam(pick(JACKET_COLS));
  if (jacket) {
    cbox(0.17, 0.7, 0.36, jacket, 0.245, 1.14, 0, g);
    cbox(0.17, 0.7, 0.36, jacket, -0.245, 1.14, 0, g);
    cbox(0.64, 0.7, 0.07, jacket, 0, 1.14, -0.155, g);
    armMat = jacket;
  } else if (opts.sleeves) armMat = lam(opts.sleeves);
  else if (!isCop && !isGang && rnd() < 0.3) armMat = lam(pick(PANTS_COLS));
  // Head, with a face hint: two dark eyes on the +Z face — just
  // enough to give the head a front at this poly scale.
  cbox(0.4, 0.42, 0.4, skin, 0, 1.74, 0, g);
  const eyeL = cbox(0.055, 0.07, 0.02, lam(0x17110c), 0.09, 1.79, 0.2, g); eyeL.castShadow = false;
  const eyeR = cbox(0.055, 0.07, 0.02, lam(0x17110c), -0.09, 1.79, 0.2, g); eyeR.castShadow = false;
  // Headwear and hair. Gang and police identities are FIXED and
  // win over everything; an explicit cap/hat/bandana from the
  // caller comes next; the rest of the crowd rolls its own —
  // hair crop, cap forwards or backwards, a muted bandana, or
  // a bare head.
  const wearHair = () => {
    const hm = lam(pick(HAIR_COLS));
    cbox(0.44, 0.13, 0.44, hm, 0, 1.965, 0, g);
    cbox(0.44, 0.32, 0.09, hm, 0, 1.81, -0.175, g);
  };
  const wearCap = (color, back) => {
    const cm = lam(color);
    cbox(0.47, 0.13, 0.47, cm, 0, 1.99, 0, g);
    cbox(0.4, 0.05, 0.3, cm, 0, 1.94, back ? -0.34 : 0.34, g);
  };
  const wearBandana = (color) => {
    const bm = lam(color);
    cbox(0.46, 0.2, 0.46, bm, 0, 1.9, 0, g);
    cbox(0.42, 0.09, 0.42, bm, 0, 2.02, 0, g);
    const tail = cbox(0.15, 0.26, 0.05, bm, 0.1, 1.76, -0.24, g);
    tail.rotation.x = 0.15;
  };
  if (isGang) wearBandana(GANG_BANDANA);
  else if (isCop) {
    const cm = lam(0x14264a);
    cbox(0.47, 0.14, 0.47, cm, 0, 1.99, 0, g);
    cbox(0.48, 0.06, 0.48, lam(0x2c4a7c), 0, 1.93, 0, g);
    cbox(0.4, 0.05, 0.3, cm, 0, 1.94, 0.34, g);
    const badge = cbox(0.07, 0.07, 0.02, lam(0xd7dde3), 0, 2.0, 0.24, g); badge.castShadow = false;
  }
  else if (opts.bandana) wearBandana(opts.bandana);
  else if (opts.cap) wearCap(opts.cap, opts.capBack);
  else if (opts.hat) {
    const hm = lam(opts.hat);
    cbox(0.6, 0.07, 0.6, hm, 0, 1.95, 0, g);
    cbox(0.36, 0.2, 0.36, hm, 0, 2.06, 0, g);
  } else {
    const r = rnd();
    if (r < 0.42) wearHair();
    else if (r < 0.62) wearCap(pick(CAP_COLS), false);
    else if (r < 0.7) wearCap(pick(CAP_COLS), true);
    else if (r < 0.8) wearBandana(pick(BANDANA_COLS));
    // else: bare head
  }
  const armL = box(0.16, 0.66, 0.16, armMat, 0.42, 1.14, 0, g);
  const armR = box(0.16, 0.66, 0.16, armMat, -0.42, 1.14, 0, g);
  armL.geometry.translate(0, -0.26, 0); armR.geometry = armL.geometry;
  // A wristwatch on some wrists — a child of the arm, so it
  // rides the swing.
  if (!isCop && rnd() < 0.35) cbox(0.2, 0.09, 0.2, lam(0x1c1c22), 0, -0.52, 0, armL);
  // Legs: long trousers, or shorts over a bare shin for part of
  // the crowd; a dark shoe finishes either at the ankle.
  const shorts = !isCop && !isGang && rnd() < 0.26;
  const makeLeg = (x) => {
    let leg;
    if (shorts) {
      leg = box(0.2, 0.44, 0.2, pants, x, 0.55, 0, g);
      leg.geometry.translate(0, -0.19, 0);
      cbox(0.17, 0.3, 0.17, skin, 0, -0.55, 0, leg);
    } else {
      leg = box(0.2, 0.74, 0.2, pants, x, 0.37, 0, g);
      leg.geometry.translate(0, -0.3, 0);
    }
    cbox(0.22, 0.09, 0.34, lam(0x23211e), 0, -0.675, 0.05, leg);
    leg.position.y = 0.72;
    return leg;
  };
  const legL = makeLeg(0.16);
  const legR = makeLeg(-0.16);
  // A belt line at the waist on long trousers.
  if (!shorts) cbox(0.64, 0.09, 0.36, lam(0x2a2019), 0, 0.755, 0, g);
  // Pivot-corrected limbs: move groups so rotation swings from the shoulder/hip.
  armL.position.y = 1.42; armR.position.y = 1.42;
  g.userData.limbs = { armL, armR, legL, legR, torso };
  // A shoulder bag on part of the crowd, strap worn across the chest.
  let bag = opts.bag;
  if (bag === undefined && !opts.cop && !opts.vest && rnd() < 0.3) {
    bag = pick(SHIRTS);
  }
  if (bag) {
    const bagMat = lam(bag);
    cbox(0.36, 0.42, 0.16, bagMat, 0.46, 0.98, 0.04, g);
    const strap = cbox(0.09, 0.78, 0.37, bagMat, 0, 1.28, 0, g);
    strap.rotation.z = 0.55;
  }
  if (opts.gun) {
    const gun = buildGunMesh(opts, rnd);
    g.add(gun);
    g.userData.gun = gun;
  }
  if (opts.hostile) {
    // Combat marker (v5.3): a small red ▼ floating over an active
    // hostile's head — the reference games tag every gunman this
    // way, and it answers the owner's longest-running screenshot
    // complaint: enemies the eye cannot find in the frame. Basic
    // material so it stays red at dusk. updatePeds owns when it
    // shows (an engaged hostile, never a corpse, never a
    // bystander) and its gentle bob; it starts hidden.
    const tri = new THREE.Mesh(
      new THREE.ConeGeometry(0.17, 0.42, 4),
      new THREE.MeshBasicMaterial({ color: 0xff2d2d })
    );
    tri.rotation.x = Math.PI;        // apex down
    tri.rotation.y = Math.PI / 4;    // diamond face to the viewer
    tri.position.y = 2.42;
    tri.visible = false;
    g.add(tri);
    g.userData.marker = tri;
  }
  if (opts.vest) cbox(0.66, 0.5, 0.38, lam(0x243447), 0, 1.18, 0, g);
  // Slight height variety across the crowd.
  g.scale.y = opts.height ?? (0.93 + rnd() * 0.13);
  return g;
}

export function animatePerson(mesh, phase, speed) {
  const { armL, armR, legL, legR } = mesh.userData.limbs;
  const s = Math.sin(phase) * Math.min(1, speed * 0.16);
  armL.rotation.x = s * 0.8; armR.rotation.x = -s * 0.8;
  legL.rotation.x = -s; legR.rotation.x = s;
}

export function buildHelicopterMesh() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xeef2f5 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1d4e9e });
  box(4.6, 1.9, 2.0, bodyMat, 0, 0, 0, g);
  box(1.8, 1.2, 1.8, MAT.glass, 1.9, 0.25, 0, g);
  box(4.4, 0.5, 0.6, darkMat, -4.2, 0.5, 0, g);
  box(0.4, 1.4, 1.6, darkMat, -6.4, 0.9, 0, g);
  box(3.4, 0.18, 0.5, MAT.black, 0, -1.25, 0.8, g);
  box(3.4, 0.18, 0.5, MAT.black, 0, -1.25, -0.8, g);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.5), MAT.black);
  rotor.position.y = 1.25; g.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.3), MAT.black);
  tailRotor.position.set(-6.5, 0.9, 0.35); g.add(tailRotor);
  // Searchlight: a translucent cone plus a real spotlight. The cone
  // runs wide and bright (radius 8.5, opacity 0.27): at the old
  // 7 / 0.16 the shaft washed out against the dusk sky in every
  // still and most play, and Air One is a headline feature — its
  // beam should be the first thing a screenshot of a 4-star chase
  // shows, a solid column of light with a pool you can stand in.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(8.5, 26, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.27, depthWrite: false, side: THREE.DoubleSide })
  );
  cone.position.y = -13.5; g.add(cone);
  const spot = new THREE.SpotLight(0xfff3b0, 0, 90, 0.32, 0.5, 0.6);
  spot.position.set(0, -1, 0); g.add(spot); g.add(spot.target);
  spot.target.position.set(0, -30, 0);
  g.userData.rotor = rotor; g.userData.tailRotor = tailRotor; g.userData.spot = spot; g.userData.cone = cone;
  return g;
}

export function buildCrateMesh() {
  const g = new THREE.Group();
  box(1.6, 1.6, 1.6, new THREE.MeshLambertMaterial({ color: 0xd9a441 }), 0, 0.8, 0, g);
  box(1.7, 0.25, 1.7, new THREE.MeshLambertMaterial({ color: 0x8a6b1f }), 0, 1.55, 0, g);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe14d }));
  beacon.position.y = 2.3; g.add(beacon);
  g.userData.beacon = beacon;
  return g;
}

export function buildMarkerMesh(color) {
  // A vertical beam of light the player can see across the bay.
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 60, 16, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })
  );
  beam.position.y = 30; g.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.1, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; g.add(ring);
  g.userData.beam = beam; g.userData.ring = ring;
  return g;
}
