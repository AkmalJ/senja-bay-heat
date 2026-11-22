// missions.js — the eight-job story campaign as a stage machine. It owns
// which job and stage are live, spawns each stage's actors through hooks
// into the world, and decides when a stage is done.

import { MISSIONS } from "./config.js";

export class MissionRunner {
  constructor(hooks) {
    this.hooks = hooks;
    this.index = 0;
    this.stage = 0;
    this.active = false;
    this.done = false;
    this.primed = false;      // escape stages: the heat has been raised
    this.stageTime = 0;
  }

  get mission() { return MISSIONS[this.index]; }
  get stageDef() { return this.mission ? this.mission.stages[this.stage] : null; }

  start(index) {
    this.index = index;
    this.stage = 0;
    this.active = true;
    this.done = false;
    const m = this.mission;
    this.hooks.dialogue(m.giver, m.giverRole, m.intro);
    this.beginStage();
  }

  beginStage() {
    this.primed = false;
    this.stageTime = 0;
    const sd = this.stageDef;
    if (!sd) return;
    if (sd.kind === "chase") this.hooks.spawnTargetCar(sd);
    if (sd.kind === "clear") this.hooks.spawnHostiles(sd.count, sd.x, sd.z);
    if (sd.kind === "collect") this.hooks.spawnCrates(sd.count, sd.x, sd.z);
    if (sd.kind === "escape") this.hooks.raiseHeat(sd.want);
  }

  targetPoint() {
    const sd = this.stageDef;
    if (!sd) return null;
    if (sd.kind === "chase") return this.hooks.targetCarPos();
    if (sd.kind === "clear") return { x: sd.x, z: sd.z };
    if (sd.kind === "collect") return this.hooks.nearestCratePos() || { x: sd.x, z: sd.z };
    if (sd.kind === "escape") return null;
    return { x: sd.x, z: sd.z };
  }

  hudState(focus) {
    const m = this.mission, sd = this.stageDef;
    if (!this.active || !m || !sd) return null;
    const tp = this.targetPoint();
    let objective = sd.label;
    if (sd.kind === "clear") objective = `${sd.label} — ${this.hooks.hostilesAlive()} left`;
    if (sd.kind === "collect") objective = `${sd.label} — ${this.hooks.cratesCollected()}/${sd.count}`;
    if (sd.kind === "escape") objective = this.primed ? "Lose the police — break line of sight and stay hidden" : `Draw the heat first — reach ${sd.want} stars, then vanish`;
    if (sd.kind === "chase") objective = "Wreck the target car — ram it or shoot it out";
    const nextSd = m.stages[this.stage + 1];
    return {
      index: this.index, total: MISSIONS.length, giver: m.giver, title: m.title,
      stage: this.stage, stageCount: m.stages.length, objective,
      next: nextSd ? nextSd.label : "Final stage — finish the job",
      distance: tp && focus ? Math.hypot(tp.x - focus.x, tp.z - focus.z) : null,
    };
  }

  update(dt, ctx) {
    if (!this.active) return;
    this.stageTime += dt;
    const sd = this.stageDef;
    if (!sd) return;
    const dist = (x, z) => Math.hypot(ctx.x - x, ctx.z - z);
    let complete = false;
    switch (sd.kind) {
      case "goto": complete = dist(sd.x, sd.z) < sd.r; break;
      case "deliver": complete = ctx.inCar && dist(sd.x, sd.z) < sd.r; break;
      case "chase": complete = ctx.targetWrecked; break;
      case "clear": complete = this.hooks.hostilesAlive() === 0 && this.stageTime > 1; break;
      case "collect": complete = this.hooks.cratesCollected() >= sd.count; break;
      case "escape":
        if (ctx.wanted >= sd.want) this.primed = true;
        complete = this.primed && ctx.wanted === 0;
        break;
    }
    if (complete) this.advance(ctx);
  }

  advance(ctx) {
    const m = this.mission;
    this.hooks.clearSpawns();
    this.stage++;
    if (this.stage >= m.stages.length) {
      this.active = false;
      this.done = true;
      this.hooks.missionComplete(m, this.index);
    } else {
      this.hooks.stageComplete(this.stage, m.stages.length, this.stageDef.label);
      this.beginStage();
    }
  }

  // After the final job the bay stays open: free roam with the story told.
  nextIndex() { return Math.min(this.index + 1, MISSIONS.length - 1); }
  allDone() { return this.index >= MISSIONS.length - 1 && this.done; }
}
