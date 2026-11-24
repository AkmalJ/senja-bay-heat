// shots.js — the screenshot staging module. Plain play never sees
// it: only a page opened with ?stage=<name> lands here, where a
// scene is dressed (a career seeded, a chase rolled, a duel frozen
// mid-volley) and a debug handle is published for the capture casts
// in the shot-tool. Every lever on that handle moves real game
// state; the casts compose frames, they do not fake them.

export function applyStage(G) {
  const stage = new URLSearchParams(location.search).get("stage");
  const S = G.state;
  const { player, hud } = G;

  const seedCareer = (over) => {
    Object.assign(S, {
      money: 18450, respect: 1675, missionIndex: 5, stageIndex: 1, stageLeft: 0,
      ammo: { pistol: 96, smg: 240, shotgun: 32 },
      unlocked: { pistol: true, smg: true, shotgun: true },
      stolen: 7, health: 72, armour: 55, clock: 18.43, wanted: 4, heat: 0,
      act: { best: { strand: 48.6 }, taken: [0, 1, 2, 3, 4] },
      stageLock: true,
    }, over || {});
  };

  G.startGame(false);

  if (stage === "chase") {
    // The cover: Sinta's job at stage two, the orange Pelo already
    // lifted and running the boulevard with the whole bay behind it.
    seedCareer();
    S.camOffset = -0.42;
    const car = G.spawnCar("pelo", 0xe8641c, 282, 30, Math.PI, "parked");
    car.speed = 29; car.autopilot = true; car.countedTheft = true;
    S.inCar = car;
    player.mesh.visible = false;
    // A clear boulevard to run on: tonight's traffic is elsewhere,
    // and two cruisers are already on his tail — the rest converge.
    for (const c of G.cars) {
      if (c !== car && c.kind !== "police" && Math.hypot(c.pos.x - 282, c.pos.z - 30) < 140) {
        c.pos.set(-260 + (Math.abs(c.pos.x) % 40), 0, -260 + (Math.abs(c.pos.z) % 40));
        c.mesh.position.copy(c.pos);
      }
    }
    const tail = G.cars.filter((c) => c.kind === "police");
    [[282, 84, "MARLIN-30"], [291, 108, "TIDE-67"]].forEach(([x, z, name], i) => {
      const c = tail[i];
      if (!c) return;
      c.active = true; c.mesh.visible = true;
      c.dispatchName = name; c.tactic = "PURSUIT";
      c.pos.set(x, 0, z); c.mesh.position.copy(c.pos);
      c.heading = Math.PI; c.mesh.rotation.y = Math.PI; c.speed = 27;
    });
    G.setCamYaw(Math.PI + Math.PI + S.camOffset);
    G.pinDispatch(3);
    hud.dialogue("Sinta", "DRIVER — CREW", "Every cruiser in the bay and Air One want that orange Pelo. Forty seconds on the Strand, then you vanish.", "#d8493b");
  } else if (stage === "portduel") {
    // The duel: job seven, stage two, Raka turned 45° onto the pair
    // by the red container, Bima at his right, the port road held.
    seedCareer({
      respect: 2210, missionIndex: 6, stageIndex: 1, stageLeft: 6,
      ammo: { pistol: 96, smg: 235, shotgun: 32 },
      health: 98, armour: 65, clock: 19.97, wanted: 3,
      act: { best: { strand: 48.6 }, taken: [0, 1, 2, 3] },
    });
    S.camOffset = 0.20;
    S.camShoulder = 1.5;
    S.camBack = 1.8;
    G.setPlayerWeapon("smg");
    player.pos.set(195.9, 0, 189.5);
    player.heading = Math.PI / 4;
    player.mesh.rotation.y = Math.PI / 4;
    G.setCamYaw(Math.PI / 4 + Math.PI + 0.20);
    G.spawnPed("crew", 193.8, 191.8, {
      crew: true, heroGun: true, name: "BIMA", heading: 0.8,
      look: { skin: 0x9c6b43, shirt: 0x8a5a2e, pants: 0x2a2d33, cap: 0x3a3f45 },
    });
    G.spawnCar("kijang", 0xc23b2a, 215.5, 202, 0.4, "parked");
    G.spawnCar("coupe", 0x2471a3, 233, 201, -0.3, "parked");
    G.spawnCar("bemo", 0x2e8b6e, 194, 198, 1.2, "parked");
    // The cordon at dispatch distance: five units holding 50–60 m.
    const units = [
      ["MARLIN-47", "RAMMING", 240, 225], ["PIER-37", "PURSUIT", 238, 218],
      ["PIER-75", "RAMMING", 150, 215], ["MARLIN-14", "FLANKING", 146, 208],
      ["MARLIN-70", "RAMMING", 238, 228],
    ];
    const pool = G.cars.filter((c) => c.kind === "police");
    units.forEach(([name, tactic, x, z], i) => {
      const c = pool[i];
      if (!c) return;
      c.active = true; c.mesh.visible = true;
      c.dispatchName = name; c.tactic = tactic;
      c.pos.set(x, 0, z); c.mesh.position.copy(c.pos);
      c.heading = Math.atan2(player.pos.x - x, player.pos.z - z);
      c.mesh.rotation.y = c.heading;
      c.speed = 0;
    });
    G.pinDispatch(0);
    hud.dialogue("Bima", "MECHANIC — CREW", "Blockade crews on the port road, Raka. The Long Table sits when this road is clear — drop them between the containers.", "#2e7fd9");
  } else if (stage === "market") {
    player.pos.set(-206, 0, 110);
    player.heading = 0.6;
    player.mesh.rotation.y = 0.6;
    G.setCamYaw(0.6 + Math.PI);
  } else if (stage === "port" || stage === "portshoulder" || stage === "portwide") {
    player.pos.set(196, 0, 172);
    player.heading = 0.9;
    player.mesh.rotation.y = 0.9;
    G.setCamYaw(0.9 + Math.PI + 0.2);
    if (stage !== "port") S.camShoulder = 1.5;
    if (stage === "portwide") S.camBack = 1.8;
  } else if (stage === "hills") {
    player.pos.set(-228, 0, -228);
    player.heading = -0.7;
    player.mesh.rotation.y = -0.7;
    G.setCamYaw(-0.7 + Math.PI);
  }

  installDebug(G);
  window.__senjaReady = true;
}

function installDebug(G) {
  const S = G.state;
  const api = {
    get state() { return G.state; },
    get player() { return G.player; },
    get peds() { return G.peds; },
    get cars() { return G.cars; },
    get camYaw() { return G.getCamYaw(); },
    get fxFrozen() { return G.fx.frozen; },
    setFxFreeze(v) { G.fx.setFrozen(!!v); },
    get flashI() { return G.fx.flashI; },
    get flashPos() { return G.fx.flashPos; },
    get tracerEnd() { return G.fx.lastStreak ? G.fx.lastStreak.to : null; },
    setCamShoulder(v) { G.state.camShoulder = v; },
    setCamBack(v) { G.state.camBack = v; },
    setRaceBest(raceId, seconds) { G.state.act.best[raceId] = seconds; },
    setHeroGun() { G.setPlayerWeapon("smg"); },
    heroGunPed() { return G.player; },
  };
  window.__senjaDebug = api;
  return api;
}
