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
      api.setRadio(0);
      api.dialogue("Sinta", "DRIVER — CREW", "Every cruiser in the bay and Air One want that orange Pelo. Forty seconds on the Strand, then you vanish.");
      break;
    }
    case "market": {
      // On-foot combat INSIDE the night market: Raka stands in the aisle
      // between the z=126 stall row (fronts + signs facing him) and the
      // z=160 row (backs + awnings receding on the right), looking east
      // down the aisle into the Kerang Boys the clear stage spawns.
      api.setClock(19.3);
      api.setStats({ money: 7270, respect: 940, health: 95, armor: 27 });
      api.startJobAt(1, 1);                    // clear-the-aisles stage (spawns hostiles)
      api.placeOnFoot(-248, 148, 2.65);        // in the aisle, facing NE into the stall row
      api.setCamOffset(0);
      // Kerang Boys posted in the aisle, already in SMG range of Raka.
      api.addPed(-236, 138, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-240, 134, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      api.addPed(-246, 132, { hostile: true, gun: true, shirt: 0x6c3483, vest: true });
      // Shoppers threading the aisle between the lit stalls.
      api.addPed(-252, 138, {});
      api.addPed(-243, 137, {});
      api.parkCar("Bemo Pickup", -156, 143, 1.35);
      api.selectWeapon("smg");
      api.setWanted(2, true);
      api.spawnFootPack(2);
      api.dialogue("Laras", "LOOKOUT — CREW", "Two down the left aisle! I've got the stall side, Raka.");
      break;
    }
    case "port": {
      // Dusk port run: chasing the Regent target car past the cranes.
      api.setClock(18.75);
      api.setStats({ money: 18450, respect: 2210, health: 76, armor: 58 });
      api.startJobAt(7, 1);                    // SENJA HEAT, wreck-the-Regent stage
      api.placeInCar("Senja Coupe", 190, 150, 0.4, 34);
      api.setCamOffset(0.38);
      api.setWanted(3, true);
      api.spawnChasePack(3, 20);
      // Dock dressing: a work van and a hatchback among the containers,
      // dockers on foot between the rows.
      api.parkCar("Angkot Van", 168, 178, -0.5);
      api.parkCar("Kijang Sprint", 232, 168, 1.2);
      api.addPed(202, 198, { cap: 0xf5c518 });
      api.addPed(216, 238, {});
      api.setRadio(2);
      api.dialogue("Bima", "MECHANIC — CREW", "The Regent is making for the hills road! Ram it before it clears the port gates.");
      break;
    }
    case "hills": {
      // On foot on the Bukit Kapur road at dusk, ledger job, looking back
      // across the whole lit bay toward the gold objective marker.
      api.setClock(18.6);
      api.setStats({ money: 11980, respect: 1340, health: 88, armor: 40 });
      api.startJobAt(4, 0);
      api.placeOnFoot(-250, -272, 0.88);
      api.parkCar("Senja Coupe", -246, -266, 0.8);
      api.parkCar("Taksi Senja", -234, -254, 0.9);
      api.addPed(-244, -268, {});
      api.addPed(-240, -262, { hat: 0xe9c46a });
      api.addPed(-237, -273, {});
      api.addPed(-230, -252, {});
      api.selectWeapon("pistol");
      api.dialogue("Laras", "LOOKOUT — CREW", "That's his car below — blue coupe, bookkeeper in the back. His escort drives fast. His brakes do not.");
      break;
    }
  }
}
