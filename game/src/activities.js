// activities.js — the bay's side work: three street races run
// through green gates, and twelve hidden packages glowing in the
// corners nobody watches. Race state and package state live in the
// save (state.act.best / state.act.taken); this module owns the
// courses, the gates and the stopwatch.

export const RACES = [
  {
    id: "strand", name: "STRAND SPRINT", par: 50,
    gate: { x: 285, z: 150, heading: Math.PI },
    route: [[285, 60], [285, -40], [285, -140], [282, -215]],
  },
  {
    id: "downtown", name: "DOWNTOWN LOOP", par: 50,
    gate: { x: 0, z: 95, heading: Math.PI / 2 },
    route: [[95, 95], [95, 0], [95, -95], [0, -95], [-95, -95], [-95, 0], [-40, 95]],
  },
  {
    id: "port", name: "PORT RUN", par: 50,
    gate: { x: 190, z: 190, heading: Math.PI / 2 },
    route: [[285, 190], [285, 285], [190, 285], [120, 250]],
  },
];

// Twelve corners of the bay, one glowing parcel each.
export const PACKAGE_SPOTS = [
  { x: 432, z: 40 },    // out on the ferry pier
  { x: -262, z: 84 },   // the market's north lane
  { x: -148, z: 168 },  // behind the south plaza stalls
  { x: 168, z: 292 },   // the container yard's far corner
  { x: -330, z: -330 }, // the chalk hills' back slope
  { x: -60, z: -262 },  // a Kota Lama rooftop stair
  { x: 96, z: -190 },   // behind Bima's bengkel
  { x: 300, z: -190 },  // the strand's north rocks
  { x: -190, z: -20 },  // a downtown service alley
  { x: 40, z: 190 },    // under the shore road sign
  { x: -285, z: 285 },  // the grid's south-west corner
  { x: 250, z: -285 },  // the boulevard's north end
];

export class RaceDirector {
  constructor() {
    this.active = null; // { race, next, t }
  }

  // Standing in a start gate with an engine running arms the race;
  // crossing the first checkpoint starts the clock for real.
  tryStart(state, carPos) {
    if (this.active || !state.inCar) return null;
    for (const race of RACES) {
      const d = Math.hypot(carPos.x - race.gate.x, carPos.z - race.gate.z);
      if (d < 7) {
        this.active = { race, next: 0, t: 0, armed: true };
        return race;
      }
    }
    return null;
  }

  update(dt, state, carPos, hooks) {
    const run = this.active;
    if (!run) return;
    if (!state.inCar) { this.active = null; hooks.onAbort && hooks.onAbort(run.race); return; }
    run.t += dt;
    const target = run.race.route[run.next];
    const d = Math.hypot(carPos.x - target[0], carPos.z - target[1]);
    if (d < 13) {
      run.next++;
      hooks.onCheckpoint && hooks.onCheckpoint(run.race, run.next, run.race.route.length);
      if (run.next >= run.race.route.length) {
        const t = run.t;
        this.active = null;
        const prev = state.act.best[run.race.id];
        if (prev == null || t < prev) state.act.best[run.race.id] = Math.round(t * 10) / 10;
        hooks.onFinish && hooks.onFinish(run.race, t, prev);
      }
    }
  }

  currentTarget() {
    if (!this.active) return null;
    const [x, z] = this.active.race.route[this.active.next];
    return { x, z };
  }

  line(state) {
    if (!this.active) return null;
    const run = this.active;
    return `${run.race.name} — GATE ${Math.min(run.next + 1, run.race.route.length)}/${run.race.route.length} • ${run.t.toFixed(1)} s`;
  }
}

export function racesWon(state) {
  return RACES.filter((r) => state.act.best[r.id] != null && state.act.best[r.id] <= r.par).length;
}

export function completionPct(state, jobsDone, jobsTotal) {
  const jobs = jobsDone / jobsTotal;
  const packs = state.act.taken.length / PACKAGE_SPOTS.length;
  const races = racesWon(state) / RACES.length;
  return Math.round(100 * (jobs + packs + races) / 3);
}
