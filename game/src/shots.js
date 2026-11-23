// shots.js — the four screenshot scenes behind ?stage=chase|market|port|hills.
// Each scene drives the real game into a posed, playable state: a real car at
// real speed, real police units with real dispatch rows, a real mission stage
// on the panel. Nothing here draws anything the game itself cannot draw.

export function stageScene(name, api) {
  switch (name) {
    case "chase": {
      // Cover: golden-hour boulevard chase on the strand, air unit deployed.
      // Clock 18.38 at staging — the capture's frames carry it into
      // the ember band's peak (~18.6), where the locked senja is
      // deepest: amber horizon, teal sky, lamps lit, and Air One's
      // searchlight cone reads against the darkening boulevard.
      // (The old 16.35 staging rendered as pale midday blue — the
      // one hour the senja lock was written to abolish.)
      api.setClock(18.38);
      api.setStats({ money: 18450, respect: 1675, health: 72, armor: 55 });
      api.startJobAt(5, 1);                    // SIRENS AT DUSK, escape stage
      api.placeInCar("Pelo GT", 285, 22, Math.PI, 31); // heading north up the strand road
      // (car sits 8 m south of the z=30 palm row so no clipped crown
      // hangs into the top-right of the frame)
      // Cam offset is a whisper, not a swing: at -0.42 the view axis
      // cut ~24° across the boulevard and the beach swallowed the
      // frame's right third; -0.15 keeps the road running away under
      // Air One's cone with the promenade as a border, not a subject.
      api.setCamOffset(-0.15);
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
      // On-foot combat INSIDE the night market — v5.3 staging,
      // in the widened market's aisle 2 (centre z = 109.75,
      // clear lane z ≈ 106.9–112.6 between the stall colliders).
      //
      // THE CLEAN-WINDOW RECOMPOSITION (owner's verdict on the
      // v5.2 frame, treated as spec): the shootout was barely
      // visible — the enemy group landed at ~70–80% of frame
      // width, inside the right HUD column, small and crowded
      // out, and the return fire never read, so the frame
      // played as one-way fire. The frame's CLEAN STAGE WINDOW
      // — the band no HUD panel owns — is roughly 30–65% of
      // width, vertical middle. This staging is composed
      // inside it, and the composition was designed on a
      // calibrated camera model before it was staged (model:
      // follow cam 4.2 m back, HFOV ≈ 88.8°, swing = camOffset;
      // bias-corrected against the measured v5.2 frame):
      //   * SPREAD, NOT CLUSTER (the Brisa Bay lesson): the
      //     gang stands as INDIVIDUALS across the window on
      //     open lane floor, each with empty space around him —
      //     a north firer at the window's left (~43%), a
      //     north-mid holder (~55%), the primary target on the
      //     ray (~59%) — not one pink mass at the frame's edge.
      //     The spread is built from the CAMERA's bearings, not
      //     from Raka's: north-side men sit nearer the swung
      //     view axis and land central; anything south of the
      //     ray is flung past 75% by the swing (measured: the
      //     old south firer stood at ~91% — inside the weapon
      //     panels — which is why his fire never read).
      //   * RAKA FIGHTS FROM THE LANE'S SOUTH HALF (z = 110.2)
      //     so the whole gang can stand NORTH of his ray, in
      //     the open lane. Behind them the north row now opens
      //     into the DUEL POCKET (city.js): two stalls removed
      //     behind the fight stretch, the row continuing on
      //     both sides — open lit space at the gang's backs
      //     instead of a stall wall, the pocket's LAUT SEGAR
      //     board hung across its back.
      //   * THE LATERAL LINE stays: Raka fires due EAST
      //     (camOffset 0 while the trigger is held), the beam
      //     travels horizontally, and after the freeze the
      //     capture tool swings the camera to his gun side.
      //     The swing is pushed as far toward profile as the
      //     duel staying inside the window allows — the casts
      //     measure each stop in pixels and the largest swing
      //     that keeps every enemy under 65% wins.
      //   * ONE MAN DOWN, ISOLATED (the Karimbu lesson): the
      //     near man stands on the ray 4.1 m out, a step north
      //     of its line; his body settles toward Raka along
      //     ~1.9 m of lane and comes to rest at the pocket's
      //     mouth with NOTHING within ~1.5 m of it — the
      //     primary's feet metres past his head, the crowd
      //     pairs far off at the pocket's corners — a body
      //     alone in a lit patch of open floor under the beam,
      //     not a shape lost under legs or stall clutter. He
      //     wears the gang purple without the vest: face-up,
      //     the bare shirt is what keeps a body readable.
      //   * RETURN FIRE IS CARRIED BY THE ORBS (the PCPD
      //     lesson): three guns fire back in the reference
      //     frames and what reads is a big glowing orb at each
      //     enemy muzzle, the beam as support. Two firers are
      //     cued by the capture tool at the freeze: the primary
      //     (his beam runs collinear with Raka's — one line
      //     hides the other, cast36's evidence — so HIS read
      //     is his orb and the burst he puts on Raka) and the
      //     NORTH FIRER, 5.2 m out and 2.7 m north of the ray,
      //     whose beam crosses the open lane at ~32° in plan —
      //     a genuinely different angle, over lit floor, from
      //     a muzzle the swing keeps at the window's left edge
      //     where nothing crowds it. The hostile orb itself
      //     now runs 0.92 in the game (v5.3): at the shipped
      //     0.55 the bloom never registered in a still.
      //   * THE RED ▼: every staged hostile wears the game's
      //     own combat marker over his head (v5.3, in
      //     actors.js/main.js — a real feature of normal play,
      //     not staging paint): three small red triangles over
      //     three spread gunmen is the direct answer to
      //     "the enemies are covered, I can't see them".
      //   * THE CROWD frames the duel from the same plane:
      //     pinned pairs along both stall fronts, west and
      //     east of the fight, none within 1.5 m of the corpse
      //     patch and none crossing the sightline; two
      //     unpinned reactors flee when the shooting starts.
      //   * THE FREEZE. The tracer lives 0.09 s — no grab can
      //     catch it live — so the capture tool fires the duel
      //     for real, then freezes the effects at the primary's
      //     first hit through the STAGE-only setFxFreeze
      //     handle: every beam and orb fired inside the window
      //     (Raka's outbound, both firers' inbound, all three
      //     muzzle blooms) hangs at full brightness in one
      //     still while the aisle keeps living around them.
      //   * NO POLICE LIGHT IN THE FRAME. The dispatch panel
      //     may list its units — the capture tool holds the
      //     response cars at bay for the length of the duel.
      // Clock 19.7 at staging (the HUD reads ~19:49 by the
      // capture): the late edge of the locked senja — lamps,
      // lit sign faces and gunfire are the frame's brightest
      // things.
      api.setClock(19.7);
      api.setStats({ money: 7270, respect: 940, health: 100, armor: 80 });
      api.startJobAt(1, 1);                    // clear-the-aisles stage (spawns hostiles)
      api.placeOnFoot(-241.5, 110.2, Math.PI / 2); // aisle 2's south half, firing due east along z = 110.2
      api.setCamOffset(0);
      // The fight, relative to Raka at (−241.5, 110.2) —
      // the pocket round: the standing men spend the space
      // the crossroads gap freed, spread wider across its
      // frontage and a step deeper into its mouth:
      //   near man (+4.1, −0.3) at (−237.4, 109.9) — the kill;
      //     his body settles west along the lane into its own
      //     empty patch at the pocket's mouth under the beam.
      //   primary (+7.6, −0.7) at (−233.9, 109.5) — the
      //     standing target Raka's frozen burst lands on, a
      //     cued return-firer; 0.7 m north of the ray line is
      //     inside the ray test's 0.9 pick tolerance, so
      //     Raka's fire still walks near man → primary.
      //     (Moved east in the cast45 pass: the corpse now
      //     owns the pocket's western mouth alone, ~5.4 m
      //     clear of him.)
      //   north firer (+6.7, −3.6) at (−234.8, 106.6) —
      //     the diagonal return-firer, deep in the pocket
      //     mouth; 3.6 m off the ray, so Raka's fire never
      //     picks him; his own beam crosses the lane at ~35°.
      //   north-mid (+10.5, −3.6) at (−231.0, 106.6) — the
      //     third standing gun, holding his fire for the
      //     frozen instant, 3.8 m east of the firer along the
      //     pocket's mouth so the three read as individuals
      //     across the gap, not one mass against a wall.
      //   (Bearing fit, calibrated on two casts of this
      //     composition: x% ≈ 50.7 + 0.72·Δθ, Δθ = a man's
      //     bearing from the CAMERA minus the view axis's.
      //     The trap it exposed: a man standing ON the axis
      //     bearing (Δθ ≈ 0) projects onto Raka's silhouette
      //     and vanishes behind him — the firer's first two
      //     spots sat within 2° of the axis at their swings.
      //     The landed swing is ~0.65, which puts the firer
      //     at Δθ ≈ +6° (~55%), north-mid ~+12° (~59%), the
      //     primary ~+18° (~63%) — spread, clear of the hero,
      //     and inside the window.)
      api.addPed(-237.4, 109.9, { hostile: true, gun: true, shirt: 0x6c3483, vest: false });
      api.addPed(-233.9, 109.5, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-234.8, 106.6, { hostile: true, gun: true, shirt: 0x6c3483, vest: false });
      api.addPed(-231.0, 106.6, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      // The crowd. api.addPed returns the ped, and pinning its
      // wander speed is what keeps a browser browsing his stall
      // for the whole capture: the game's shoppers walk at up to
      // 3 m/s and think nothing of crossing a gunfight — an
      // earlier take lost its target behind a wanderer who
      // strolled into the sightline and stood there.
      const shopper = (x, z, speed) => { const p = api.addPed(x, z, {}); if (p) p.speed = speed; };
      // North-front pairs, west and east of the fight:
      shopper(-248.5, 107.6, 0.3);
      shopper(-247.2, 107.7, 0.35);
      shopper(-229.8, 107.6, 0.35);
      shopper(-228.5, 107.7, 0.3);
      // South-front pairs — foreground framing at the swung
      // camera's flanks, clear of its sightline cone and of
      // the corpse patch:
      shopper(-249.5, 112.3, 0.3);
      shopper(-248.2, 112.4, 0.35);
      shopper(-231.5, 112.3, 0.35);
      shopper(-230.2, 112.4, 0.3);
      // Reactors inside the panic radius — already running when
      // the first shot lands:
      api.addPed(-252, 110.8, {});
      api.addPed(-226.5, 111.5, {});
      // A shopper's scooter parked in the crossroads south of
      // the aisle's east stretch; the HUD's package count is
      // set to the beach and pier finds, so the market's own
      // package (west of the fight, at the aisle's mouth)
      // stays lit.
      api.parkCar("Senja Scooter", -209, 116.5, 1.4);
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
