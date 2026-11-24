// city.js — Senja Bay itself: the road grid and its blocks, the
// strand and the sea, Pasar Malam's aisles, Pelabuhan's container
// rows, the chalk hills, and every sign that names the place. The
// city is built once from a private seed so its layout never argues
// with itself between visits. Colliders are honest rectangles; the
// district lookup is a nearest-centre vote the HUD reads each frame.

import { WORLD, DISTRICTS } from "./config.js";

const T = () => window.THREE;

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roadLines() {
  const out = [];
  for (let l = -285; l <= 285; l += WORLD.block) out.push(l);
  return out;
}

export function isOnRoad(x, z) {
  if (Math.abs(x - WORLD.boulevardX) < WORLD.roadHalf + 2) return true;
  for (const l of roadLines()) if (Math.abs(x - l) < WORLD.roadHalf || Math.abs(z - l) < WORLD.roadHalf) return true;
  return false;
}

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new (T()).CanvasTexture(c);
  tex.colorSpace = T().SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function signTexture(title, sub, bg, fg) {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.textAlign = "center";
    g.font = "700 54px Georgia, serif";
    g.fillText(title, w / 2, sub ? 68 : 98);
    if (sub) { g.font = "italic 30px Georgia, serif"; g.fillText(sub, w / 2, 122); }
  });
}

function buildingTexture(base, litRatio, seed) {
  const rnd = mulberry(seed);
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 10; y < h - 12; y += 22) for (let x = 10; x < w - 12; x += 20) {
      const lit = rnd() < litRatio;
      g.fillStyle = lit ? "#ffd98a" : "rgba(20,26,34,0.85)";
      g.fillRect(x, y, 12, 14);
    }
  });
}

function containerTexture(hex, label, number) {
  const col = "#" + hex.toString(16).padStart(6, "0");
  return canvasTex(512, 192, (g, w, h) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.18)";
    for (let x = 8; x < w; x += 24) g.fillRect(x, 0, 7, h);
    g.fillStyle = "rgba(255,255,255,0.88)";
    g.font = "700 44px system-ui, sans-serif"; g.textAlign = "left";
    g.fillText(label, 28, 66);
    g.font = "600 34px system-ui, sans-serif";
    g.fillText(number, 28, 116);
    g.font = "500 22px system-ui, sans-serif";
    g.fillText("SENJA BAY • MAX 24 000 KG", 28, 158);
  });
}

function roadTexture() {
  const tex = canvasTex(128, 512, (g, w, h) => {
    g.fillStyle = "#33373d"; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 260; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    g.fillStyle = "#c9962e";
    g.fillRect(w / 2 - 2, 30, 4, 130); g.fillRect(w / 2 - 2, 290, 4, 130);
  });
  tex.wrapS = tex.wrapT = T().RepeatWrapping;
  return tex;
}

