// effects.js — a small pooled particle system for the soft effects the
// hard-spark bursts in main.js do not cover: tire smoke when the player's
// car breaks traction, and dust puffs when metal meets the city too hard.
// One fixed pool of boxes is recycled forever, so the frame loop never
// allocates; each particle fades and shrinks as it dies.

import * as THREE from "three";

const POOL_SIZE = 160;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.cursor = 0;
    const geo = new THREE.BoxGeometry(0.34, 0.34, 0.34);
    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({ mesh, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, grow: 0, drag: 0, fade: 0.5 });
    }
  }

  spawn(x, y, z, opts = {}) {
    const n = opts.n ?? 1;
    for (let i = 0; i < n; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % POOL_SIZE;
      const spread = opts.spread ?? 1.2;
      p.mesh.visible = true;
      p.mesh.position.set(x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5);
      p.mesh.material.color.setHex(opts.color ?? 0xdddddd);
      p.mesh.material.opacity = opts.opacity ?? 0.5;
      const size = (opts.size ?? 1) * (0.75 + Math.random() * 0.5);
      p.mesh.scale.setScalar(size);
      p.vx = (Math.random() - 0.5) * spread;
      p.vz = (Math.random() - 0.5) * spread;
      p.vy = (opts.up ?? 1) * (0.6 + Math.random() * 0.7);
      p.maxLife = p.life = (opts.life ?? 0.8) * (0.7 + Math.random() * 0.6);
      p.grow = opts.grow ?? 1.6;
      p.drag = opts.drag ?? 1.4;
      p.fade = opts.opacity ?? 0.5;
    }
  }

  // Pale smoke boiling off a rear tire that has lost grip.
  tireSmoke(x, y, z) {
    this.spawn(x, y, z, { n: 2, color: 0xe8e6df, opacity: 0.42, size: 0.9, spread: 0.9, up: 1.5, life: 0.85, grow: 2.6, drag: 1.8 });
  }

  // A tan dust puff where a car clipped the city or another car.
  dustPuff(x, y, z, hard = false) {
    this.spawn(x, y, z, { n: hard ? 7 : 4, color: 0xcbb59a, opacity: 0.5, size: 1.15, spread: 2.4, up: 1.9, life: 0.7, grow: 2.2, drag: 1.6 });
  }

  update(dt) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; p.mesh.material.opacity = 0; continue; }
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vz *= d;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const s = p.mesh.scale.x + p.grow * dt;
      p.mesh.scale.setScalar(s);
      p.mesh.material.opacity = p.fade * (p.life / p.maxLife);
    }
  }
}
