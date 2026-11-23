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
      // Dusk-night shootout at Pelabuhan. Three stagings taught
      // the geography the hard way: the apron is a featureless
      // slab (casts 53–55: fog void, flash disc, no backdrop),
      // and the container scatter does not respect the roads —
      // at (163, 190) a magenta box sits ON the road and ate the
      // camera (cast 56). The recon probe (probe-port.mjs) found
      // the stretch that works: the z = 190 road at x ≈ 205 —
      // open asphalt, a barrel at the kerb, and the field's
      // biggest cluster (a red box, a blue stack) standing SOUTH
      // of the road 10–15 m behind the fight line.
      //
      // So the market geometry is MIRRORED: Raka at (203, 189.5)
      // fires due EAST (heading π/2) along the road and the gang
      // stands SOUTH of the ray against the container cluster,
      // and the capture tool swings the camera the other way
      // (negative offset, to Raka's gun side) into the same
      // clean window the market won:
      //   near man (+4.2, +0.4 S) at (207.2, 189.9) — the kill;
      //     his body settles back west toward Raka along the
      //     lane, alone on the asphalt under the beam.
      //   primary (+7.8, +0.8 S) at (210.8, 190.3) — the standing
      //     target and a cued return-firer; 0.8 m off the ray is
      //     inside the ray test's 0.9 pick tolerance, so Raka's
      //     fire walks near man → primary.
      //   south firer (+6.9, +3.4 S) at (209.9, 192.9) — diagonal
      //     return fire across the lane.
      //   south-mid (+10.8, +3.4 S) at (213.8, 192.9) — the third
      //     standing gun, holding his fire for the frozen instant.
      // THE BURNING CAR is the drama anchor: a Kijang wrecked on
      // the open road north-east of the gang at (219, 188.5) —
      // cast 57 parked it beyond the gang and the red container
      // swallowed it whole from the swung camera; on the open
      // lane nothing stands between its flames and the lens.
      // The capture tool burns it (wrecked,
      // health <= 15 is the game's own fire threshold) before
      // the duel and takes a long thaw before the final freeze,
      // so its flames and flickering light are live game
      // systems, not paint.
      // Clock 19.55 at staging — the capture lands in the
      // dusk-night family (~19.9): lamps and port work lights at
      // full strength under a deep teal sky.
      api.setClock(19.55);
      api.setStats({ money: 18450, respect: 2210, health: 100, armor: 70 });
      api.startJobAt(6, 1);                    // THE LONG TABLE, clear-the-port-road stage
      api.placeOnFoot(203, 189.5, Math.PI / 2); // port road at the container cluster, firing east
      api.setCamOffset(0);
      api.addPed(207.2, 189.9, { hostile: true, gun: true, shirt: 0x6c3483, vest: false });
      api.addPed(210.8, 190.3, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(209.9, 192.9, { hostile: true, gun: true, shirt: 0x6c3483, vest: false });
      api.addPed(213.8, 192.9, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      // Dockers pinned at the frame's edges and two unpinned
      // reactors inside the panic radius.
      const docker = (x, z, speed, opts) => { const p = api.addPed(x, z, opts || {}); if (p) p.speed = speed; };
      docker(196, 185.5, 0.3, { cap: 0xf5c518 });
      docker(197.5, 186.5, 0.35, {});
      docker(218.5, 198.5, 0.3, { cap: 0xe07a3f });
      docker(220, 199.5, 0.35, {});
      api.addPed(199, 183.5, {});
      api.addPed(200, 196, {});
      // The drama anchor and yard dressing.
      api.parkCar("Kijang Sprint", 219, 188.5, 0.7);
      api.parkCar("Kargo Box Truck", 233, 201, 0.5);
      api.parkCar("Angkot Van", 194, 198, 0.8);
      api.selectWeapon("smg");
      api.setPackagesFound(4);
      api.setWanted(3, true);
      api.setRadio(2);
      api.dialogue("Bima", "MECHANIC — CREW", "Blockade crews on the port road, Raka. The Long Table sits when this road is clear — drop them between the containers.");
      break;
    }
    case "hills": {
      // Bukit Kapur at dusk-night: the scale shot. Two stagings
      // taught the geography: the lookout clearing faces a
      // generic mid-rise wall 25 m away (the block east of the
      // hills is not hills-zoned), and standing inside the goto
      // radius completes the stage before the grab. The world's
      // only guaranteed-open sightlines are its road corridors —
      // so the shot stands on the z = -190 road at the hills'
      // west end, looking EAST down the canyon: chalk rooftops
      // on the left, the downtown tower cluster rising at the
      // corridor's end 300 m away, the bay a teal band beyond
      // the strand. Flat ground, composed depth — rooftops,
      // towers, sea, sky, stacked in fog layers.
      //   * Raka at (-218, -191.5), heading π/2 — 59 m from the
      //     lookout point, so the stage stays armed and the card
      //     honestly reads "Reach the Bukit Kapur lookout".
      //   * The bookkeeper's coupe waits on the shoulder ahead.
      //   * An SBPD cruiser rolls down the corridor toward the
      //     camera (pinned by the capture tool at (-178, -186.5),
      //     headlights first) — the wanted response in-frame.
      // Clock 19.85 at staging — the capture lands ~20.1: navy
      // senja sky, lit windows, headlight cones at full strength.
      api.setClock(19.85);
      api.setStats({ money: 11980, respect: 1340, health: 88, armor: 40 });
      api.startJobAt(4, 0);                    // HILLSIDE LEDGER, reach-the-lookout stage
      api.placeOnFoot(-218, -191.5, Math.PI / 2); // z = -190 road, west end, facing east over the town
      api.setCamOffset(-0.28);                 // the canyon runs diagonally off Raka's shoulder, not split by him
      api.parkCar("Senja Coupe", -196, -183.5, Math.PI / 2 + 0.12); // the bookkeeper's coupe, shoulder ahead
      api.parkCar("Taksi Senja", -227, -199.5, 0.05);
      api.parkCar("Kijang Sprint", -158, -198.5, -Math.PI / 2);
      api.parkCar("Senja Scooter", -213.5, -185.5, 1.2);
      api.setPackagesFound(8);
      api.addPed(-210, -183, {});
      api.addPed(-205, -199, { hat: 0xe9c46a });
      api.addPed(-188, -182.5, {});
      api.selectWeapon("pistol");
      api.setWanted(2, true);
      api.spawnChasePack(1, 12);
      api.dialogue("Laras", "LOOKOUT — CREW", "Lookout road, Raka — the whole bay below and the bookkeeper's coupe waiting ahead. Cruiser just turned onto the hill road. Stay sharp.");
      break;
    }
  }
}
