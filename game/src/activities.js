// activities.js — the bay's side hustles, away from the story jobs:
// street races against the clock and the twelve hidden packages. It owns
// the race state machine, the gate/checkpoint pillars and the package
// crates, and talks to the rest of the game only through hooks, the same
// way missions.js does.

import { RACES, PACKAGE_SPOTS, PACKAGE_REWARD, PACKAGE_BONUS } from "./config.js";
import { buildMarkerMesh, buildCrateMesh } from "./actors.js";

const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

export class Activities {
  constructor(scene, hooks) {
    this.hooks = hooks;   // { toast, banner, pickup, cash, reward(money, respect) }
    this.time = 0;
    // Race state: null when idle, else { def, idx, time, footTime }.
    this.race = null;
    this.best = {};       // race name -> best seconds
    // One green gate pillar per course, standing on its start line.
    this.gates = RACES.map((def) => {
      const mesh = buildMarkerMesh(0x2ed573);
      mesh.position.set(def.start.x, 0, def.start.z);
      scene.add(mesh);
      return { def, mesh };
    });
    // One gold pillar that moves from checkpoint to checkpoint.
    this.cpMarker = buildMarkerMesh(0xffe14d);
    this.cpMarker.visible = false;
    scene.add(this.cpMarker);
    // The hidden packages: gold crates with a cyan beacon, so they read
    // as cousins of the mission crates but clearly their own hunt.
    this.packages = PACKAGE_SPOTS.map(([x, z]) => {
      const mesh = buildCrateMesh();
      mesh.scale.setScalar(0.85);
      mesh.position.set(x, 0, z);
      mesh.userData.beacon.material.color.setHex(0x3be0c8);
      scene.add(mesh);
      return { mesh, x, z, taken: false };
    });
    this.found = 0;
  }

  // ---------- races ----------
  beginRace(i, silent) {
    if (this.race || !RACES[i]) return;
    const def = RACES[i];
    this.race = { def, idx: 0, time: 0, footTime: 0 };
    this.showCheckpoint();
    for (const g of this.gates) g.mesh.visible = false;
    if (!silent) {
      this.hooks.toast("🏁 " + def.name, `Chase the gold pillars — par ${def.par} s, pays Rp${def.reward.toLocaleString("en-US")}`);
      this.hooks.pickup();
    }
  }

  showCheckpoint() {
    const r = this.race;
    const cp = r.def.checkpoints[r.idx];
    this.cpMarker.position.set(cp.x, 0, cp.z);
    this.cpMarker.visible = true;
    // The finish pillar burns green; the rest stay gold.
    const last = r.idx === r.def.checkpoints.length - 1;
    this.cpMarker.userData.beam.material.color.setHex(last ? 0x2ed573 : 0xffe14d);
    this.cpMarker.userData.ring.material.color.setHex(last ? 0x2ed573 : 0xffe14d);
  }

  finishRace() {
    const r = this.race;
    const t = r.time;
    const prev = this.best[r.def.name];
    const isBest = prev === undefined || t < prev;
    if (isBest) this.best[r.def.name] = t;
    this.hooks.reward(r.def.reward, r.def.respect);
    this.hooks.cash();
    this.hooks.banner("🏁 RACE COMPLETE",
      `${r.def.name} — ${t.toFixed(1)} s${isBest ? " • NEW BEST!" : ` • best ${prev.toFixed(1)} s`} • +Rp${r.def.reward.toLocaleString("en-US")}`);
    this.endRace();
  }

  endRace() {
    this.race = null;
    this.cpMarker.visible = false;
    for (const g of this.gates) g.mesh.visible = true;
  }