export class City {
  constructor(scene) {
    const THREE = T();
    this.scene = scene;
    this.colliders = [];
    this.lamps = [];
    this.nightLights = [];
    this.clouds = [];
    const rnd = mulberry(20261117);

    // --- light rig: one senja sun + a warm sky bounce -------------
    this.hemi = new THREE.HemisphereLight(0xffd9a8, 0x2e4a55, 0.85);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffb36b, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    scene.add(this.sun); scene.add(this.sun.target);
    this.applyLightRig(false);

    // --- sky: a senja gradient dome + the sun's disc --------------
    const skyTex = canvasTex(64, 512, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#7a4a63");
      grad.addColorStop(0.42, "#d97b4f");
      grad.addColorStop(0.72, "#f7b267");
      grad.addColorStop(1, "#ffd98a");
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
    });
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
    );
    scene.add(sky);
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(70, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false })
    );
    sunDisc.position.set(1330, 205, -110);
    sunDisc.lookAt(0, 40, 0);
    scene.add(sunDisc);
    this.buildClouds(rnd);

    // --- ground: land, sand, sea ----------------------------------
    const land = new THREE.Mesh(new THREE.PlaneGeometry(1700, 1700), new THREE.MeshLambertMaterial({ color: 0x87986e }));
    land.rotation.x = -Math.PI / 2; land.position.y = -0.05; land.receiveShadow = true;
    scene.add(land);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.seaFrom - WORLD.sandFrom, 1700), new THREE.MeshLambertMaterial({ color: 0xf2cb6e }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set((WORLD.sandFrom + WORLD.seaFrom) / 2, -0.02, 0);
    sand.receiveShadow = true;
    scene.add(sand);
    const seaTex = canvasTex(256, 256, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#3d93ad"); grad.addColorStop(1, "#1f6180");
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(255,220,150,0.35)"; g.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        g.beginPath();
        const y = 20 + i * 20;
        for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x / 22 + i) * 3);
        g.stroke();
      }
    });
    seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping; seaTex.repeat.set(6, 20);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1700), new THREE.MeshLambertMaterial({ map: seaTex }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(WORLD.seaFrom + 550, -0.08, 0);
    scene.add(sea);
    this.buildPier();
    this.buildBoats(rnd);

    // --- roads ------------------------------------------------------
    const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture() });
    const mkRoad = (wdt, len, x, z, rotY) => {
      const mat = roadMat.clone();
      mat.map = roadMat.map.clone();
      mat.map.repeat.set(1, len / 44);
      mat.map.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wdt, len), mat);
      m.rotation.x = -Math.PI / 2; m.rotation.z = rotY;
      m.position.set(x, 0.0, z);
      m.receiveShadow = true;
      scene.add(m);
    };
    for (const l of roadLines()) { mkRoad(22, 800, l, 0, 0); mkRoad(22, 800, 0, l, Math.PI / 2); }
    mkRoad(24, 820, WORLD.boulevardX, 0, 0); // the boulevard runs a little wider
    // Crosswalk slabs where the screenshots live.
    const slabMat = new THREE.MeshLambertMaterial({ color: 0xd8d5cc });
    const crosswalk = (x, z, alongX) => {
      for (let i = -2; i <= 2; i++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 1.4 : 7.5, 0.04, alongX ? 7.5 : 1.4), slabMat);
        s.position.set(x + (alongX ? i * 2.1 : 0), 0.03, z + (alongX ? 0 : i * 2.1));
        s.receiveShadow = true;
        scene.add(s);
      }
    };
    crosswalk(285, 190, true); crosswalk(196, 190, false); crosswalk(-152, 95, true); crosswalk(95, 285, false);

    this.buildBlocks(rnd);
    this.buildPalmsAndLamps(rnd);
    this.buildBeach(rnd);
    this.buildMarket(rnd);
    this.buildPort(rnd);
    this.buildSigns();
    this.buildHills();
  }

  // The sun sits in the east and never finishes setting; the menu
  // borrows a higher, farther seat so the poster frame throws long
  // shadows west across the junction.
  applyLightRig(menu) {
    if (menu) {
      this.sun.position.set(946.7, 305, -79.7);
      this.sun.shadow.camera.left = -270; this.sun.shadow.camera.right = 270;
      this.sun.shadow.camera.top = 270; this.sun.shadow.camera.bottom = -270;
      this.sun.shadow.camera.far = 2000;
    } else {
      this.sun.position.set(392, 46, -130);
      this.sun.shadow.camera.left = -120; this.sun.shadow.camera.right = 120;
      this.sun.shadow.camera.top = 120; this.sun.shadow.camera.bottom = -120;
      this.sun.shadow.camera.far = 600;
    }
    this.sun.target.position.set(0, 0, 0);
    this.sun.shadow.camera.updateProjectionMatrix();
  }

  addCollider(x, z, hw, hd) { this.colliders.push({ x, z, hw, hd }); }

  collides(x, z, r) {
    for (const c of this.colliders) {
      if (Math.abs(x - c.x) < c.hw + r && Math.abs(z - c.z) < c.hd + r) return c;
    }
    return null;
  }

  districtAt(x, z) {
    let best = DISTRICTS[5], bd = Infinity;
    for (const d of DISTRICTS) {
      const dist = Math.hypot(x - d.x, z - d.z);
      if (dist < bd) { bd = dist; best = d; }
    }
    return best;
  }

  buildClouds(rnd) {
    const THREE = T();
    const mat = new THREE.MeshBasicMaterial({ color: 0x9a5f4a, transparent: true, opacity: 0.75, fog: false });
    for (let i = 0; i < 9; i++) {
      const grp = new THREE.Group();
      const n = 3 + Math.floor(rnd() * 3);
      for (let j = 0; j < n; j++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(16 + rnd() * 22, 10, 8), mat);
        s.scale.y = 0.32;
        s.position.set(j * 22 - n * 10, rnd() * 5, rnd() * 10 - 5);
        grp.add(s);
      }
      grp.position.set((rnd() - 0.5) * 1600, 190 + rnd() * 120, (rnd() - 0.5) * 1600);
      this.scene.add(grp);
      this.clouds.push({ grp, speed: 0.7 + rnd() * 0.8 });
    }
  }

  buildPier() {
    const THREE = T();
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x8a6b4a });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(60, 1.2, 10), deckMat);
    deck.position.set(418, 0.4, 40);
    deck.castShadow = true; deck.receiveShadow = true;
    this.scene.add(deck);
    for (let x = 392; x <= 444; x += 13) for (const dz of [-4, 4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 6), deckMat);
      post.position.set(x, -0.6, 40 + dz);
      this.scene.add(post);
    }
  }

  buildBoats(rnd) {
    const THREE = T();
    const hullCols = [0xc0392b, 0xe8e4da, 0x2471a3, 0xe9c46a];
    for (let i = 0; i < 7; i++) {
      const grp = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 8.5), new THREE.MeshLambertMaterial({ color: hullCols[i % 4] }));
      hull.position.y = 0.3; grp.add(hull);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 2.6), new THREE.MeshLambertMaterial({ color: 0xf2efe8 }));
      cabin.position.set(0, 1.3, -0.6); grp.add(cabin);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.5, 5), new THREE.MeshLambertMaterial({ color: 0x5a4632 }));
      mast.position.set(0, 3.4, 1.4); grp.add(mast);
      grp.position.set(430 + rnd() * 260, 0, -320 + rnd() * 640);
      grp.rotation.y = rnd() * Math.PI * 2;
      this.scene.add(grp);
    }
    // The freighter silhouette on the horizon, port-side.
    const ship = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 90), new THREE.MeshLambertMaterial({ color: 0x3a3f45 }));
    hull.position.y = 2; ship.add(hull);
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(11, 4.5, 12), new THREE.MeshLambertMaterial({ color: [0xc0392b, 0x2471a3, 0x229954, 0xca6f1e][i] }));
      c.position.set(0, 7.5, -30 + i * 17); ship.add(c);
    }
    ship.position.set(760, 0, 300);
    ship.rotation.y = 0.4;
    this.scene.add(ship);
  }

  buildBlocks(rnd) {
    const THREE = T();
    const bases = ["#8a5a48", "#a9714b", "#7d6a58", "#96504a", "#6e5a6e", "#b08968"];
    const textures = bases.map((b, i) => buildingTexture(b, 0.4, 700 + i));
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const inMarket = (x, z) => x > -285 && x < -128 && z > 62 && z < 178;
    const inPort = (x, z) => x > 108 && x < 300 && z > 168 && z < 310;
    const inHills = (x, z) => x < -150 && z < -190;
    for (const lx of roadLines()) for (const lz of roadLines()) {
      const cx = lx + WORLD.block / 2, cz = lz + WORLD.block / 2;
      if (cx > 340 || inMarket(cx, cz) || inPort(cx, cz) || inHills(cx, cz)) continue;
      const downtown = Math.hypot(cx, cz) < 190;
      const n = 1 + Math.floor(rnd() * (downtown ? 3 : 2));
      for (let i = 0; i < n; i++) {
        const w = 18 + rnd() * 22, d = 18 + rnd() * 22;
        const h = downtown ? 16 + rnd() * 30 : 7 + rnd() * 13;
        const x = cx + (rnd() - 0.5) * 34, z = cz + (rnd() - 0.5) * 34;
        if (isOnRoad(x, z)) continue;
        const mat = new THREE.MeshLambertMaterial({ map: textures[Math.floor(rnd() * textures.length)] });
        const b = new THREE.Mesh(geo, mat);
        b.scale.set(w, h, d);
        b.position.set(x, h / 2, z);
        b.castShadow = true; b.receiveShadow = true;
        this.scene.add(b);
        this.addCollider(x, z, w / 2, d / 2);
      }
    }
  }

  buildPalmsAndLamps(rnd) {
    const THREE = T();
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b4a });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x35b558, side: THREE.DoubleSide });
    const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x2a9d4a, side: THREE.DoubleSide });
    const palmAt = (x, z) => {
      const palm = new THREE.Group();
      const h = 7 + rnd() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.44, h, 6), trunkMat);
      trunk.position.y = h / 2; trunk.rotation.z = (rnd() - 0.5) * 0.16;
      trunk.castShadow = true; palm.add(trunk);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + rnd() * 0.4;
        const pivot = new THREE.Group();
        pivot.position.y = h; pivot.rotation.y = -a;
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.09, 0.62), i % 2 ? leafMat : leafMat2);
        leaf.position.x = 2.1; leaf.rotation.z = -0.52; pivot.add(leaf);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.4), i % 2 ? leafMat2 : leafMat);
        tip.position.set(4.4, -1.15, 0); tip.rotation.z = -1.05; pivot.add(tip);
        palm.add(pivot);
      }
      palm.position.set(x, 0, z);
      this.scene.add(palm);
      this.addCollider(x, z, 0.5, 0.5);
    };
    // The boulevard row stands ON THE SAND, east of the kerb.
    for (let z = -330; z <= 330; z += 24) palmAt(303 + (rnd() - 0.5) * 4, z);
    for (let i = 0; i < 60; i++) {
      const x = (rnd() - 0.5) * 620, z = (rnd() - 0.5) * 620;
      if (!isOnRoad(x, z) && x < WORLD.sandFrom - 6) palmAt(x, z);
    }
    // Streetlights: intersection poles + the boulevard spine.
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3c4148 });
    const headGeo = new THREE.SphereGeometry(0.42, 8, 8);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    const lampAt = (x, z, armDx, armDz) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 8.2, 6), poleMat);
      pole.position.set(x, 4.1, z); pole.castShadow = true; this.scene.add(pole);
      if (armDx || armDz) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(armDx) > 0 ? 2.8 : 0.18, 0.18, Math.abs(armDz) > 0 ? 2.8 : 0.18), poleMat);
        arm.position.set(x + armDx / 2, 8.1, z + armDz / 2); this.scene.add(arm);
      }
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(x + armDx, 7.95, z + armDz);
      this.scene.add(head);
      this.lamps.push(head);
    };
    for (const lx of roadLines()) for (const lz of roadLines()) lampAt(lx + 13, lz + 13, 0, 0);
    for (let a = -320; a <= 320; a += 40) {
      lampAt(271.5, a, 2.6, 0);
      lampAt(298.5, a + 20, -2.6, 0);
      lampAt(a, -13.5, 0, 2.6);
      lampAt(a + 20, 13.5, 0, -2.6);
    }
  }

  buildBeach(rnd) {
    const THREE = T();
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x6e5136 });
    const canopyCols = [0xe8641c, 0xe8e4da, 0x2a9db8, 0xe9c46a];
    for (let z = -300; z <= 320; z += 34) {
      if (rnd() < 0.25) continue;
      const x = 322 + rnd() * 44;
      const grp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 5), poleMat);
      pole.position.y = 1.3; grp.add(pole);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.3, 0.8, 8), new THREE.MeshLambertMaterial({ color: canopyCols[Math.floor(rnd() * 4)] }));
      canopy.position.y = 2.7; canopy.castShadow = true; grp.add(canopy);
      const towel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.8), new THREE.MeshLambertMaterial({ color: canopyCols[Math.floor(rnd() * 4)] }));
      towel.position.set(1.2, 0.03, 0.6); grp.add(towel);
      grp.position.set(x, 0, z);
      this.scene.add(grp);
    }
    const benchMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
    for (let z = -280; z <= 300; z += 58) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 2.4), benchMat);
      bench.position.set(300, 0.55, z);
      this.scene.add(bench);
      this.addCollider(300, z, 0.4, 1.3);
    }
  }

  buildMarket(rnd) {
    const THREE = T();
    // Packed-earth floor over the market blocks.
    const earthTex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#5e4c38"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2400; i++) {
        g.fillStyle = `rgba(${140 + Math.random() * 60},${110 + Math.random() * 40},70,0.25)`;
        g.fillRect(Math.random() * w, Math.random() * h, 2.5, 2.5);
      }
    });
    earthTex.wrapS = earthTex.wrapT = THREE.RepeatWrapping; earthTex.repeat.set(5, 4);
    const earth = new THREE.Mesh(new THREE.PlaneGeometry(150, 108), new THREE.MeshLambertMaterial({ map: earthTex }));
    earth.rotation.x = -Math.PI / 2;
    earth.position.set(-206, 0.06, 118);
    earth.receiveShadow = true;
    this.scene.add(earth);

    const postMat = new THREE.MeshLambertMaterial({ color: 0x4a3826 });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x86633f });
    const tarpCols = [0xc0392b, 0x2471a3, 0xe67e22, 0x229954, 0xe9c46a, 0x7d3c98];
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
    const bulbGeo = new THREE.SphereGeometry(0.13, 6, 6);
    const stall = (x, z, ry, tarp) => {
      const grp = new THREE.Group();
      for (const px of [-2.3, 2.3]) for (const pz of [-1.4, 1.4]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.1, 5), postMat);
        post.position.set(px, 1.55, pz); grp.add(post);
      }
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.1, 3.6), new THREE.MeshLambertMaterial({ color: tarp }));
      canopy.position.y = 3.15; canopy.rotation.z = 0.06; canopy.castShadow = true; grp.add(canopy);
      const counter = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.95, 1.1), woodMat);
      counter.position.set(0, 0.48, 1.15); counter.castShadow = true; grp.add(counter);
      for (let i = 0; i < 4; i++) {
        const goods = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.55),
          new THREE.MeshLambertMaterial({ color: [0xe67e22, 0xc0392b, 0x27ae60, 0xf1c40f][i % 4] }));
        goods.position.set(-1.8 + i * 1.2, 1.16, 1.15); grp.add(goods);
      }
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(0, 2.7, 0); grp.add(bulb);
      grp.position.set(x, 0, z); grp.rotation.y = ry;
      this.scene.add(grp);
      this.addCollider(x, z, 2.6, 1.8);
      return grp;
    };
    // Three aisles of stalls, backs to the lane lines.
    let stallN = 0;
    for (const az of [93, 110, 127]) {
      for (let x = -262; x <= -156; x += 11.5) {
        if (rnd() < 0.12) continue;
        stall(x, az - 3.4, 0, tarpCols[stallN % 6]);
        stall(x + 5.5, az + 3.4, Math.PI, tarpCols[(stallN + 3) % 6]);
        stallN++;
        if (stallN % 3 === 0) {
          const pl = new THREE.PointLight(0xffb36b, 14, 26, 1.6);
          pl.position.set(x, 3.4, az);
          this.scene.add(pl);
          this.nightLights.push(pl);
        }
      }
    }
    // String bulbs sagging across aisle two.
    const wireMat = new THREE.LineBasicMaterial({ color: 0x2b2b26 });
    const glowPts = [];
    for (let x = -262; x < -156; x += 14) {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        pts.push(new THREE.Vector3(x + 14 * t, 4.6 - Math.sin(t * Math.PI) * 0.7, 110));
      }
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
      for (let i = 2; i < 12; i += 2) {
        const b = new THREE.Mesh(bulbGeo, bulbMat);
        b.position.copy(pts[i]); b.position.y -= 0.22;
        this.scene.add(b);
        glowPts.push(b.position.x, b.position.y, b.position.z);
      }
    }
    // Goods piles at the crossroads corners + gerobak carts.
    const cluster = (x, z) => {
      for (let i = 0; i < 3; i++) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), woodMat);
        crate.position.set(x + (rnd() - 0.5) * 1.6, 0.55 + (i === 2 ? 1.1 : 0), z + (rnd() - 0.5) * 1.6);
        crate.rotation.y = rnd() * 0.8; crate.castShadow = true;
        this.scene.add(crate);
      }
      this.addCollider(x, z, 1.2, 1.2);
    };
    cluster(-219, 100); cluster(-196, 100); cluster(-219, 120); cluster(-196, 120);
    cluster(-250, 145); cluster(-170, 88);
    const gerobak = (x, z, ry, name, tarpCol) => {
      const grp = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.05, 1.15), woodMat);
      body.position.y = 0.95; body.castShadow = true; grp.add(body);
      const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 10);
      const tyreMat = new THREE.MeshLambertMaterial({ color: 0x181a1c });
      for (const wz of [-0.66, 0.66]) {
        const w = new THREE.Mesh(wheelGeo, tyreMat);
        w.rotation.x = Math.PI / 2; w.position.set(0.2, 0.42, wz); grp.add(w);
      }
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.09, 1.6), new THREE.MeshLambertMaterial({ color: tarpCol }));
      top.position.y = 2.6; top.castShadow = true; grp.add(top);
      for (const px of [-0.9, 0.9]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 5), woodMat);
        pole.position.set(px, 1.9, 0); grp.add(pole);
      }
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.58),
        new THREE.MeshBasicMaterial({ map: signTexture(name, "", "#20242a", "#ffd98a"), side: THREE.DoubleSide }));
      face.position.set(0, 1.62, 0.59); grp.add(face);
      grp.position.set(x, 0, z); grp.rotation.y = ry;
      this.scene.add(grp);
      this.addCollider(x, z, 1.2, 1.0);
    };
    gerobak(-196, 152, 0.5, "SATE SENJA", 0xe67e22);
    gerobak(-146, 110, -Math.PI / 2, "ES CENDOL", 0x2f6db3);
    // The LAUT SEGAR stall: the market's anchor tenant.
    const laut = stall(-231.5, 99.2, 0, 0x2a9db8);
    const lautSign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 0.85),
      new THREE.MeshBasicMaterial({ map: signTexture("LAUT SEGAR", "", "#2a1f3d", "#ffd98a"), side: THREE.DoubleSide }));
    lautSign.position.set(-231.5, 2.6, 102.9);
    this.scene.add(lautSign);
    return laut;
  }

  buildPort(rnd) {
    const THREE = T();
    const contCols = [0xc0392b, 0x2471a3, 0x229954, 0xca6f1e, 0x707b7c, 0x7d3c98, 0x148f77, 0xb03a5b];
    const mkContainer = (x, z, ry, colHex, label, number, level) => {
      const tex = containerTexture(colHex, label, number);
      const mats = [
        new THREE.MeshLambertMaterial({ color: colHex }), new THREE.MeshLambertMaterial({ color: colHex }),
        new THREE.MeshLambertMaterial({ color: colHex }), new THREE.MeshLambertMaterial({ color: colHex }),
        new THREE.MeshLambertMaterial({ map: tex }), new THREE.MeshLambertMaterial({ color: colHex }),
      ];
      const c = new THREE.Mesh(new THREE.BoxGeometry(12, 4.5, 5), mats);
      c.position.set(x, 2.25 + level * 4.5, z);
      c.rotation.y = ry;
      c.castShadow = true; c.receiveShadow = true;
      this.scene.add(c);
      if (level === 0) this.addCollider(x, z, 6.2, 2.7);
      return c;
    };
    // Yard rows south of the shore road.
    let n = 0;
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 5; i++) {
        const x = 138 + i * 30 + (rnd() - 0.5) * 5;
        const z = 222 + row * 22;
        if (Math.hypot(x - 222, z - 212) < 10) continue; // the hero slot stays clear
        const col = contCols[n % 8];
        mkContainer(x, z, (rnd() - 0.5) * 0.1, col, n % 3 === 0 ? "SENJA KARGO" : "", n % 3 === 0 ? "SBKU " + (240000 + n * 137) : "", 0);
        if (n % 3 === 0) mkContainer(x, z, (rnd() - 0.5) * 0.1, contCols[(n + 3) % 8], "", "", 1);
        n++;
      }
    }
    // The hero container behind the duel: red, lettered, square to the road.
    mkContainer(228, 214, 0.02, 0xc0392b, "SENJA KARGO", "SBKU 241553", 0);
    mkContainer(228, 214, 0.02, 0x2471a3, "", "", 1);
    // The apron pair the owner marked for the title frame.
    mkContainer(264, 207.5, -0.06, 0x229954, "SENJA KARGO", "SBKU 241207", 0);
    mkContainer(264, 214.5, -0.06, 0x2471a3, "SENJA KARGO", "SBKU 241214", 0);
    // Cranes.
    for (const [x, z] of [[165, 235], [248, 268]]) {
      const crane = new THREE.Group();
      const legMat = new THREE.MeshLambertMaterial({ color: 0xe67e22 });
      for (const [lx, lz] of [[-7, -4], [7, -4], [-7, 4], [7, 4]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 26, 1.4), legMat);
        leg.position.set(lx, 13, lz); leg.castShadow = true; crane.add(leg);
      }
      const arm = new THREE.Mesh(new THREE.BoxGeometry(30, 1.8, 2), legMat);
      arm.position.set(6, 26, 0); crane.add(arm);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
      cab.position.set(12, 23.5, 0); crane.add(cab);
      crane.position.set(x, 0, z);
      this.scene.add(crane);
      this.addCollider(x, z, 8, 5);
    }
    // Barrels + loose crates through the rows.
    const barrelCols = [0xc0392b, 0x2471a3, 0xe9c46a, 0x707b7c];
    for (let i = 0; i < 14; i++) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.7, 10),
        new THREE.MeshLambertMaterial({ color: barrelCols[i % 4] }));
      barrel.position.set(135 + rnd() * 135, 0.85, 200 + rnd() * 95);
      barrel.castShadow = true;
      this.scene.add(barrel);
    }
    const crateMat = new THREE.MeshLambertMaterial({ color: 0xa97c50 });
    for (let i = 0; i < 10; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), crateMat);
      crate.position.set(140 + rnd() * 130, 1.1, 205 + rnd() * 90);
      crate.rotation.y = rnd() * 0.8; crate.castShadow = true;
      this.scene.add(crate);
    }
    for (const [lx, lz] of [[180, 215], [235, 255]]) {
      const pl = new THREE.PointLight(0xaee6ff, 18, 60, 1.5);
      pl.position.set(lx, 12, lz);
      this.scene.add(pl);
      this.nightLights.push(pl);
    }
  }

  buildSigns() {
    const THREE = T();
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3c4148 });
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x22262b });
    const billboard = (x, z, ry, title, sub, bg, fg) => {
      const grp = new THREE.Group();
      for (const px of [-3.6, 3.6]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 11, 6), poleMat);
        pole.position.set(px, 5.5, 0); pole.castShadow = true; grp.add(pole);
      }
      const panel = new THREE.Mesh(new THREE.BoxGeometry(11.4, 4.4, 0.35), frameMat);
      panel.position.y = 12.2; panel.castShadow = true; grp.add(panel);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 3.4),
        new THREE.MeshBasicMaterial({ map: signTexture(title, sub, bg, fg) }));
      face.position.set(0, 12.2, 0.2); grp.add(face);
      grp.position.set(x, 0, z); grp.rotation.y = ry;
      this.scene.add(grp);
      this.addCollider(x, z, 4, 1);
    };
    billboard(266, -150, Math.PI / 2 + 0.3, "HOTEL KARANG", "Pantai Senja — kamar mulai Rp 250rb", "#123c5e", "#ffd76a");
    billboard(58, -92, 0.45, "BENGKEL BIMA", "Tune-up — ganti oli — buka 24 jam", "#5e1f12", "#ffe9a8");
    billboard(118, 166, Math.PI + 0.35, "OMBAK FM 98.4", "Suara Senja Bay, tiap hari", "#0f4c4c", "#aef2e2");
    const smallSign = (x, z, ry, title, sub, bg, fg) => {
      const grp = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.4, 6), poleMat);
      post.position.y = 1.7; grp.add(post);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.9, 0.18), frameMat);
      panel.position.y = 3.9; panel.castShadow = true; grp.add(panel);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 1.66),
        new THREE.MeshBasicMaterial({ map: signTexture(title, sub, bg, fg) }));
      face.position.set(0, 3.9, 0.11); grp.add(face);
      grp.position.set(x, 0, z); grp.rotation.y = ry;
      this.scene.add(grp);
      this.addCollider(x, z, 1.4, 0.6);
    };
    smallSign(-178, 76, -2.3, "PASAR MALAM", "Buka 17.00 — 24.00", "#6e1423", "#ffd98a");
    smallSign(264, 100, 0.15, "KOPI SENJA", "Es kopi — pisang goreng", "#3b2412", "#ffe9a8");
    smallSign(150, 176, Math.PI, "PELABUHAN SENJA", "Feri — kargo — gudang 3", "#17365d", "#aee6ff");
  }

  buildHills() {
    const THREE = T();
    const chalk = new THREE.MeshLambertMaterial({ color: 0xd8cfb4 });
    const scrub = new THREE.MeshLambertMaterial({ color: 0x8b9a68 });
    const mounds = [[-235, -265, 95, 20], [-300, -215, 70, 15], [-170, -300, 64, 13], [-290, -300, 80, 17]];
    for (const [x, z, r, h] of mounds) {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), chalk);
      mound.scale.y = h / r;
      mound.position.set(x, 0, z);
      mound.receiveShadow = true;
      this.scene.add(mound);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 14, 10), scrub);
      cap.scale.y = (h * 0.8) / (r * 0.55);
      cap.position.set(x + 8, h * 0.35, z + 5);
      this.scene.add(cap);
    }
  }

  update(dt) {
    for (const c of this.clouds) {
      c.grp.position.x += c.speed * dt;
      if (c.grp.position.x > 950) c.grp.position.x = -950;
    }
  }
}
