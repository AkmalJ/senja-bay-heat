// shots.js — the four screenshot scenes behind ?stage=chase|market|port|hills.
// Each scene drives the real game into a posed, playable state: a real car at
// real speed, real police units with real dispatch rows, a real mission stage
// on the panel. Nothing here draws anything the game itself cannot draw.

export function stageScene(name, api) {
  switch (name) {
    case "chase": {
      // Cover: golden-hour boulevard chase on the strand, air unit deployed.
      api.setClock(16.35);
      api.setStats({ money: 18450, respect: 1675, health: 72, armor: 55 });
      api.startJobAt(5, 1);                    // SIRENS AT DUSK, escape stage
      api.placeInCar("Pelo GT", 285, 22, Math.PI, 31); // heading north up the strand road
      // (car sits 8 m south of the z=30 palm row so no clipped crown
      // hangs into the top-right of the frame)
      api.setCamOffset(-0.42);
      api.setWanted(4, true);
      api.spawnChasePack(4, 16);
      api.deployHelicopter();
      // Boulevard dressing: a taxi and a hatchback parked along the kerbs,
      // people on the promenade, boats out on the water to the right.
      api.parkCar("Taksi Senja", 276, 84, Math.PI);
      api.parkCar("Kijang Sprint", 295, -36, 0);
      api.addPed(297, 6, {});
      api.addPed(298, 52, {});
      api.addPed(273, 66, {});
      api.setPackagesFound(5);
      api.setRadio(0);
      api.dialogue("Sinta", "DRIVER — CREW", "Every cruiser in the bay and Air One want that orange Pelo. Forty seconds on the Strand, then you vanish.");
      break;
    }
    case "market": {
      // On-foot combat INSIDE the night market, staged for CLEAN
      // FIREFIGHT GEOMETRY — v5 staging, in the rebuilt market's
      // aisle 2 (z = 109): a 4.2 m lane walled by stall counters
      // and terpal canopies, a hanging lamp at every stall corner,
      // string lights sagging overhead, bare earth underfoot (the
      // mats are gone — a pasar malam floor is earth, not carpet).
      // Raka stands at the aisle's west end firing east; the
      // game's own on-foot follow camera sits at 4.2 m / 1.8 m, so
      // the low, close, down-the-aisle POV the reference frames
      // use is the game's real camera, not a staging trick. The
      // capture tool drags the pitch to ≈0.20 and
      // setCamOffset(−0.12) holds the slight over-the-shoulder
      // angle, so the muzzle orb and the tracer's first metre
      // clear his silhouette. In this game the shot flies along
      // the camera's forward — heading + camOffset — so with Raka
      // at heading π/2 the ray runs fwd(π/2 − 0.12) ≈
      // (0.993, +0.120): straight down the aisle, drifting a
      // half-metre south over the fight's length, stall fronts
      // and their painted signs as the walls on both sides.
      //   * ONE MAN DOWN, FLAT, CENTRE-AISLE — AND ONE STILL
      //     STANDING UNDER FIRE. A hostile stands his ground
      //     facing Raka (updatePeds), and the corpse settle tips
      //     him TOWARD his facing — toward Raka — his body coming
      //     to rest along the ~1.9 m in front of his feet. The
      //     near man stands 3.0 m out on the ray, so his body
      //     lands 1.1–3.0 m ahead, clear of Raka's silhouette,
      //     flat on the earth directly under the line of fire,
      //     flash-lit by the continuing burst. The far man stands
      //     on the same ray 5.5 m out; once the near man is down
      //     the fire walks over the body onto him — tracer over
      //     the corpse, spark burst on the standing man's torso,
      //     cause and effect in one glance. The near man wears
      //     the gang purple without the vest: face-up, the bare
      //     shirt is what keeps his body readable — the near-black
      //     vest swallowed an earlier corpse whole.
      //   * ONE WINGMAN off the ray, north-east of the far man
      //     (the ray test can never pick him), for gang context
      //     outside the sightline.
      //   * A LIVING AISLE, INSIDE THE FRAME. The aisle is only
      //     4.2 m wide, so the crowd lives at the stall fronts:
      //     browsers pinned slow along the north fronts (the ray
      //     drifts south, away from them — checked >1.9 m clear),
      //     a pair at Raka's shoulders, deep figures toward the
      //     crossroads. Two stand inside the panic radius and are
      //     already fleeing across the frame's edges when the
      //     shooting starts: the game's own behaviour, staged by
      //     placement alone.
      //   * NO POLICE LIGHT IN THE FRAME. The dispatch panel may
      //     list its units — the capture tool holds the response
      //     cars at bay for the length of the duel, so no cone or
      //     pool ever crosses the shot.
      // Clock 19.7: the late edge of the locked senja. The sky
      // keeps its ember band, but the sun is down, the stall
      // walls fall into canopy shade, and the lamps, signs and
      // string lights carry the frame — against that darker
      // backdrop the tracer, the flash and the purple gang
      // colours finally read at contact-sheet scale. (The first
      // v5 cast at 18.9 was honest senja and honest mush: every
      // warm tone in the aisle merged into one orange.)
      api.setClock(19.7);
      api.setStats({ money: 7270, respect: 940, health: 100, armor: 80 });
      api.startJobAt(1, 1);                    // clear-the-aisles stage (spawns hostiles)
      api.placeOnFoot(-238, 109, Math.PI / 2); // aisle 2's west end, facing east down the lane
      api.setCamOffset(-0.12);
      // The fight, all of it on the ray fwd(π/2 − 0.12) ≈
      // (0.993, +0.120) out of (-238, 109): the near man 3.0 m
      // out at (-235, 109.4) — he is the kill, and his body
      // settles flat on the earth under the fire, clear of Raka's
      // silhouette; the far man 5.5 m out at (-232.5, 109.7) —
      // he is the standing target the burst lands on. His wingman
      // covers from the north side east of him, a separate figure
      // in his own space, never a twin beside the target and
      // never on the ray (4 m clear). The distances came in from
      // the first v5 casts: at 4.5/9.0 m the purple read as just
      // another dark figure in the crowd and the flat body all
      // but vanished at thumbnail scale — closer, the gang colour
      // and the corpse's footprint both survive the contact sheet.
      api.addPed(-235, 109.4, { hostile: true, gun: true, shirt: 0x6c3483, vest: false });
      api.addPed(-232.5, 109.7, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-224.5, 106.6, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      // The crowd. api.addPed returns the ped, and pinning its
      // wander speed is what keeps a browser browsing his stall
      // for the whole capture: the game's shoppers walk at up to
      // 3 m/s and think nothing of crossing a gunfight — an
      // earlier take lost its target behind a wanderer who
      // strolled into the sightline and stood there.
      const shopper = (x, z, speed) => { const p = api.addPed(x, z, {}); if (p) p.speed = speed; };
      // Browsers along the north stall fronts, shuffling locally
      // (the ray drifts south, away from them). None stands in
      // the fight stretch itself — the first v5 cast drowned the
      // near man in browsers at his elbows; the crowd now frames
      // the duel from behind Raka's shoulders and from the deep
      // aisle, and the lane between the fighters stays theirs.
      shopper(-240, 107.5, 0.35);
      shopper(-226.5, 107.5, 0.35);
      shopper(-219, 107.6, 0.35);
      shopper(-213, 107.5, 0.35);
      // One at Raka's right shoulder, on the south front behind him:
      shopper(-241, 110.6, 0.35);
      // Deep figures toward the crossroads, for depth:
      shopper(-205, 107.6, 0.5);
      shopper(-204, 110.8, 0.5);
      shopper(-200, 107.5, 0.5);
      // Reactors inside the panic radius — already running when
      // the first shot lands, across the frame's edges:
      api.addPed(-242.5, 112.3, {});
      api.addPed(-233.8, 112.4, {});
      // A shopper's scooter parked in the crossroads south of the
      // aisle's east stretch, and one of the bay's hidden packages
      // glowing further down the lane (only the beach and pier
      // packages are marked found, so this one stays lit).
      api.parkCar("Senja Scooter", -209, 114.8, 1.4);
      api.setPackagesFound(2);
      api.parkCar("Bemo Pickup", -196, 150, 0.5);
      api.selectWeapon("smg");
      api.setWanted(2, true);
      api.spawnFootPack(2);
      api.dialogue("Laras", "LOOKOUT — CREW", "They're dug into aisle two, Raka — drop the front man and the lane is ours before SBPD floods the crossroads.");
      break;
    }
    case "port": {
      // Dusk port run: the coupe sits deep in the apron on the port
      // road, container rows flanking both sides, a crane ahead-left,
      // chasing the Regent target car past the gates.
      api.setClock(18.75);
      api.setStats({ money: 18450, respect: 2210, health: 76, armor: 58 });
      api.startJobAt(7, 1);                    // SENJA HEAT, wreck-the-Regent stage
      api.placeInCar("Senja Coupe", 190, 150, 0.4, 16); // rolling onto the apron toward the cranes
      api.setCamOffset(0.38);
      api.setWanted(3, true);
      api.spawnChasePack(3, 20);
      // A live street race on the HUD: the Port Run course is armed,
      // its first gold pillar standing down the apron road.
      api.startRace(2);
      api.setPackagesFound(4);
      // Dock dressing: the Kargo box truck parked among the containers
      // ahead-right, a work van and a hatchback on the apron, dockers
      // on foot between the rows.
      api.parkCar("Kargo Box Truck", 218, 190, -0.6);
      api.parkCar("Angkot Van", 168, 178, -0.5);
      api.parkCar("Kijang Sprint", 232, 168, 1.2);
      api.addPed(202, 198, { cap: 0xf5c518 });
      api.addPed(216, 238, {});
      api.setRadio(2);
      api.dialogue("Bima", "MECHANIC — CREW", "The Regent is making for the hills road! Ram it before it clears the port gates.");
      break;
    }
    case "hills": {
      // On foot on the Bukit Kapur road at deep dusk, ledger job: the
      // bookkeeper's coupe waits under the gold objective beam, traffic
      // parked along the lookout, and an SBPD cruiser rolls in on the
      // player — light bar flashing, headlight cones cutting the dark —
      // so the wanted response reads in this frame too, not just the
      // chase shots. The cluster is pulled tight around the player so
      // the lit skyline, not the bare chalk apron, fills the frame.
      // Clock 20.6, not 19.x: the lamp heads and night work-lights
      // only switch on once the sky's light level drops past their
      // thresholds just before 20:00, and at 20:00 the dome tint is
      // still bright enough to read as afternoon — 20.6 is where the
      // sky goes navy with the dusk band down to an ember line, the
      // lit windows take over, and the headlight cones/pools reach
      // full strength against the pale chalk.
      api.setClock(20.6);
      api.setStats({ money: 11980, respect: 1340, health: 88, armor: 40 });
      api.startJobAt(4, 0);
      api.placeOnFoot(-249, -270, 0.88);
      api.parkCar("Senja Coupe", -245, -264, 0.8);
      api.parkCar("Taksi Senja", -237.7, -247.6, 0.9);
      api.parkCar("Kijang Sprint", -226.8, -267.1, 1.0);
      api.parkCar("Senja Scooter", -254, -264, 1.2);
      api.setPackagesFound(8);
      api.addPed(-244, -268, {});
      api.addPed(-240, -262, { hat: 0xe9c46a });
      api.addPed(-237, -273, {});
      api.addPed(-230, -252, {});
      api.selectWeapon("pistol");
      api.setWanted(2, true);
      api.spawnChasePack(1, 12);
      api.dialogue("Laras", "LOOKOUT — CREW", "That's his car below — blue coupe, bookkeeper in the back. Cruiser rolling in on us — stay sharp, Raka.");
      break;
    }
  }
}
