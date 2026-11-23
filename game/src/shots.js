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
      // On-foot combat INSIDE the night market — v5.1 staging,
      // in the widened market's aisle 2 (centre z = 109.75,
      // clear lane z ≈ 106.9–112.6 between the stall colliders).
      //
      // THE LATERAL DUEL (owner's pinned reference: the Karimbu
      // market frame). Every earlier staging fired DOWN the
      // aisle with the camera on the shot line, so the fight
      // receded into depth and the hero's back filled the frame.
      // The reference does the opposite: the firing line is
      // LATERAL — hero in back three-quarter, gun arm extended
      // sideways in profile, the beam travelling horizontally
      // across open ground, the corpse flat in the open directly
      // under the beam line, crowd grouped in the same
      // mid-ground plane, stalls framing both edges. Enemy,
      // weapon and bullets all live in one readable plane.
      //   * THE GEOMETRY: Raka stands in the lane's northern
      //     half and fires due EAST along z = 109.0 (camOffset 0
      //     while the trigger is held, so his staged heading,
      //     his raised gun arm and the shot ray all agree).
      //   * THE SWING: the duel is fired from the game's own
      //     behind-the-back follow view; once the capture tool
      //     freezes the fired moment (see THE FREEZE below), it
      //     swings the camera around Raka to his gun side
      //     (camOffset ≈0.78, ≈45°): south-west of him at
      //     shoulder height, looking north-east across the
      //     lane. In staging the pointer never locks, so Raka's
      //     heading and firing pose hold while camYaw lerps to
      //     its new target — what turns is the camera, never
      //     the actor. From there he reads in back three-quarter
      //     profile, gun arm extended across the frame; the
      //     frozen beam runs over the corpse to the far man;
      //     the north stalls become the backdrop wall. THE
      //     CAMERA'S LIMIT, measured: a full 90° profile swing
      //     parks the camera due south, and from 4.2 m back a
      //     target 5.8–6.6 m along the lane sits 41–53° off the
      //     look axis — at or beyond the frame's edge and
      //     behind the HUD's right column. ≈45° is the
      //     strongest gun-side view the real follow camera
      //     honestly holds with the whole duel in frame.
      //   * ONE MAN DOWN, IN THE OPEN. The near man stands ON
      //     the ray 4.5 m out. A hostile stands his ground
      //     facing Raka (updatePeds), and the corpse settle tips
      //     him TOWARD his facing — his body comes to rest along
      //     the ~1.9 m of open floor between his feet and Raka,
      //     directly under the continuing beam line. The range
      //     was 3.2 m in the first lateral staging and the swung
      //     camera LOST the body entirely: settled at Raka's
      //     feet, it hid under his silhouette and the frame's
      //     lower edge. At 4.5 m the body spans ~2.6–4.5 m out —
      //     clear of the hero, mid-frame, the Karimbu
      //     arrangement of a body flat in open ground under the
      //     beam. He wears the gang purple without the vest:
      //     face-up, the bare shirt is what keeps the body
      //     readable — the near-black vest swallowed an earlier
      //     corpse whole.
      //   * THE STANDING TARGET: the far man on the same ray
      //     5.4 m out, backed against the north stall fronts
      //     with a painted sign behind him and a gap in the
      //     crowd on both sides, so the frozen burst on his
      //     torso has nothing to blend into. Behind him the
      //     gang stands in ECHELON along the stall fronts —
      //     two more Kerang Boys at ~7.4 m and ~5.6 m, stepped
      //     off the ray (1.4 m north, 2.5 m south — outside
      //     the ray test's 0.9 m pick radius, so Raka's fire
      //     still walks near man → far man and never picks
      //     them), each separated from the next by open
      //     floor, so the frame reads as a gang shootout,
      //     not a duel. His wingman covers from further east
      //     along the north front — a fourth gun at the
      //     frame's edge.
      //   * THE CROWD frames the duel from the same plane:
      //     pinned pairs along both stall fronts, west and east
      //     of the fight, none within 1.2 m of the ray and none
      //     crossing the sightline; two unpinned reactors flee
      //     when the shooting starts, the game's own panic.
      //   * THE FREEZE. The tracer lives 0.09 s — no grab can
      //     catch it live — so the capture tool fires the duel
      //     for real, then freezes the effects at the far man's
      //     first hit through the STAGE-only setFxFreeze handle:
      //     beam, muzzle orb, impact burst and the retuned wisp
      //     of dust hang at full brightness in one still while
      //     the aisle keeps living around them.
      //   * NO POLICE LIGHT IN THE FRAME. The dispatch panel
      //     may list its units — the capture tool holds the
      //     response cars at bay for the length of the duel,
      //     so no cone or pool ever crosses the shot.
      //   * TWO-WAY FIRE. The fight is not a duel: the far
      //     man and the south man shoot back. The capture
      //     tool keeps every staged gun silent while the
      //     scene settles, then — at the moment it freezes
      //     the far man's first hit — cues those two to fire
      //     (their own shootCd, their own muzzles), so the
      //     frozen still holds Raka's beam outbound and their
      //     red tracers inbound in the same instant. Nothing
      //     about their fire is drawn by hand: it is the
      //     game's own hostile fire, timed, not faked. The
      //     south man is the one whose tracer READS: the far
      //     man's return beam runs collinear with Raka's own
      //     (same line, opposite directions — one line hides
      //     the other, cast36's evidence), and a firer at the
      //     lane's far end crosses at too shallow an angle to
      //     separate from it in a still (cast37's evidence:
      //     ~17° in plan, and the hostile tracer is a 5 cm
      //     salmon line by design). So the second firer
      //     stands across the lane AND close — 5.6 m out,
      //     2.5 m south of the ray — and his beam crosses at
      //     ~27° in plan, at a range where his muzzle orb
      //     and tracer are at their largest in frame.
      // Clock 19.7: the late edge of the locked senja — the
      // sky keeps its ember band, the stall walls sit in
      // canopy shade, and the lamps, the lit sign faces and
      // the gunfire are the frame's brightest things.
      api.setClock(19.7);
      api.setStats({ money: 7270, respect: 940, health: 100, armor: 80 });
      api.startJobAt(1, 1);                    // clear-the-aisles stage (spawns hostiles)
      api.placeOnFoot(-241.5, 109.0, Math.PI / 2); // aisle 2's west stretch, firing due east along the lane
      api.setCamOffset(0);
      // The fight, all of it on the east ray out of
      // (−241.5, 109.0): the near man 4.5 m out at (−237.0,
      // 109.0) — he is the kill, and his body settles flat in
      // the open under the beam line, clear of Raka's
      // silhouette; the far man 5.9 m out at (−235.6, 109.0)
      // — he is the standing target the frozen burst lands
      // on, in front of the north row's stall at x ≈ −233.5,
      // its hanging sign as his backdrop, with open floor
      // between the corpse's head and his feet. The ranges
      // stay tight on purpose: the follow camera is fixed
      // 4.2 m back and looks AT Raka, so from the swung
      // gun-side view every metre of duel length costs ~5° of
      // frame — at 6.6 m the target slid to 79% of the width,
      // behind the HUD's right column and with his head inside
      // the weapon panels; at 5.4 m he stood at ~69%, and
      // 5.9 m buys the corpse its room for ~3 points more.
      // His wingman covers from the same front further east,
      // a separate figure in his own space. Between the far
      // man and the wingman, the echelon: two more Kerang
      // Boys along the stall fronts — one stepped north of
      // the ray, bare-shirted so he pops against the shaded
      // fronts at his range, and one across the lane on the
      // south front, vested. The south man is a cued
      // return-firer like the far man (his cross-lane
      // diagonal is the inbound tracer that reads — see
      // TWO-WAY FIRE above); the north man and the wingman
      // hold their fire for the frozen instant (not every
      // gun in a gang fires in the same tenth of a second).
      api.addPed(-237.0, 109.0, { hostile: true, gun: true, shirt: 0x6c3483, vest: false });
      api.addPed(-235.6, 109.0, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-234.2, 107.6, { hostile: true, gun: true, shirt: 0x6c3483, vest: false });
      api.addPed(-236.5, 111.5, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-229.5, 107.6, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      // The crowd. api.addPed returns the ped, and pinning its
      // wander speed is what keeps a browser browsing his stall
      // for the whole capture: the game's shoppers walk at up to
      // 3 m/s and think nothing of crossing a gunfight — an
      // earlier take lost its target behind a wanderer who
      // strolled into the sightline and stood there.
      const shopper = (x, z, speed) => { const p = api.addPed(x, z, {}); if (p) p.speed = speed; };
      // North-front pairs, west and east of the fight, in the
      // duel's own plane (the far man's backdrop gap stays his):
      shopper(-248.5, 107.6, 0.3);
      shopper(-247.2, 107.7, 0.35);
      shopper(-229.8, 107.6, 0.35);
      shopper(-228.5, 107.7, 0.3);
      // South-front pairs — foreground framing at the swung
      // camera's flanks, clear of its sightline cone:
      shopper(-249.5, 111.6, 0.3);
      shopper(-248.2, 111.7, 0.35);
      shopper(-232.5, 111.6, 0.35);
      shopper(-231.2, 111.7, 0.3);
      // Reactors inside the panic radius — already running when
      // the first shot lands:
      api.addPed(-252, 109.4, {});
      api.addPed(-227, 110.4, {});
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