  // ---------- packages ----------
  collectPackage(p) {
    p.taken = true;
    p.mesh.visible = false;
    this.found++;
    this.hooks.pickup();
    if (this.found >= this.packages.length) {
      this.hooks.reward(PACKAGE_REWARD + PACKAGE_BONUS, 150);
      this.hooks.cash();
      this.hooks.banner("📦 ALL PACKAGES FOUND", `The whole set — +Rp${(PACKAGE_REWARD + PACKAGE_BONUS).toLocaleString("en-US")} with the completion bonus`);
    } else {
      this.hooks.reward(PACKAGE_REWARD, 10);
      this.hooks.toast("📦 HIDDEN PACKAGE", `${this.found}/${this.packages.length} — +Rp${PACKAGE_REWARD.toLocaleString("en-US")}`);
    }
  }

  setFound(n) {
    // Staged scenes and save files mark the first n packages as taken.
    this.packages.forEach((p, i) => { p.taken = i < n; p.mesh.visible = !p.taken; });
    this.found = Math.min(n, this.packages.length);
  }

  takenIndices() { return this.packages.map((p, i) => (p.taken ? i : -1)).filter((i) => i >= 0); }

  restore(data) {
    if (!data) return;
    if (data.best) this.best = data.best;
    if (Array.isArray(data.taken)) {
      for (const p of this.packages) { p.taken = false; p.mesh.visible = true; }
      this.found = 0;
      for (const i of data.taken) {
        const p = this.packages[i];
        if (p && !p.taken) { p.taken = true; p.mesh.visible = false; this.found++; }
      }
    }
  }

  saveData() { return { best: this.best, taken: this.takenIndices() }; }

  // ---------- per-frame ----------
  update(dt, ctx) {
    this.time += dt;
    // Gates breathe and spin while they wait for a driver.
    for (const g of this.gates) {
      g.mesh.userData.ring.rotation.z += dt;
      g.mesh.visible = !this.race;
    }
    if (this.race) {
      const r = this.race;
      r.time += dt;
      this.cpMarker.userData.ring.rotation.z += dt * 1.6;
      const cp = r.def.checkpoints[r.idx];
      if (ctx.inCar) {
        r.footTime = 0;
        if (dist(ctx.x, ctx.z, cp.x, cp.z) < 9.5) {
          r.idx++;
          this.hooks.pickup();
          if (r.idx >= r.def.checkpoints.length) this.finishRace();
          else {
            this.showCheckpoint();
            this.hooks.toast(`CHECKPOINT ${r.idx}/${r.def.checkpoints.length}`, `${r.def.name} — ${r.time.toFixed(1)} s`);
          }
        }
      } else {
        // Out of the car the clock keeps running — too long and the
        // course is abandoned, the pillars go home.
        r.footTime += dt;
        if (r.footTime > 4) {
          this.hooks.toast("RACE ABANDONED", r.def.name + " — stay in the car to run a course");
          this.endRace();
        }
      }
    } else if (ctx.inCar) {
      for (let i = 0; i < this.gates.length; i++) {
        const g = this.gates[i];
        if (dist(ctx.x, ctx.z, g.def.start.x, g.def.start.z) < 8) { this.beginRace(i, false); break; }
      }
    }
    // Packages bob and turn, and go home with whoever drives through.
    for (const p of this.packages) {
      if (p.taken) continue;
      p.mesh.rotation.y += dt * 0.9;
      p.mesh.userData.beacon.position.y = 2.3 + Math.sin(this.time * 3 + p.x) * 0.3;
      if (dist(ctx.x, ctx.z, p.x, p.z) < 3.1) this.collectPackage(p);
    }
  }

  hudState() {
    let line1;
    if (this.race) {
      const r = this.race;
      const best = this.best[r.def.name];
      line1 = `🏁 ${r.def.name} • CP ${r.idx}/${r.def.checkpoints.length} • ${r.time.toFixed(1)}s${best ? ` • BEST ${best.toFixed(1)}` : ""}`;
    } else {
      line1 = "🏁 STREET RACES — 3 COURSES";
    }
    return { line1, line2: `📦 PACKAGES ${this.found}/${this.packages.length}` };
  }
}
