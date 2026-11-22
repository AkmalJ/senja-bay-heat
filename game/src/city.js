// city.js — builds Senja Bay in three.js: the road grid, city blocks with
// lit windows, the strand and ocean, palms, streetlights, the night market,
// port cranes and the hills. Also owns collision boxes and road helpers.

import * as THREE from "three";
import { WORLD, DISTRICTS } from "./config.js";

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roadLines() {
  // Road centrelines along both axes, from -3..3 blocks.
  const lines = [];
  for (let i = -3; i <= 3; i++) lines.push(i * WORLD.block);
  return lines;
}

export function nearestRoadCoord(v) {
  const lines = roadLines();
  let best = lines[0], bd = Infinity;
  for (const l of lines) { const d = Math.abs(l - v); if (d < bd) { bd = d; best = l; } }
  return best;
}

export function isOnRoad(x, z) {
  const half = WORLD.roadHalf + 2;
  return Math.abs(x - nearestRoadCoord(x)) < half || Math.abs(z - nearestRoadCoord(z)) < half;
}

function windowTexture(base, litRatio, rnd) {
  const c = document.createElement("canvas"); c.width = 64; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 10) for (let x = 6; x < 58; x += 10) {
    const lit = rnd() < litRatio;
    g.fillStyle = lit ? (rnd() < 0.5 ? "#ffd98a" : "#aee6ff") : "rgba(20,28,44,0.85)";
    g.fillRect(x, y, 6, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Sky dome: its material colour is tinted every frame by the day cycle in main.js.
export function buildSky(scene, rnd) {
  // A gradient dome, a low sun disc and flat-shaded cloud clusters — the
  // tropical sky the top of the frame is judged on.
  const c = document.createElement("canvas"); c.width = 4; c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#3d7ac2"); grad.addColorStop(0.45, "#79aede");
  grad.addColorStop(0.75, "#cfe3ee"); grad.addColorStop(1, "#f6d9a8");
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const domeMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1300, 20, 12), domeMat);
  dome.userData.mat = domeMat;
  scene.add(dome);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(46, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false }));
  sunDisc.position.set(-420, 300, -900); sunDisc.lookAt(0, 60, 0);
  scene.add(sunDisc);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 16; i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + (rnd() * 3 | 0);
    for (let p = 0; p < puffs; p++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(9 + rnd() * 13, 8, 6), cloudMat);
      s.scale.y = 0.42;
      s.position.set(p * 13 - puffs * 6, (rnd() - 0.5) * 3, (rnd() - 0.5) * 8);
      cloud.add(s);
    }
    cloud.position.set((rnd() - 0.5) * 1500, 95 + rnd() * 70, (rnd() - 0.5) * 1500);
    scene.add(cloud);
  }
  return dome;
}

