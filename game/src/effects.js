// effects.js — everything that flies, flashes or falls when a gun
// speaks. The bay's rule, set by its owner: NO laser beams. A bullet
// is a SHORT bright segment — a warm core with a trail that dies
// behind it — that TRAVELS from muzzle to target at speed, exists
// for a blink, and is gone. Beside it: a small star of light seated
// exactly on the barrel tip, a brass casing spinning away from the
// receiver, and a burst of sparks where the round lands.
//
// All of it is pooled. Nothing allocates per shot; the freeze the
// screenshot casts use parks every system mid-flight.

const T = () => window.THREE;

function streakMaterial(tint) {
  // A gradient along the segment: full burn at the head (the +Z end
  // after lookAt aims it), dying to nothing at the tail. Vertex
  // colours carry the fade so one material serves the whole pool.
  const mat = new (T()).MeshBasicMaterial({
    color: tint, transparent: true, opacity: 0.95,
    blending: T().AdditiveBlending, depthWrite: false, vertexColors: true,
  });
  return mat;
}

function streakGeometry() {
  // A unit box stretched at spawn time; colour baked per-vertex so
  // the head (z=+0.5) burns and the tail (z=-0.5) is already ash.
  const geo = new (T()).BoxGeometry(1, 1, 1);
  const pos = geo.attributes.position;
  const colours = [];
  const head = new (T()).Color(1, 1, 1), tail = new (T()).Color(0.05, 0.02, 0.01);
  for (let i = 0; i < pos.count; i++) {
    const c = pos.getZ(i) > 0 ? head : tail;
    colours.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new (T()).Float32BufferAttribute(colours, 3));
  return geo;
}

function starTexture() {
  // The muzzle star: a hard white core with four tapering spikes,
  // drawn once on a canvas and shared by every flash in the game.
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, "rgba(255,255,244,1)");
  grad.addColorStop(0.25, "rgba(255,226,160,0.85)");
  grad.addColorStop(1, "rgba(255,180,80,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "rgba(255,252,238,0.95)";
  const spike = (w, h, x, y) => g.fillRect(x, y, w, h);
  spike(5, 120, 61.5, 4); spike(120, 5, 4, 61.5);
  return new (T()).CanvasTexture(c);
}

