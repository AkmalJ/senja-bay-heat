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
      // FIREFIGHT GEOMETRY. The previous frame failed on geometry,
      // not content: the camera sat dead behind Raka so his firing
      // side was hidden, his target stood directly behind his
      // silhouette so only the spark column showed above his head,
      // and two dropped men lay half-rolled beside him with their
      // gun boxes jutting at matching angles — clutter, not story.
      // This staging fixes the geometry itself:
      //   * LOW, CLOSE, DOWN THE AISLE. The reference frames for
      //     this competition shoot their fights from shoulder
      //     height, tight behind the player, the corridor
      //     vanishing ahead — while this game's default follow
      //     camera floats high and far and shrinks every effect
      //     in the scene. So the capture tool drags the pitch
      //     most of the way to the game's own floor (camPitch
      //     ≈0.17 against the 0.06 floor the mouse-orbit allows:
      //     camera ≈3.0 m up, Raka filling the lower third — the
      //     last step down was tried and a flat corpse on the
      //     aisle goes edge-on and vanishes at the full floor)
      //     and setCamOffset(0.35) holds a
      //     slight over-the-shoulder angle, enough that the
      //     muzzle orb and the beam's first metre clear his
      //     silhouette. Nothing here exceeds what a player's own
      //     mouse can do in normal play. In this game the shot
      //     flies along the camera's forward — heading +
      //     camOffset — so with Raka placed at heading 3π/4 the
      //     ray runs fwd(3π/4 + 0.35) ≈ (0.42, −0.91): up the
      //     aisle, stall fronts and their south-facing signs as
      //     the backdrop.
      //   * ONE MAN DOWN, FLAT, CENTRE-AISLE — AND ONE STILL
      //     STANDING UNDER THE BEAM. The near Kerang Boy stands
      //     on the ray 3.0 m out and takes the capture's first
      //     four hits (60 hp, 15 a hit): he dies and settles flat
      //     on his back along the aisle (the game's corpse settle
      //     lays him toward −Z, head away from Raka, gun hand
      //     empty), directly under the line of fire. The far man
      //     stands on the same ray 6.4 m out; once the near man is
      //     down the fire walks over the body onto him, and the
      //     capture cuts the trigger after two hits with him
      //     still on his feet — beam over the corpse, burst on
      //     the standing man's torso, cause and effect in one
      //     glance. One body is a story; the two half-rolled
      //     corpses of the failed frame were clutter because the
      //     old settle left them hovering with their gun boxes
      //     jutting — flat and alone, a body reads as a body.
      //   * ONE WINGMAN off the ray, well east of the far man
      //     (perpendicular distance ~4.4 — the ray test can never
      //     pick him), for gang context outside the sightline.
      //   * A LIVING AISLE. Sixteen shoppers crowd the corridor —
      //     browsing the stall fronts, walking the mid-aisle, a
      //     pair deep at the east end — because a night market
      //     with four figures in it reads as a film set, not a
      //     market. Three of them stand inside the panic radius
      //     (under 6 m from Raka, wanted already 2) and are
      //     already fleeing across the frame's edges when the
      //     shooting starts: the game's own behaviour, staged by
      //     placement alone. Every shopper stands clear of the
      //     sightline corridor (checked >1.6 m off the ray), so
      //     the crowd fills the sides and the depth while the
      //     beam, the body and the target stay readable.
      // Full night 21.6, past the dusk band, when the market's
      // own signs and string lights take over the frame and every
      // beam and spark stands out against the dark.
      api.setClock(21.6);
      api.setStats({ money: 7270, respect: 940, health: 100, armor: 80 });
      api.startJobAt(1, 1);                    // clear-the-aisles stage (spawns hostiles)
      api.placeOnFoot(-238, 140.0, Math.PI * 0.75); // at the teal runner's north edge, facing NE across the aisle
      api.setCamOffset(0.35);
      // The fight, all of it on the ray fwd(3π/4 + 0.35) ≈
      // (0.42, −0.91) out of (-238, 140): the near man 3.0 m out
      // at (-236.7, 137.3) — he is the kill, and his body settles
      // flat across the mat's north edge under the beam (close
      // enough that even edge-on at the low camera his footprint
      // reads — a flat body 9 m out in the dark nearly vanishes).
      // He wears the gang purple without the vest: face-up on
      // dark earth, the bare shirt is what keeps his body
      // readable — the near-black vest swallowed him whole;
      // the far man 6.4 m out at (-235.3, 134.2) — he is the
      // standing target the beam lands on. His wingman stands
      // well east of the line, a separate figure in his own
      // space, never a twin beside the target and never on the ray.
      api.addPed(-236.7, 137.3, { hostile: true, gun: true, shirt: 0x6c3483, vest: false });
      api.addPed(-235.3, 134.2, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-231.8, 134.6, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      // The crowd. api.addPed returns the ped, and pinning its
      // wander speed is what keeps a browser browsing his stall
      // for the whole capture: the game's shoppers walk at up to
      // 3 m/s and think nothing of crossing a gunfight — the
      // first crowded take lost its target behind a wanderer who
      // strolled into the sightline and stood there.
      const shopper = (x, z, speed) => { const p = api.addPed(x, z, {}); if (p) p.speed = speed; };
      // Browsers along the north stall fronts, shuffling locally:
      shopper(-247, 130.5, 0.35);
      shopper(-243.5, 129.8, 0.35);
      shopper(-240, 130.8, 0.35);
      shopper(-232.5, 129.3, 0.35);
      shopper(-228.5, 129.6, 0.35);
      shopper(-225.5, 130.4, 0.35);
      // Walkers in the mid-aisle, west and east of the corridor:
      shopper(-249, 134.5, 0.9);
      shopper(-245.5, 136.5, 0.9);
      shopper(-226.5, 138.5, 0.9);
      shopper(-224.5, 135, 0.9);
      shopper(-231.5, 139.5, 0.7);
      // A pair deep at the east end, for depth:
      shopper(-220.5, 132.5, 0.5);
      shopper(-219.3, 133.8, 0.5);
      // Reactors inside the panic radius — already running when
      // the first shot lands, across the frame's edges:
      api.addPed(-243.2, 138.2, {});
      api.addPed(-241.8, 135.8, {});
      api.addPed(-233.8, 143.2, {});
      // A shopper's scooter parked at the aisle's edge east of the
      // fight, and one of the bay's hidden packages glowing further
      // down it (only the beach and pier packages are marked found,
      // so this one stays lit in the frame).
      api.parkCar("Senja Scooter", -232, 147.5, 2.2);
      api.setPackagesFound(2);
      api.parkCar("Bemo Pickup", -202, 144, 1.35);
      api.selectWeapon("smg");
      api.setWanted(2, true);
      api.spawnFootPack(2);
      api.dialogue("Laras", "LOOKOUT — CREW", "One down in the aisle! Keep firing, Raka — drop the rest before they flank the stalls!");
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
