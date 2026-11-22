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
      // On-foot combat INSIDE the night market: Raka stands in the aisle
      // between the z=126 stall row (fronts + signs facing him) and the
      // z=160 row (backs + awnings receding on the right), looking east
      // down the aisle into the Kerang Boys the clear stage spawns. The
      // aisle floor is dressed now — runner mats underfoot, goods piled
      // at both stall fronts, string lights sagging overhead — and Raka
      // stands closer to the lit row so the stalls loom over the frame.
      // FIREFIGHT STAGING: the four Kerang Boys below stand ON Raka's
      // firing line (placeOnFoot heading 2.65, so his SMG ray runs
      // (+0.472, -0.881) from (-246, 141.5)) at 4.2 m, 6.2 m, 8.2 m and
      // 10.5 m, the middle two offset half a metre to alternating sides
      // so their bodies stagger across the aisle instead of stacking
      // behind Raka's silhouette. The capture tool holds the trigger:
      // the first three go down on the mats, the fourth is still
      // standing in the line of fire with hit sparks on him and the
      // muzzle flash lit at Raka's hands, while a fifth Kerang Boy off
      // the line returns fire. Nothing is faked — it is the game's
      // real shoot() resolved frame by frame.
      api.setClock(19.3);
      api.setStats({ money: 7270, respect: 940, health: 95, armor: 27 });
      api.startJobAt(1, 1);                    // clear-the-aisles stage (spawns hostiles)
      api.placeOnFoot(-246, 141.5, 2.65);      // in the aisle, facing NE into the stall row
      api.setCamOffset(0);
      // Kerang Boys on the firing line, in SMG range of Raka.
      api.addPed(-244, 137.8, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-243.5, 135.8, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-241.7, 134.5, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-241, 132.2, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      // A fourth Kerang Boy off the line, trading shots with Raka.
      api.addPed(-234.5, 138.5, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      // Shoppers threading the aisle between the lit stalls.
      api.addPed(-252, 137.5, {});
      api.addPed(-243.5, 145, {});
      api.addPed(-256.5, 144, {});
      api.addPed(-236, 146.5, {});
      // A shopper's scooter parked in the near foreground of the aisle,
      // and one of the bay's hidden packages glowing further down it
      // (only the beach and pier packages are marked found, so this
      // one stays lit in the frame).
      api.parkCar("Senja Scooter", -253, 149, 2.6);
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