export class Effects {
  constructor(scene) {
    const THREE = T();
    this.scene = scene;
    this.frozen = false;
    this.time = 0;

    // --- bullet streaks (28 pooled segments, two shells each) ---
    this.streakGeo = streakGeometry();
    this.streaks = [];
    for (let i = 0; i < 28; i++) {
      const group = new THREE.Group();
      const core = new THREE.Mesh(this.streakGeo, streakMaterial(0xffffff));
      core.scale.set(0.045, 0.045, 1);
      const halo = new THREE.Mesh(this.streakGeo, streakMaterial(0xffffff));
      halo.scale.set(0.10, 0.10, 1);
      halo.material.opacity = 0.35;
      group.add(halo); group.add(core);
      group.visible = false;
      scene.add(group);
      this.streaks.push({
        group, core, halo, active: false,
        from: new THREE.Vector3(), to: new THREE.Vector3(),
        dist: 0, head: 0, speed: 120, len: 2.4, life: 0,
      });
    }
    this.lastStreak = null; // remembered for the freeze revival

    // --- muzzle flash: one star sprite + one point light, shared ---
    this.flashTex = starTexture();
    this.flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.flashTex, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.flashSprite.scale.set(0.5, 0.5, 1);
    scene.add(this.flashSprite);
    this.flashLight = new THREE.PointLight(0xffc37a, 0, 13, 1.8);
    scene.add(this.flashLight);
    this.flashPos = this.flashLight.position;
    this.flashI = 0;
    this.flashScale = 0.5;

    // --- spent casings (48 pooled brass boxes) ---
    this.casingGeo = new THREE.BoxGeometry(0.055, 0.028, 0.028);
    this.casings = [];
    for (let i = 0; i < 48; i++) {
      const mesh = new THREE.Mesh(this.casingGeo, new THREE.MeshBasicMaterial({ color: 0xd8a83c, transparent: true }));
      mesh.visible = false;
      scene.add(mesh);
      this.casings.push({ mesh, active: false, vel: new THREE.Vector3(), spin: new THREE.Vector3(), age: 0, landed: false });
    }
    this.onCasingLand = null; // main.js wires the tick sound here

    // --- impact bursts + dust (24 pooled point clouds) ---
    this.bursts = [];
    const burstGeo = new THREE.BufferGeometry();
    burstGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(14 * 3), 3));
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.PointsMaterial({
        color: 0xffd9a0, size: 0.16, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      });
      const points = new THREE.Points(burstGeo.clone(), mat);
      points.visible = false;
      scene.add(points);
      this.bursts.push({ points, vel: [], age: 0, life: 0.4, active: false, dust: false });
    }

    // --- wreck flames (8 pooled fire sprites + smoke) ---
    this.flames = [];
    for (let i = 0; i < 8; i++) {
      const group = new THREE.Group();
      const fire = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.flashTex, color: 0xff7a26, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      fire.scale.set(1.6, 2.2, 1);
      const smoke = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.flashTex, color: 0x2b2b30, transparent: true, opacity: 0.4, depthWrite: false,
      }));
      smoke.scale.set(2.6, 2.6, 1); smoke.position.y = 2.2;
      group.add(fire); group.add(smoke);
      group.visible = false;
      scene.add(group);
      this.flames.push({ group, fire, smoke, at: null, seed: Math.random() * 10 });
    }
  }

  setFrozen(on) {
    // Freezing mid-flight is the screenshot casts' held moment: a
    // streak fired in the last ten seconds is re-seated at 45% of
    // its line so the frozen frame still shows a bullet travelling.
    if (on && !this.frozen && this.lastStreak) {
      const age = this.time - this.lastStreak.at;
      const anyActive = this.streaks.some((s) => s.active);
      if (age < 10 && !anyActive) {
        const s = this.streaks[0];
        const { from, to, tint, speed } = this.lastStreak;
        this.armStreak(s, from, to, tint, speed);
        s.head = s.dist * 0.45;
      }
    }
    this.frozen = on;
  }

  armStreak(s, from, to, tint, speed) {
    s.from.copy(from); s.to.copy(to);
    s.dist = from.distanceTo(to);
    s.head = 0; s.speed = speed; s.life = 0; s.active = true;
    s.core.material.color.setHex(tint);
    s.halo.material.color.setHex(tint);
    s.group.visible = true;
    this.placeStreak(s);
  }

  placeStreak(s) {
    // Only `len` metres around the bullet exist at any instant: the
    // segment grows out of the muzzle, flies, and shrinks into the
    // target — at no moment does a line join gun to victim.
    const THREE = T();
    const tail = Math.max(0, s.head - s.len);
    const head = Math.min(s.dist, s.head);
    const span = Math.max(0.001, head - tail);
    const mid = new THREE.Vector3().lerpVectors(s.from, s.to, (tail + head) / 2 / s.dist);
    s.group.position.copy(mid);
    s.group.lookAt(s.to);
    s.core.scale.z = span; s.halo.scale.z = span;
  }

  fireStreak(from, to, tint, speed) {
    const s = this.streaks.find((x) => !x.active) || this.streaks[0];
    this.armStreak(s, from, to, tint || 0xffdf9e, speed || 120);
    this.lastStreak = { from: from.clone(), to: to.clone(), tint: tint || 0xffdf9e, speed: speed || 120, at: this.time };
  }

  flash(at, scale) {
    this.flashSprite.position.copy(at);
    this.flashLight.position.copy(at);
    this.flashScale = scale || 0.5;
    this.flashSprite.scale.set(this.flashScale, this.flashScale, 1);
    this.flashSprite.material.opacity = 1;
    this.flashI = 26;
    this.flashLight.intensity = 26;
    this.flashSprite.material.rotation = Math.random() * Math.PI;
  }

  ejectCasing(at, heading) {
    const c = this.casings.find((x) => !x.active) || this.casings[0];
    const THREE = T();
    c.mesh.position.copy(at);
    c.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    const right = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
    c.vel.copy(right).multiplyScalar(1.1 + Math.random() * 0.5);
    c.vel.y = 2.0 + Math.random() * 0.7;
    c.vel.x += -Math.sin(heading) * 0.3; c.vel.z += -Math.cos(heading) * 0.3;
    c.spin.set((Math.random() - 0.5) * 44, (Math.random() - 0.5) * 44, (Math.random() - 0.5) * 44);
    c.age = 0; c.landed = false; c.active = true;
    c.mesh.visible = true;
    c.mesh.material.opacity = 1;
  }

  burst(at, dust) {
    const b = this.bursts.find((x) => !x.active) || this.bursts[0];
    const THREE = T();
    const pos = b.points.geometry.attributes.position;
    b.vel = [];
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, at.x, at.y, at.z);
      const a = Math.random() * Math.PI * 2, up = Math.random() * 2.4 + 0.6, out = Math.random() * 1.8 + 0.4;
      b.vel.push(new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out));
    }
    pos.needsUpdate = true;
    b.points.material.color.setHex(dust ? 0xcbb694 : 0xffd9a0);
    b.dust = !!dust;
    b.points.material.size = dust ? 0.3 : 0.16;
    b.age = 0; b.life = dust ? 0.7 : 0.4; b.active = true;
    b.points.visible = true;
  }

  setFlame(index, at) {
    const f = this.flames[index % this.flames.length];
    if (!f) return;
    f.at = at ? at.clone() : null;
    f.group.visible = !!at;
    if (at) f.group.position.copy(at);
  }

  update(dt) {
    if (this.frozen) return; // the held moment: nothing flies, falls or fades
    this.time += dt;
    const THREE = T();

    for (const s of this.streaks) {
      if (!s.active) continue;
      s.head += s.speed * dt;
      s.life += dt;
      if (s.head - s.len > s.dist || s.life > 1.2) { s.active = false; s.group.visible = false; continue; }
      this.placeStreak(s);
    }

    if (this.flashI > 0) {
      this.flashI = Math.max(0, this.flashI - dt * 340);
      this.flashLight.intensity = this.flashI;
      this.flashSprite.material.opacity = Math.min(1, this.flashI / 20);
      const sc = this.flashScale * (0.7 + 0.3 * (this.flashI / 26));
      this.flashSprite.scale.set(sc, sc, 1);
    }

    for (const c of this.casings) {
      if (!c.active) continue;
      c.age += dt;
      if (c.age > 1.5) { c.active = false; c.mesh.visible = false; continue; }
      if (!c.landed) {
        c.vel.y -= 7.5 * dt;
        c.mesh.position.addScaledVector(c.vel, dt);
        c.mesh.rotation.x += c.spin.x * dt;
        c.mesh.rotation.y += c.spin.y * dt;
        c.mesh.rotation.z += c.spin.z * dt;
        if (c.mesh.position.y <= 0.03) {
          c.mesh.position.y = 0.03;
          c.landed = true;
          if (this.onCasingLand) this.onCasingLand();
        }
      }
      if (c.age > 1.05) c.mesh.material.opacity = Math.max(0, 1 - (c.age - 1.05) / 0.45);
    }

    for (const b of this.bursts) {
      if (!b.active) continue;
      b.age += dt;
      if (b.age >= b.life) { b.active = false; b.points.visible = false; continue; }
      const pos = b.points.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const v = b.vel[i];
        v.y -= (b.dust ? 0.6 : 6.5) * dt;
        pos.setXYZ(i, pos.getX(i) + v.x * dt, Math.max(0.03, pos.getY(i) + v.y * dt), pos.getZ(i) + v.z * dt);
      }
      pos.needsUpdate = true;
      b.points.material.opacity = (b.dust ? 0.4 : 0.95) * (1 - b.age / b.life);
    }

    for (const f of this.flames) {
      if (!f.at) continue;
      const pulse = 0.85 + Math.sin(this.time * 11 + f.seed) * 0.18 + Math.sin(this.time * 23 + f.seed * 2) * 0.08;
      f.fire.scale.set(1.6 * pulse, 2.3 * pulse, 1);
      f.fire.material.opacity = 0.65 + 0.25 * pulse;
      f.smoke.position.y = 2.2 + Math.sin(this.time * 0.9 + f.seed) * 0.3;
      f.smoke.material.opacity = 0.32 + 0.1 * Math.sin(this.time * 1.7 + f.seed);
    }
  }
}
