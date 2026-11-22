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
      // On-foot combat INSIDE the night market, staged for READABILITY:
      // full night (21.6) so the muzzle light, tracers and hit sparks
      // carry against the dark, and the whole fight pulled in tight
      // around Raka in the z=143 aisle, the lit z=126 stall fronts
      // as the backdrop. Raka fills the lower-centre foreground
      // from the game's own follow camera.
      // FIREFIGHT GEOMETRY (placeOnFoot heading 3π/4, so the SMG
      // ray runs (+0.707, -0.707) out of (-238, 141.5); screen-
      // right along the ray is (+0.707, +0.707)). Every placement
      // below is dictated by how the dead actually fall in this
      // game — measured, not guessed: a dropped man tips forward
      // around his feet and comes to rest lying along world +Z
      // from where he stood (bounding box ~2.0 m in Z, ~1.1 m in
      // X, top edge ~0.75 m up, whatever he was facing). Two
      // consequences. First, the fight runs NE at 45°, never due
      // north: pointing at the camera, a corpse foreshortens
      // into a blob behind Raka's legs; across the view, the
      // same corpse stretches over the mats where a body reads
      // as a body. (The stall signs, which face +Z, still read
      // at 45° — the ES KELAPA stall stands on the ray itself.)
      // Second, the first kill stands FAR down the ray: his
      // corpse reaches ~1.4 m back toward Raka and ~1.4 m to
      // screen-right of where he stood, so a man dropped at
      // spitting distance ends up sprawled across Raka's gun
      // arm, masquerading as part of it. Dropped at 5 m, the
      // body lands clear of the silhouette, in the open.
      //   A (-234.0, 138.4) — 5.0 m down the ray, 0.6 m screen-
      //     right of it: the first kill. His corpse comes to rest
      //     at (t≈3.6–5.0, s≈0.6–2.0), fully clear of Raka's
      //     outline, muzzle light raking it every time the gun
      //     fires past him — and it lands on the TEAL runner
      //     (x −241.8…−229.2), not the burgundy one the fight
      //     used to sit on: a dark purple body on dark red
      //     pattern is camouflage, on teal it stands out. The
      //     whole fight shifted one mat east for that contrast;
      //     the backdrop sign on the ray is now ES KELAPA.
      //   B (-232.3, 136.5) — 7.6 m down the ray, 0.5 m screen-
      //     right: the second kill, and the live target while A
      //     is going down, his burst stacking over A's body. The
      //     offset matters for the living too — dead-centre on
      //     the ray he hides behind Raka's silhouette and only
      //     his head peeks over it, sparks and all; half a metre
      //     to the side, his shoulder, gun arm and the burst on
      //     his chest clear Raka's outline. His corpse reaches
      //     back onto the same teal runner.
      //   C (-230.8, 133.9) — 10.5 m down the ray, a step
      //     screen-left: the next man in line, depth behind B,
      //     already returning fire — once B drops, the fire
      //     walks on to him.
      //   D (-234.4, 133.1) — off the line by the stall fronts,
      //     screen-left: trades shots with Raka the whole time
      //     (his hits land as red bursts on Raka — the game's real
      //     hostile fire, nothing posed).
      // The capture tool holds the trigger on the real shoot() and
      // picks from the frames where tracers, spark bursts and the
      // downed men share the frame. Clock 21.6, not 20.2: at 20.2
      // the dusk band still floats the whole scene up into evening
      // blue and the firelight drowns in it — 21.6 is past the band,
      // true night, when the market's own signs and string lights
      // (all unlit materials) take over the frame and every tracer
      // and spark stands out against the dark.
      api.setClock(21.6);
      api.setStats({ money: 7270, respect: 940, health: 100, armor: 80 });
      api.startJobAt(1, 1);                    // clear-the-aisles stage (spawns hostiles)
      api.placeOnFoot(-238, 141.5, Math.PI * 0.75); // on the teal runner, facing NE across the aisle
      api.setCamOffset(0);
      // Kerang Boys on and around the firing line, in SMG range.
      api.addPed(-234.0, 138.4, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-232.3, 136.5, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-230.8, 133.9, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-234.4, 133.1, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      // Shoppers kept south and west of the fight, out of the line.
      api.addPed(-244, 138, {});
      api.addPed(-233, 149, {});
      api.addPed(-227, 149.5, {});
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
      api.dialogue("Laras", "LOOKOUT — CREW", "They're dropping in the aisle! Keep firing, Raka — the rest are pinned by the stalls!");
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
