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
  const bodyMat = new THREE.MeshLambertMaterial({ color: opts.color ?? model.color });
  const trimMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(opts.color ?? model.color).multiplyScalar(0.68) });
  const isVan = model.name.includes("Van");
  const isPickup = model.name.includes("Pickup");
  const isSport = model.name.includes("GT") || model.name.includes("Coupe");
  const L = isVan ? 5.6 : 4.6, W = 2.0;
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  const tl = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
  const plateMat = new THREE.MeshBasicMaterial({ color: 0xf2f4f6 });
  const rimMat = new THREE.MeshLambertMaterial({ color: 0xe9eef3 });

  if (isVan) {
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
  const hlY = isVan ? 1.0 : 0.8, tlY = isVan ? 1.05 : 0.84;
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

const SKIN = [0xf2c79b, 0xc68863, 0x8d5524, 0xffdbac];
const SHIRTS = [0xe63946, 0x2a9d8f, 0xf4a261, 0x457b9d, 0xe9c46a, 0x9b5de5, 0xf1fa8c, 0xffffff, 0x06d6a0, 0xef476f];

export function buildPersonMesh(opts = {}) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: opts.skin ?? SKIN[(Math.random() * SKIN.length) | 0] });
  const shirt = new THREE.MeshLambertMaterial({ color: opts.shirt ?? SHIRTS[(Math.random() * SHIRTS.length) | 0] });
  const pants = new THREE.MeshLambertMaterial({ color: opts.pants ?? 0x2b2d42 });
  // The model faces +Z: shoulders and hips spread along X, the gun arm
  // reaches forward along +Z, and limb swings rotate around the X axis.
  const torso = box(0.62, 0.78, 0.34, shirt, 0, 1.12, 0, g);
  box(0.4, 0.42, 0.4, skin, 0, 1.74, 0, g);                       // head
  // Headwear: an explicit cap or hat wins; otherwise part of the crowd
  // picks one up on its own — never the vested crews or the SBPD.
  let cap = opts.cap, hat = opts.hat;
  if (!cap && !hat && !opts.cop && !opts.vest && Math.random() < 0.34) {
    if (Math.random() < 0.45) hat = SHIRTS[(Math.random() * SHIRTS.length) | 0];
    else cap = SHIRTS[(Math.random() * SHIRTS.length) | 0];
  }
  if (cap) box(0.46, 0.1, 0.46, new THREE.MeshLambertMaterial({ color: cap }), 0, 1.97, 0, g);
  if (hat) {
    const hatMat = new THREE.MeshLambertMaterial({ color: hat });
    box(0.6, 0.07, 0.6, hatMat, 0, 1.95, 0, g);
    box(0.36, 0.2, 0.36, hatMat, 0, 2.06, 0, g);
  }
  const armL = box(0.16, 0.66, 0.16, shirt, 0.42, 1.14, 0, g);
  const armR = box(0.16, 0.66, 0.16, shirt, -0.42, 1.14, 0, g);
  armL.geometry.translate(0, -0.26, 0); armR.geometry = armL.geometry;
  const legL = box(0.2, 0.74, 0.2, pants, 0.16, 0.37, 0, g);
  const legR = box(0.2, 0.74, 0.2, pants, -0.16, 0.37, 0, g);
  legL.geometry.translate(0, -0.3, 0); legR.geometry = legL.geometry;
  // Pivot-corrected limbs: move groups so rotation swings from the shoulder/hip.
  armL.position.y = 1.42; armR.position.y = 1.42; legL.position.y = 0.72; legR.position.y = 0.72;
  g.userData.limbs = { armL, armR, legL, legR, torso };
  // A shoulder bag on part of the crowd, strap worn across the chest.
  let bag = opts.bag;
  if (bag === undefined && !opts.cop && !opts.vest && Math.random() < 0.3) {
    bag = SHIRTS[(Math.random() * SHIRTS.length) | 0];
  }
  if (bag) {
    const bagMat = new THREE.MeshLambertMaterial({ color: bag });
    box(0.36, 0.42, 0.16, bagMat, 0.46, 0.98, 0.04, g);
    const strap = box(0.09, 0.78, 0.37, bagMat, 0, 1.28, 0, g);
    strap.rotation.z = 0.55;
  }
  if (opts.gun) {
    const gun = box(0.08, 0.12, 0.55, MAT.black, -0.42, 1.3, 0.3, g);
    g.userData.gun = gun;
  }
  if (opts.vest) box(0.66, 0.5, 0.38, new THREE.MeshLambertMaterial({ color: 0x243447 }), 0, 1.18, 0, g);
  // Slight height variety across the crowd.
  g.scale.y = opts.height ?? (0.93 + Math.random() * 0.13);
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
  // Searchlight: a translucent cone plus a real spotlight.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(7, 26, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })
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
