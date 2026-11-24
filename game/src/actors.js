// actors.js — the bay's bodies: blocky low-poly people with jointed
// limbs, the guns they hold, and the cars they steal. People are
// groups of boxes hung off named pivots (userData.limbs) so the aim
// pose and the walk cycle bend the same joints. A gun is a child of
// the person's root; every frame updateGunAnchor walks it to the
// gun hand, so the steel sits IN the fist, never on the forearm.

const T = () => window.THREE;

function lam(color) { return new (T()).MeshLambertMaterial({ color }); }
function bas(color) { return new (T()).MeshBasicMaterial({ color }); }

function box(w, h, d, mat, x, y, z, parent) {
  const m = new (T()).Mesh(new (T()).BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  if (parent) parent.add(m);
  return m;
}

// ---- guns -------------------------------------------------------
// Three classes, one grammar: charcoal body, steel moving parts, a
// barrel that ends in a brake. userData.grip is where the hand holds
// (gun-local), userData.muzzle is the barrel tip (gun-local) — the
// two points the rest of the game reasons about.

export function buildGunMesh(kind) {
  const THREE = T();
  const body = lam(0x131418), steel = lam(0x93a3b1), dark = lam(0x232830);
  const g = new THREE.Group();
  if (kind === "pistol") {
    box(0.055, 0.11, 0.24, body, 0, 0, 0.02, g);                    // slide + frame
    box(0.05, 0.13, 0.06, dark, 0, -0.10, -0.07, g);               // grip
    box(0.02, 0.03, 0.05, steel, 0, 0.075, 0.10, g);               // front sight
    g.userData.grip = new THREE.Vector3(0, -0.09, -0.06);
    g.userData.muzzle = new THREE.Vector3(0, 0.03, 0.155);
  } else if (kind === "shotgun") {
    box(0.06, 0.09, 0.78, body, 0, 0, 0.10, g);                    // receiver + barrel
    box(0.045, 0.045, 0.34, steel, 0, -0.055, 0.22, g);            // tube magazine
    box(0.055, 0.10, 0.22, lam(0x6e4a2f), 0, -0.01, -0.36, g);     // wooden stock
    box(0.05, 0.12, 0.06, dark, 0, -0.10, -0.16, g);               // grip
    g.userData.grip = new THREE.Vector3(0, -0.09, -0.15);
    g.userData.muzzle = new THREE.Vector3(0, 0.03, 0.50);
  } else { // smg — the Kebun pattern: long, low, fat magazine
    box(0.06, 0.10, 0.62, body, 0, 0, 0.06, g);                    // receiver
    box(0.035, 0.035, 0.30, steel, 0, 0.01, 0.47, g);              // barrel
    box(0.05, 0.05, 0.10, dark, 0, 0.01, 0.66, g);                 // muzzle brake
    box(0.045, 0.20, 0.07, dark, 0, -0.14, 0.02, g);               // magazine
    box(0.05, 0.12, 0.06, dark, 0, -0.09, -0.22, g);               // grip
    box(0.04, 0.06, 0.16, body, 0, 0.02, -0.36, g);                // stock
    box(0.018, 0.035, 0.05, steel, 0, 0.085, 0.30, g);             // front post
    g.userData.grip = new THREE.Vector3(0, -0.08, -0.20);
    g.userData.muzzle = new THREE.Vector3(0, 0.03, 0.72);
  }
  g.userData.kind = kind;
  return g;
}

// The hero build: the same SMG grammar in pale steel so the player's
// and crew's weapons read as shapes of their own in a hard-lit fist.
export function buildHeroGunMesh() {
  const THREE = T();
  const pale = lam(0xb9c9d9), rail = lam(0xe2ecf5), dark = lam(0x232830);
  const g = new THREE.Group();
  box(0.06, 0.10, 0.62, pale, 0, 0, 0.06, g);
  box(0.035, 0.035, 0.30, rail, 0, 0.01, 0.47, g);
  box(0.05, 0.05, 0.10, dark, 0, 0.01, 0.66, g);
  box(0.045, 0.20, 0.07, dark, 0, -0.14, 0.02, g);
  box(0.05, 0.12, 0.06, dark, 0, -0.09, -0.22, g);
  box(0.04, 0.06, 0.16, pale, 0, 0.02, -0.36, g);
  box(0.018, 0.035, 0.05, rail, 0, 0.085, 0.30, g);
  g.userData.grip = new THREE.Vector3(0, -0.08, -0.20);
  g.userData.muzzle = new THREE.Vector3(0, 0.03, 0.72);
  g.userData.kind = "smg";
  g.userData.hero = true;
  // Panel D of the owner's size sheet: the duel build runs at the
  // fraction of the standard envelope he picked by eye.
  g.scale.set(0.340, 0.348, 0.412);
  return g;
}

// ---- people -----------------------------------------------------

const SKIN = [0xe8b98d, 0xc98d5f, 0x9c6b43, 0x7a4f2e];

export function buildPerson(look) {
  const THREE = T();
  const root = new THREE.Group();
  const skin = lam(look.skin != null ? look.skin : SKIN[0]);
  const shirt = lam(look.shirt), pants = lam(look.pants != null ? look.pants : 0x23262b);

  const hips = new THREE.Group(); hips.position.y = 0.98; root.add(hips);
  const torso = box(0.52, 0.62, 0.30, shirt, 0, 0.31, 0, hips);
  if (look.stripe != null) box(0.53, 0.10, 0.31, lam(look.stripe), 0, 0.42, 0, hips);
  box(0.30, 0.16, 0.20, skin, 0, 0.70, 0, hips); // neck + jaw block

  const headPivot = new THREE.Group(); headPivot.position.y = 0.78; hips.add(headPivot);
  const head = box(0.34, 0.36, 0.34, skin, 0, 0.16, 0, headPivot);
  if (look.bandana != null) {
    box(0.37, 0.11, 0.37, lam(look.bandana), 0, 0.30, 0, headPivot);
    box(0.10, 0.16, 0.02, lam(look.bandana), -0.12, 0.16, -0.19, headPivot); // knot tails
  }
  if (look.cap != null) {
    box(0.37, 0.09, 0.37, lam(look.cap), 0, 0.335, 0, headPivot);
    box(0.30, 0.04, 0.20, lam(look.cap), 0, 0.30, 0.26, headPivot); // brim, forward
  }
  if (look.hair != null && look.bandana == null && look.cap == null) {
    box(0.36, 0.10, 0.36, lam(look.hair), 0, 0.315, 0, headPivot);
  }

  const limb = (side, upperMat, lowerMat) => {
    // Shoulder pivot at torso top; the arm hangs down its length.
    const pivot = new THREE.Group();
    pivot.position.set(0.33 * side, 0.56, 0);
    hips.add(pivot);
    box(0.15, 0.52, 0.17, upperMat, 0, -0.24, 0, pivot);
    box(0.13, 0.30, 0.14, lowerMat, 0, -0.62, 0, pivot); // forearm + fist
    return pivot;
  };
  const armR = limb(1, shirt, skin);
  const armL = limb(-1, shirt, skin);

  const leg = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.14 * side, 0.98, 0);
    root.add(pivot);
    box(0.17, 0.55, 0.19, pants, 0, -0.30, 0, pivot);
    box(0.16, 0.42, 0.17, pants, 0, -0.76, 0, pivot);
    box(0.17, 0.09, 0.28, lam(0x1b1b1e), 0, -0.955, 0.04, pivot); // shoe
    return pivot;
  };
  const legR = leg(1), legL = leg(-1);

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  root.userData.limbs = { armR, armL, legR, legL, head: headPivot, hips };
  root.userData.aimBlend = 0;
  root.userData.gun = null;
  root.userData.walkPhase = Math.random() * 6;
  return root;
}

