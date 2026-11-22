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
      // On-foot combat INSIDE the night market — v5 staging, in
      // the rebuilt market's aisle 2 (centre z = 109, open floor
      // z ≈ 106.7–111.3 between the facing stall fronts).
      //
      // THE DIAGONAL. The first v5 staging put hero, targets and
      // camera on ONE east–west line: every hostile stood inside
      // the hero's silhouette cone, the corpse landed behind his
      // legs, and the nearest north stall front — 2 m away, seen
      // edge-on — filled a third of the frame as a flat orange
      // slab. The reference frames never do this: their hero
      // fires ACROSS the space, the beam crossing open ground
      // diagonally to a target standing clear of him, a body
      // lying in the open under the line of fire. So the fight
      // now runs on a diagonal ray: Raka hugs the aisle's south
      // side at its west end and fires east-north-east across
      // the lane. The camera sits on the shot line by
      // construction (the follow cam looks along heading +
      // camOffset), so it sees both stall rows at an angle —
      // the north row as the receding backdrop wall with its
      // signs facing him, the south row as the near wall at the
      // frame's right edge — and the whole fight spread across
      // the open floor to his right.
      //   * THE RAY: shot direction = fwd(heading + camOffset)
      //     = fwd(1.560 + 0.22) ≈ (0.978, −0.208), ~12° north of
      //     east. The positive camOffset also swings the camera
      //     toward Raka's gun side (his local −X faces south
      //     when he faces east), so the raised gun arm and the
      //     gun read from a three-quarter back view instead of
      //     hiding behind his torso's edge; the 0.22 rad split
      //     between his facing and the beam is small enough that
      //     the muzzle orb covers the joint.
      //   * THE SWING: in this engine the follow camera sits ON
      //     the shot line, so mid-duel the target still stands
      //     inside the hero's silhouette cone — the diagonal
      //     alone cannot change that. What it changes is where
      //     everyone stands when the capture tool, AFTER
      //     freezing the fired moment, swings the camera ~0.3
      //     rad around Raka to a due-west viewpoint: the target
      //     steps out of the silhouette to the frame's left, the
      //     frozen beam crosses the open floor diagonally, the
      //     corpse lies centre-frame under it, and both stall
      //     rows recede as corridor walls. The diagonal places
      //     the pieces; the swing composes them.
      //   * CAMERA CLEARANCE: from (−241, 109.5) the pre-swing
      //     camera sits 4.2 m back along the ray at
      //     ≈(−245.0, 110.4) — ~0.9 m clear of the south stall
      //     fronts (z = 111.3) — and the swing carries it to
      //     ≈(−245.2, 109.5), mid-aisle. A steeper diagonal
      //     would park the camera inside a stall or under the
      //     south canopy; a shallower one is the old frame.
      //   * ONE MAN DOWN, IN THE OPEN. The near man stands ON
      //     the ray 4.0 m out. A hostile stands his ground
      //     facing Raka (updatePeds), and the corpse settle tips
      //     him TOWARD his facing — his body comes to rest along
      //     the ~1.9 m of open floor between his feet and Raka,
      //     centre-frame under the continuing fire, laterally
      //     clear of the hero's silhouette because the ray
      //     itself runs diagonally away from him. He wears the
      //     gang purple without the vest: face-up, the bare
      //     shirt is what keeps the body readable — the
      //     near-black vest swallowed an earlier corpse whole.
      //   * THE STANDING TARGET: the far man on the same ray
      //     6.4 m out, backed against the north stall fronts
      //     with a painted sign behind him and a gap in the
      //     crowd on both sides, so the frozen burst on his
      //     torso has nothing to blend into. His wingman covers
      //     from further east along the same front, 1.2 m clear
      //     of the ray (outside the ray test's 0.9 m pick
      //     radius) — gang context, never a twin by the target.
      //   * A LIVING AISLE, INSIDE THE FRAME. The crowd lives
      //     at the stall fronts, pinned slow, with the fight
      //     corridor kept empty: browsers along both fronts and
      //     deep figures toward the crossroads, all ≥1.7 m off
      //     the ray (checked against the shot test's 0.9 m pick
      //     radius, so no shopper can eat a round meant for the
      //     far man or wander into the beam's picture).
      //   * THE EFFECTS ARE HELD BY THE FREEZE. The tracer
      //     lives 0.09 s — no grab can catch it live — so the
      //     capture tool fires the duel for real, then freezes
      //     the effects at the far man's first hit through the
      //     STAGE-only setFxFreeze handle: beam, muzzle orb,
      //     impact burst and dust hang at full brightness in
      //     one still while the aisle keeps living around them.
      //   * NO POLICE LIGHT IN THE FRAME. The dispatch panel
      //     may list its units — the capture tool holds the
      //     response cars at bay for the length of the duel,
      //     and the staged hostiles' return fire is silenced
      //     the same way, so no cone, pool or red beam ever
      //     crosses the shot.
      // Clock 19.7: the late edge of the locked senja. The sky
      // keeps its ember band, but the sun is down, the stall
      // walls fall into canopy shade, and the lamps, signs and
      // string lights carry the frame — against that darker
      // backdrop the tracer, the flash and the purple gang
      // colours finally read at contact-sheet scale.
      api.setClock(19.7);
      api.setStats({ money: 7270, respect: 940, health: 100, armor: 80 });
      api.startJobAt(1, 1);                    // clear-the-aisles stage (spawns hostiles)
      api.placeOnFoot(-241, 109.5, 1.560);     // aisle 2's west end, south side, facing ENE across the lane
      api.setCamOffset(0.22);
      // The fight, all of it on the ray fwd(1.780) ≈
      // (0.978, −0.208) out of (−241, 109.5): the near man
      // 4.0 m out at (−237.1, 108.7) — he is the kill, and his
      // body settles flat in the open between the fighters; the
      // far man 6.4 m out at (−234.7, 108.2) — he is the
      // standing target the frozen burst lands on, in front of
      // the north row's stall at x ≈ −233.5, its painted sign
      // as his backdrop. The range is deliberate: at 7.6 m the
      // impact's own dust puff grew wide enough to swallow the
      // man it hit; at 6.4 m his head, arms and legs frame the
      // flash instead. His wingman covers from the same front
      // further east, a separate figure in his own space.
      api.addPed(-237.1, 108.7, { hostile: true, gun: true, shirt: 0x6c3483, vest: false });
      api.addPed(-234.7, 108.2, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-226.5, 107.5, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      // The crowd. api.addPed returns the ped, and pinning its
      // wander speed is what keeps a browser browsing his stall
      // for the whole capture: the game's shoppers walk at up to
      // 3 m/s and think nothing of crossing a gunfight — an
      // earlier take lost its target behind a wanderer who
      // strolled into the sightline and stood there.
      const shopper = (x, z, speed) => { const p = api.addPed(x, z, {}); if (p) p.speed = speed; };
      // North-front browsers, with a clear gap around the far
      // man (his wingman stands 7 m east of him, the browsers
      // beyond that):
      shopper(-224.5, 107.8, 0.35);
      shopper(-220.5, 107.7, 0.35);
      shopper(-214, 107.6, 0.35);
      // South-front browsers — mid-ground depth on the frame's
      // right, all well south of the ray:
      shopper(-233, 110.7, 0.3);
      shopper(-230.5, 110.5, 0.35);
      shopper(-223.5, 110.5, 0.35);
      shopper(-216.5, 110.6, 0.35);
      // Deep figures toward the crossroads, for depth:
      shopper(-206, 107.8, 0.5);
      shopper(-203.5, 110.6, 0.5);
      // A shopper's scooter parked in the crossroads south of the
      // aisle's east stretch; the HUD's package count is set to
      // the beach and pier finds, so the market's own package
      // (behind the camera, at the aisle's west mouth) stays lit.
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