export class City {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];   // {x,z,hw,hd} axis-aligned boxes (buildings, stalls)
    this.lamps = [];
    this.buildings = [];
    const rnd = mulberry(20261117);
    this.rnd = rnd;
    this.nightLights = [];
    this.skyDome = buildSky(scene, rnd);
    this.buildGround(rnd);
    this.buildRoads(rnd);
    this.buildBlocks(rnd);
    this.buildStrand(rnd);
    this.buildMarket(rnd);
    this.buildPort(rnd);
    this.buildPalmsAndLamps(rnd);
  }

  addCollider(x, z, hw, hd) { this.colliders.push({ x, z, hw, hd }); }

  collide(x, z, r) {
    // Push a point (with radius r) out of every collider; returns corrected [x,z].
    for (const c of this.colliders) {
      const dx = x - c.x, dz = z - c.z;
      const px = c.hw + r - Math.abs(dx), pz = c.hd + r - Math.abs(dz);
      if (px > 0 && pz > 0) {
        if (px < pz) x = c.x + (dx > 0 ? c.hw + r : -c.hw - r);
        else z = c.z + (dz > 0 ? c.hd + r : -c.hd - r);
      }
    }
    const lim = WORLD.size / 2 - 6;
    x = Math.max(-lim, Math.min(lim, x));
    z = Math.max(-lim, Math.min(lim, z));
    return [x, z];
  }

  buildGround(rnd) {
    const s = WORLD.size;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(s + 400, s + 400),
      new THREE.MeshLambertMaterial({ color: 0x8a9a6b })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);
    // Sidewalk slabs under every block read as pavement from the air.
    const pave = new THREE.MeshLambertMaterial({ color: 0xb8b0a0 });
    for (const bx of roadLines()) for (const bz of roadLines()) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(WORLD.block - WORLD.roadHalf * 2 + 6, 0.18, WORLD.block - WORLD.roadHalf * 2 + 6), pave);
      slab.position.set(bx + WORLD.block / 2, 0.02, bz + WORLD.block / 2);
      slab.receiveShadow = true;
      this.scene.add(slab);
    }
  }

  buildRoads(rnd) {
    const s = WORLD.size + 60;
    const asphalt = new THREE.MeshLambertMaterial({ color: 0x424a54 });
    for (const l of roadLines()) {
      for (const along of [0]) {
        const v = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadHalf * 2, s), asphalt);
        v.rotation.x = -Math.PI / 2; v.position.set(l, 0.06 + along, 0); v.receiveShadow = true; this.scene.add(v);
        const h = new THREE.Mesh(new THREE.PlaneGeometry(s, WORLD.roadHalf * 2), asphalt);
        h.rotation.x = -Math.PI / 2; h.position.set(0, 0.06, l); h.receiveShadow = true; this.scene.add(h);
      }
      // Dashed centre lines.
      const dashMat = new THREE.MeshBasicMaterial({ color: 0xf7d154 });
      for (let d = -s / 2; d < s / 2; d += 9) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4.2), dashMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(l, 0.1, d); this.scene.add(dash);
        const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.5), dashMat);
        dash2.rotation.x = -Math.PI / 2; dash2.position.set(d, 0.1, l); this.scene.add(dash2);
      }
    }
  }

  buildBlocks(rnd) {
    const palette = ["#e8b04b", "#d96f4e", "#7fb3d5", "#f2e3c6", "#c97b8a", "#8fc1a9", "#e07a3f", "#a8c6e0", "#f0f0e8", "#d94f70"];
    const lines = roadLines();
    for (let ix = 0; ix < lines.length - 1; ix++) for (let iz = 0; iz < lines.length - 1; iz++) {
      const cx = lines[ix] + WORLD.block / 2, cz = lines[iz] + WORLD.block / 2;
      // The market, port apron, strand and plaza blocks stay open.
      if (cx > 200 && cz > -140 && cz < 60) continue;              // strand park
      if (cx < -140 && cx > -300 && cz > 60 && cz < 240) continue; // market square
      if (cx > 120 && cz > 160) continue;                          // port apron
      if (Math.abs(cx - 47) < 60 && Math.abs(cz - 47) < 60) continue; // downtown plaza
      const downtown = Math.hypot(cx - 30, cz - 40) < 200;
      const hills = cx < -160 && cz < -190;
      const perBlock = downtown ? 2 : 3;
      for (let k = 0; k < perBlock; k++) {
        const w = 16 + rnd() * 14, d = 16 + rnd() * 14;
        const hgt = hills ? 7 + rnd() * 8 : downtown ? 22 + rnd() * 38 : 9 + rnd() * 20;
        const ox = (rnd() - 0.5) * (WORLD.block - WORLD.roadHalf * 2 - w - 8);
        const oz = (rnd() - 0.5) * (WORLD.block - WORLD.roadHalf * 2 - d - 8);
        const base = palette[(rnd() * palette.length) | 0];
        const tex = windowTexture(base, 0.42, rnd);
        tex.repeat.set(Math.max(1, Math.round(w / 24)), Math.max(1, Math.round(hgt / 30)));
        const mat = new THREE.MeshLambertMaterial({ map: tex });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), mat);
        b.position.set(cx + ox, hgt / 2, cz + oz);
        b.castShadow = true; b.receiveShadow = true;
        this.scene.add(b);
        this.buildings.push(b);
        this.addCollider(cx + ox, cz + oz, w / 2, d / 2);
        // Rooftop cap + a water tank or AC box for silhouette.
        const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.6, d * 0.5),
          new THREE.MeshLambertMaterial({ color: 0x555c66 }));
        cap.position.set(cx + ox, hgt + 0.8, cz + oz); this.scene.add(cap);
      }
    }
  }

  buildStrand(rnd) {
    // Sand, then ocean, along the east edge; a pier reaching into the water.
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(120, WORLD.size + 200),
      new THREE.MeshLambertMaterial({ color: 0xeed9a0 }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(330, 0.04, 0); sand.receiveShadow = true; this.scene.add(sand);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, WORLD.size + 500),
      new THREE.MeshLambertMaterial({ color: 0x1d7fa8 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(640, 0.02, 0); this.scene.add(sea);
    this.sea = sea;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(90, 2, 14),
      new THREE.MeshLambertMaterial({ color: 0x8a6b4a }));
    pier.position.set(395, 1, 40); this.scene.add(pier);
    // Beach umbrellas.
    const cols = [0xff5964, 0xffd23f, 0x3ec1d3, 0xff8fa3];
    for (let i = 0; i < 16; i++) {
      const u = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 8),
        new THREE.MeshLambertMaterial({ color: cols[i % 4] }));
      u.position.set(310 + rnd() * 45, 2.2, -260 + rnd() * 520);
      u.castShadow = true; this.scene.add(u);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4),
        new THREE.MeshLambertMaterial({ color: 0xdddddd }));
      pole.position.copy(u.position); pole.position.y = 1.1; this.scene.add(pole);
    }
  }

  buildMarket(rnd) {
    // Pasar Malam: rows of stalls with bright awnings around the square.
    const cols = [0xe63946, 0xf4a261, 0x2a9d8f, 0xe9c46a, 0x9b5de5];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
      const x = -268 + i * 24, z = 92 + row * 34;
      const stall = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(9, 2.4, 6),
        new THREE.MeshLambertMaterial({ color: 0x9a6b43 }));
      box.position.y = 1.2; box.castShadow = true; stall.add(box);
      const awn = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.3, 7.5),
        new THREE.MeshLambertMaterial({ color: cols[(row * 6 + i) % 5] }));
      awn.position.y = 3.1; awn.rotation.z = 0.06; stall.add(awn);
      stall.position.set(x, 0, z);
      this.scene.add(stall);
      this.addCollider(x, z, 4.5, 3);
    }
    // String lights over the square.
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
    for (let i = 0; i < 40; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), bulbMat);
      bulb.position.set(-275 + (i % 10) * 13, 6.5 + Math.sin(i) * 0.5, 92 + ((i / 10) | 0) * 34);
      this.scene.add(bulb);
    }
    // Warm work lights that take over the square after dark.
    for (const [lx, lz] of [[-240, 105], [-195, 140], [-235, 165]]) {
      const pl = new THREE.PointLight(0xffb36b, 0, 85, 1.4);
      pl.position.set(lx, 9, lz);
      this.scene.add(pl);
      this.nightLights.push(pl);
    }
  }

  buildPort(rnd) {
    // Cranes, containers and a freighter silhouette at Pelabuhan.
    const contCols = [0xc0392b, 0x2471a3, 0x229954, 0xca6f1e, 0x707b7c];
    for (let i = 0; i < 22; i++) {
      const cx = 130 + rnd() * 150, cz = 185 + rnd() * 110;
      const cont = new THREE.Mesh(new THREE.BoxGeometry(12, 4.5, 5),
        new THREE.MeshLambertMaterial({ color: contCols[i % 5] }));
      cont.position.set(cx, 2.25 + (i % 3 === 0 ? 4.5 : 0), cz);
      cont.rotation.y = (rnd() - 0.5) * 0.4; cont.castShadow = true;
      this.scene.add(cont);
      if (i % 3 !== 0) this.addCollider(cx, cz, 6, 2.6);
    }
    for (const [lx, lz] of [[180, 215], [235, 255]]) {
      const pl = new THREE.PointLight(0xaee6ff, 0, 90, 1.4);
      pl.position.set(lx, 12, lz);
      this.scene.add(pl);
      this.nightLights.push(pl);
    }
    for (const [x, z] of [[165, 205], [245, 260]]) {
      const crane = new THREE.Group();
      const legMat = new THREE.MeshLambertMaterial({ color: 0xe67e22 });
      for (const [lx, lz] of [[-7, -4], [7, -4], [-7, 4], [7, 4]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 26, 1.4), legMat);
        leg.position.set(lx, 13, lz); crane.add(leg);
      }
      const arm = new THREE.Mesh(new THREE.BoxGeometry(30, 1.8, 2), legMat);
      arm.position.set(6, 26, 0); crane.add(arm);
      crane.position.set(x, 0, z); this.scene.add(crane);
      this.addCollider(x, z, 8, 5);
    }
  }

  buildPalmsAndLamps(rnd) {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b4a });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x35b558, side: THREE.DoubleSide });
    const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x2a9d4a, side: THREE.DoubleSide });
    const palmAt = (x, z) => {
      const palm = new THREE.Group();
      const h = 7 + rnd() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, h, 6), trunkMat);
      trunk.position.y = h / 2; trunk.rotation.z = (rnd() - 0.5) * 0.16; trunk.castShadow = true; palm.add(trunk);
      // Fronds: thin tapered boxes drooping from the crown, not flat cards.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + rnd() * 0.4;
        const pivot = new THREE.Group();
        pivot.position.y = h;
        pivot.rotation.y = -a;
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.09, 0.62), i % 2 ? leafMat : leafMat2);
        leaf.position.x = 2.1;
        leaf.rotation.z = -0.52;
        pivot.add(leaf);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.4), i % 2 ? leafMat2 : leafMat);
        tip.position.set(4.4, -1.15, 0);
        tip.rotation.z = -1.05;
        pivot.add(tip);
        palm.add(pivot);
      }
      palm.position.set(x, 0, z); this.scene.add(palm);
    };
    for (let z = -330; z <= 330; z += 24) palmAt(292 + (rnd() - 0.5) * 6, z);
    for (let i = 0; i < 60; i++) {
      const x = (rnd() - 0.5) * 620, z = (rnd() - 0.5) * 620;
      if (!isOnRoad(x, z)) palmAt(x, z);
    }
    // Streetlights at intersections.
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3c4148 });
    for (const lx of roadLines()) for (const lz of roadLines()) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 7.5, 6), poleMat);
      pole.position.set(lx + 13, 3.75, lz + 13); this.scene.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
      head.position.set(lx + 13, 7.6, lz + 13); this.scene.add(head);
      this.lamps.push(head);
    }
  }

  districtAt(x, z) {
    let best = DISTRICTS[5], bd = Infinity;
    for (const d of DISTRICTS) {
      const dist = Math.hypot(x - d.x, z - d.z);
      if (dist < bd) { bd = dist; best = d; }
    }
    return best;
  }
}