export function giveGun(mesh, gun) {
  if (mesh.userData.gun) mesh.remove(mesh.userData.gun);
  mesh.userData.gun = gun;
  if (gun) mesh.add(gun);
  updateGunAnchor(mesh);
}

// The aim pose: gun arm swung up to a level −1.5 rad, support arm
// across the body to meet it — shoulder, arm, gun and target on one
// line. Eased per-mesh so a raised weapon settles instead of snapping.
export function updateAimPose(mesh, dt, active) {
  const u = mesh.userData, L = u.limbs;
  if (!L) return;
  const target = active ? 1 : 0;
  const rate = active ? 13 : 8;
  u.aimBlend = Math.min(1, Math.max(0, u.aimBlend + (target - u.aimBlend) * Math.min(1, dt * rate) * (target > u.aimBlend ? 1 : 1)));
  if (Math.abs(target - u.aimBlend) < 0.002) u.aimBlend = target;
  const b = u.aimBlend;
  L.armR.rotation.x = -1.5 * b;
  L.armR.rotation.z = -0.06 * b;
  L.armL.rotation.x = -0.55 * b + (1 - b) * L.armL.rotation.x * 0; // support arm joins when aiming
  L.armL.rotation.z = -0.38 * b;
  if (b <= 0.001) { L.armL.rotation.x = L.armL.rotation.x; }
}

// Walk the gun to the gun hand: 0.51 down the right arm from its
// shoulder pivot, following the arm's swing, grip point first.
export function updateGunAnchor(mesh) {
  const gun = mesh.userData.gun;
  if (!gun) return;
  const THREE = T();
  const L = mesh.userData.limbs;
  const shoulder = new THREE.Vector3(0.33, 0.98 + 0.56, 0);
  const armDir = new THREE.Vector3(0, -1, 0);
  const e = new THREE.Euler(L.armR.rotation.x, L.armR.rotation.y, L.armR.rotation.z, "XYZ");
  armDir.applyEuler(e);
  const hand = shoulder.clone().addScaledVector(armDir, 0.51);
  const grip = gun.userData.grip || new THREE.Vector3();
  gun.position.copy(hand).sub(grip.clone().applyEuler(new THREE.Euler(0, mesh.userData.gunYaw || 0, 0)));
  gun.rotation.set(0, mesh.userData.gunYaw || 0, 0);
  gun.rotateX(L.armR.rotation.x + Math.PI / 2 + (mesh.userData.gunPitch || 0));
}

export function gunMuzzleWorld(mesh) {
  const THREE = T();
  const gun = mesh.userData.gun;
  if (!gun || !gun.userData.muzzle) return null;
  mesh.updateWorldMatrix(true, false);
  const local = gun.position.clone().add(gun.userData.muzzle.clone().applyEuler(gun.rotation));
  return mesh.localToWorld(local);
}

export function animatePerson(mesh, speed, dt) {
  const u = mesh.userData, L = u.limbs;
  if (!L) return;
  u.walkPhase += dt * (2.2 + speed * 1.9);
  const swing = Math.min(0.65, speed * 0.16) * Math.sin(u.walkPhase);
  const stillAiming = u.aimBlend > 0.05;
  L.legR.rotation.x = swing;
  L.legL.rotation.x = -swing;
  if (!stillAiming) {
    L.armR.rotation.x = -swing * 0.7;
    L.armL.rotation.x = swing * 0.7;
    L.armL.rotation.z = 0;
  }
  L.hips.position.y = 0.98 + Math.abs(Math.sin(u.walkPhase)) * 0.03 * Math.min(1, speed);
}

export function settleCorpse(mesh) {
  const L = mesh.userData.limbs;
  mesh.rotation.x = -Math.PI / 2 + 0.06;
  mesh.position.y = 0.16;
  if (L) {
    L.armR.rotation.set(0.5, 0, 0.9);
    L.armL.rotation.set(-0.3, 0, -0.7);
    L.legR.rotation.set(0.15, 0, 0.1);
    L.legL.rotation.set(-0.1, 0, -0.14);
  }
  mesh.userData.aimBlend = 0;
}

// ---- cars -------------------------------------------------------
// One grammar per family: a lower body, a cabin, four wheels, and
// the nose at local +Z — headlights sit at +len/2 so the visual
// front and the logical forward can never disagree.

export function buildCarMesh(family, paint) {
  const THREE = T();
  const g = new THREE.Group();
  const bodyMat = lam(paint), darkMat = lam(0x17181c), glassMat = lam(0x1d2b36);
  const L = family.len, W = family.wid;

  if (family.key === "cruiser") {
    box(L * 0.5, 0.55, W, lam(0xf2f3f5), 0, 0.55, 0, g).rotation.z = 0; // placeholder replaced below
    g.clear();
    box(W, 0.52, L, lam(0xf2f3f5), 0, 0.52, 0, g);
    box(W + 0.02, 0.30, L * 0.4, lam(0x14161a), 0, 0.40, 0, g);
    box(W * 0.86, 0.44, L * 0.46, lam(0x14161a), 0, 0.98, -0.1, g);
    box(W * 0.7, 0.10, 0.5, darkMat, 0, 1.26, -0.1, g);
    const barR = box(0.5, 0.09, 0.18, bas(0xff2a2a), -0.28, 1.30, -0.1, g);
    const barB = box(0.5, 0.09, 0.18, bas(0x2255ff), 0.28, 1.30, -0.1, g);
    barR.castShadow = barB.castShadow = false;
    g.userData.lightBar = [barR, barB];
  } else if (family.key === "bemo") {
    box(W, 0.62, L * 0.82, bodyMat, 0, 0.55, -0.1, g);
    box(W * 0.94, 0.5, L * 0.5, bodyMat, 0, 1.06, -0.28, g);
    box(W * 0.8, 0.34, 0.06, glassMat, 0, 1.08, 0.0, g);
    box(W + 0.04, 0.16, L * 0.3, darkMat, 0, 1.36, -0.28, g); // roof rack lip
  } else if (family.key === "kijang") {
    box(W, 0.78, L, bodyMat, 0, 0.66, 0, g);
    box(W * 0.92, 0.55, L * 0.62, bodyMat, 0, 1.30, -0.35, g);
    box(W * 0.94, 0.36, L * 0.5, glassMat, 0, 1.32, -0.35, g);
    box(W * 0.9, 0.3, 0.1, glassMat, 0, 0.78, L / 2 - 0.02, g);
  } else if (family.key === "pelo") {
    box(W, 0.42, L, bodyMat, 0, 0.44, 0, g);
    box(W * 1.02, 0.16, L * 0.7, bodyMat, 0, 0.62, -0.2, g);
    box(W * 0.66, 0.34, L * 0.4, glassMat, 0, 0.80, -0.25, g);
    box(W * 0.8, 0.07, 0.34, darkMat, 0, 0.72, -L / 2 + 0.1, g); // rear wing
    box(0.06, 0.16, 0.3, darkMat, -W * 0.3, 0.58, -L / 2 + 0.1, g);
    box(0.06, 0.16, 0.3, darkMat, W * 0.3, 0.58, -L / 2 + 0.1, g);
  } else { // coupe
    box(W, 0.5, L, bodyMat, 0, 0.52, 0, g);
    box(W * 0.8, 0.4, L * 0.44, glassMat, 0, 0.94, -0.2, g);
    box(W * 0.84, 0.08, L * 0.2, bodyMat, 0, 1.16, -0.2, g);
  }

  // Wheels: dark cylinders turned on their sides, two axles.
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12);
  const wheelMat = lam(0x101114);
  const wheels = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(sx * (W / 2 - 0.05), 0.34, sz * (L / 2 - 0.85));
    w.castShadow = true;
    g.add(w); wheels.push(w);
  }
  g.userData.wheels = wheels;

  // Lights: pale lamps at the nose (+Z), red at the tail.
  const hl = new THREE.BoxGeometry(0.34, 0.12, 0.05);
  const hlMat = bas(0xfff3c4), tlMat = bas(0xd92b1f);
  for (const sx of [-1, 1]) {
    const h = new THREE.Mesh(hl, hlMat); h.position.set(sx * W * 0.32, 0.58, L / 2 + 0.01); g.add(h);
    const t = new THREE.Mesh(hl, tlMat); t.position.set(sx * W * 0.32, 0.60, -L / 2 - 0.01); g.add(t);
  }
  g.traverse((o) => { if (o.isMesh && o.castShadow !== false) o.castShadow = true; });
  return g;
}
