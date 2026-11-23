// hud.js — every piece of screen furniture: the mission and dispatch panels,
// weapon slots, crew abilities, health and respect, the dialogue box, the
// speed cluster, toasts, and the circular minimap drawn on a 2D canvas.

import { RANKS, DISTRICTS } from "./config.js";

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.minimap = $("minimap").getContext("2d");
    this.townMap = $("townMap").getContext("2d");
    this.dialogueTimer = 0;
    this.lastDispatchHtml = "";
    this.toastTimer = 0;
    this.lastDistrict = "";
    this.districtFade = 1;
    this.titleTimer = 0;
  }

  show(id, on) { const el = $(id); if (el) el.style.display = on ? "" : "none"; }

  toast(text, sub) {
    $("toastTitle").textContent = text;
    $("toastSub").textContent = sub || "";
    this.show("toast", true);
    this.toastTimer = 2.6;
  }

  dialogue(name, role, text, color) {
    $("dlgName").textContent = name;
    $("dlgRole").textContent = role;
    $("dlgText").textContent = text;
    $("dlgAvatar").style.background = color || "#2a9d8f";
    $("dlgAvatar").textContent = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
    this.show("dialogue", true);
    this.dialogueTimer = 6.5;
  }

  banner(title, sub) {
    $("bannerTitle").textContent = title;
    $("bannerSub").textContent = sub || "";
    this.show("banner", true);
    setTimeout(() => this.show("banner", false), 3400);
  }

  update(dt, s) {
    if (this.toastTimer > 0) { this.toastTimer -= dt; if (this.toastTimer <= 0) this.show("toast", false); }
    if (this.dialogueTimer > 0) { this.dialogueTimer -= dt; if (this.dialogueTimer <= 0) this.show("dialogue", false); }

    // Clock + money + wanted.
    const hh = String(Math.floor(s.clock)).padStart(2, "0");
    const mm = String(Math.floor((s.clock % 1) * 60)).padStart(2, "0");
    $("clock").textContent = `${hh}:${mm}`;
    $("money").textContent = "Rp" + Math.round(s.money).toLocaleString("en-US");
    let stars = "";
    for (let i = 0; i < 5; i++) stars += i < s.wanted ? "★" : "☆";
    $("stars").textContent = stars;
    $("stars").style.color = s.wanted >= 4 ? "#ff4757" : s.wanted >= 2 ? "#ffa502" : "#e8e8e8";
    $("wantedStatus").textContent =
      s.wanted === 0 ? "" :
      s.wanted >= 4 ? (s.heliActive ? "AIR UNIT DEPLOYED" : "ARMED RESPONSE") :
      s.searching ? "SEARCHING — STAY HIDDEN" : "IN SIGHT";
    $("wantedStatus").style.color = s.searching ? "#ffd32a" : "#ff6b81";

    // Rank / respect.
    let rank = RANKS[0], next = null;
    for (let i = 0; i < RANKS.length; i++) if (s.respect >= RANKS[i].at) { rank = RANKS[i]; next = RANKS[i + 1] || null; }
    $("rankName").textContent = rank.name;
    $("respectText").textContent = next ? `${s.respect} / ${next.at} RP` : `${s.respect} RP — MAX`;
    $("respectBar").style.width = (next ? ((s.respect - rank.at) / (next.at - rank.at)) * 100 : 100) + "%";

    // Side hustles: the live race line and the package count.
    if (s.activity) {
      $("activityRace").textContent = s.activity.line1;
      $("activityPack").textContent = s.activity.line2;
    }

    // Mission panel.
    if (s.mission) {
      const m = s.mission;
      $("missionKicker").textContent = `JOB ${m.index + 1}/${m.total}  •  ${m.giver.toUpperCase()}`;
      $("stageChip").textContent = `STAGE ${m.stage + 1}/${m.stageCount}`;
      $("missionTitle").textContent = m.title;
      $("missionObjective").textContent = m.objective;
      $("missionNext").innerHTML = m.next ? `<b>NEXT</b>&nbsp; ${m.next}` : (m.distance != null ? `<b>DIST</b>&nbsp; ${Math.round(m.distance)} m` : "");
      let segs = "";
      for (let i = 0; i < m.stageCount; i++) segs += `<span class="seg ${i < m.stage ? "done" : i === m.stage ? "now" : ""}"></span>`;
      $("stageSegs").innerHTML = segs;
      this.show("missionPanel", true);
    } else this.show("missionPanel", false);

    // Dispatch panel: one row per police unit, rebuilt only when it changes.
    if (s.wanted > 0 && s.dispatch.length) {
      let html = `<div class="dp-head"><span>● SBPD DISPATCH</span><span>${s.dispatch.length} UNITS • ${s.wanted}★</span></div>`;
      for (const u of s.dispatch.slice(0, 5)) {
        html += `<div class="dp-row"><span class="dp-name">${u.icon} ${u.name}</span><span class="dp-tactic ${u.cls}">${u.tactic}</span><span class="dp-dist">${Math.round(u.dist)} m</span></div>`;
      }
      if (s.dispatch.length > 5) html += `<div class="dp-more">+${s.dispatch.length - 5} more units${s.roadblockAhead ? " • roadblock ahead" : ""}</div>`;
      // The dispatcher's own voice: a narration line tied to the last
      // real event the bay produced (shots, a theft called in, units
      // converging) — it sits under the unit rows while it is fresh.
      if (s.dispatchLine) html += `<div class="dp-line">📻 &ldquo;${s.dispatchLine}&rdquo;</div>`;
      if (html !== this.lastDispatchHtml) { $("dispatchPanel").innerHTML = html; this.lastDispatchHtml = html; }
      this.show("dispatchPanel", true);
    } else { this.show("dispatchPanel", false); this.lastDispatchHtml = ""; }

    // Weapons.
    let wh = "";
    for (const w of s.weapons) {
      wh += `<div class="wslot ${w.active ? "active" : ""} ${w.locked ? "locked" : ""}"><span class="wkey">${w.slot}</span><span class="wname">${w.name}</span><span class="wammo">${w.locked ? "LOCKED" : w.ammoText}</span></div>`;
    }
    $("weaponSlots").innerHTML = wh;

    // Crew abilities.
    let ch = "";
    for (const c of s.crew) {
      const pct = c.ready ? 100 : Math.round((1 - c.left / c.cooldown) * 100);
      ch += `<div class="crew ${c.ready ? "" : "cooling"}"><span class="ckey">${c.keyLabel}</span><div class="cinfo"><b>${c.ability}</b><i>${c.name} • ${c.role}</i></div><span class="ccd">${c.ready ? "READY" : Math.ceil(c.left) + "s"}</span><span class="cbar" style="width:${pct}%"></span></div>`;
    }
    $("crewPanel").innerHTML = ch;

    // Health / armour / district.
    $("healthBar").style.width = Math.max(0, s.health) + "%";
    $("healthText").textContent = Math.ceil(Math.max(0, s.health));
    $("armorBar").style.width = Math.max(0, s.armor) + "%";
    $("armorText").textContent = Math.ceil(Math.max(0, s.armor));
    const d = s.district;
    $("districtName").textContent = d.name.toUpperCase();
    $("districtSub").textContent = d.sub;
    $("turfLabel").textContent = d.turf;
    $("turfBar").style.width = s.turfValue + "%";
    // District banner: on a district change the name block rises and
    // fades in, the way location cards do in the games that inspired us.
    const dEl = $("districtBox");
    if (this.lastDistrict !== d.name) {
      this.lastDistrict = d.name; this.districtFade = 0;
      // District-entry title card: the name, big and centre-top in
      // the senja serif, the way a travel poster announces a town.
      // Staged screenshot scenes skip it — their frames are composed
      // without a title card crossing them.
      if (!s.stage) {
        $("districtTitleName").textContent = d.name.toUpperCase();
        $("districtTitleSub").textContent = d.sub.toUpperCase();
        this.titleTimer = 3.6;
      }
    }
    this.districtFade = Math.min(1, this.districtFade + dt / 0.45);
    dEl.style.opacity = (0.3 + 0.7 * this.districtFade).toFixed(2);
    dEl.style.transform = `translateY(${Math.round((1 - this.districtFade) * 10)}px)`;
    // Title card phases: 0.5 s rising in, a long hold, 0.8 s fading.
    const tEl = $("districtTitle");
    if (this.titleTimer > 0) {
      this.titleTimer -= dt;
      const t = this.titleTimer;
      const op = t > 3.1 ? (3.6 - t) / 0.5 : t < 0.8 ? t / 0.8 : 1;
      const rise = t > 3.1 ? (t - 3.1) / 0.5 : 0;
      tEl.style.opacity = Math.max(0, Math.min(1, op)).toFixed(2);
      tEl.style.transform = `translateX(-50%) translateY(${Math.round(rise * 14)}px)`;
      if (this.titleTimer <= 0) tEl.style.opacity = "0";
    }

    // Speed cluster.
    if (s.inCar) {
      this.show("speedBox", true);
      $("speedValue").textContent = Math.round(s.speedKmh);
      $("vehicleName").textContent = s.vehicleName.toUpperCase();
      $("conditionBar").style.width = Math.max(0, s.condition) + "%";
      $("conditionText").textContent = Math.round(Math.max(0, s.condition)) + "% " + (s.condition < 30 ? "WRECKED" : s.condition < 65 ? "DENTED" : "CLEAN");
      $("radioLine").textContent = `♪ ${s.radio.name} ${s.radio.freq} — ${s.radio.track}`;
    } else this.show("speedBox", false);

    this.drawMinimap(s);
  }

  drawMinimap(s) {
    const g = this.minimap, W = 230, C = W / 2, scale = W / 340;
    g.clearRect(0, 0, W, W);
    g.save();
    g.beginPath(); g.arc(C, C, C - 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = "#274b63"; g.fillRect(0, 0, W, W);
    const px = (x) => C + (x - s.focus.x) * scale;
    const pz = (z) => C + (z - s.focus.z) * scale;
    // Land, beach and sea to the east.
    g.fillStyle = "#7d9b6a"; g.fillRect(0, 0, W, W);
    g.fillStyle = "#eed9a0"; g.fillRect(px(290), 0, W, W);
    g.fillStyle = "#1d7fa8"; g.fillRect(px(390), 0, W, W);
    // Blocks.
    g.fillStyle = "#93a983";
    for (let bx = -380; bx < 380; bx += 95) for (let bz = -380; bz < 380; bz += 95) {
      g.fillRect(px(bx + 14), pz(bz + 14), 67 * scale, 67 * scale);
    }
    // Roads.
    g.strokeStyle = "#3a3f45"; g.lineWidth = 22 * scale;
    for (let l = -285; l <= 285; l += 95) {
      g.beginPath(); g.moveTo(px(l), 0); g.lineTo(px(l), W); g.stroke();
      g.beginPath(); g.moveTo(0, pz(l)); g.lineTo(W, pz(l)); g.stroke();
    }
    g.strokeStyle = "#f7d154"; g.lineWidth = 1; g.setLineDash([4, 4]);
    for (let l = -285; l <= 285; l += 95) {
      g.beginPath(); g.moveTo(px(l), 0); g.lineTo(px(l), W); g.stroke();
      g.beginPath(); g.moveTo(0, pz(l)); g.lineTo(W, pz(l)); g.stroke();
    }
    g.setLineDash([]);
    const dot = (x, z, color, r) => { g.fillStyle = color; g.beginPath(); g.arc(px(x), pz(z), r, 0, Math.PI * 2); g.fill(); };
    for (const c of s.mapCars) dot(c.x, c.z, "#cfd8dc", 2);
    for (const c of s.mapPolice) dot(c.x, c.z, (Date.now() % 600 < 300) ? "#ff2222" : "#2266ff", 3.4);
    for (const h of s.mapHostiles) dot(h.x, h.z, "#ff4757", 3);
    if (s.mapTarget) {
      dot(s.mapTarget.x, s.mapTarget.z, "#ffe14d", 5);
      g.strokeStyle = "#ffe14d"; g.lineWidth = 2;
      g.beginPath(); g.arc(px(s.mapTarget.x), pz(s.mapTarget.z), 8 + Math.sin(Date.now() / 300) * 2, 0, Math.PI * 2); g.stroke();
    }
    // Player arrow.
    g.save();
    g.translate(px(s.focus.x), pz(s.focus.z)); g.rotate(-s.focus.heading);
    g.fillStyle = "#ffffff"; g.strokeStyle = "#111"; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(0, -8); g.lineTo(5.5, 6); g.lineTo(0, 3); g.lineTo(-5.5, 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
    // North + safehouse/garage glyphs.
    g.fillStyle = "#fff"; g.font = "bold 13px system-ui"; g.fillText("N", C - 4, 18);
    g.font = "11px system-ui"; g.fillText("🏠", px(285) - 6, pz(-60) + 4);
    g.fillText("⛽", px(-120) - 6, pz(-190) + 4);
    g.restore();
    g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 3;
    g.beginPath(); g.arc(C, C, C - 2, 0, Math.PI * 2); g.stroke();
  }

  // The town board (Tab): a hand-drawn travel-poster map of the whole
  // bay on parchment, with the runner's ledger beside it. Drawn fresh
  // each frame the board is open — the world is paused underneath, so
  // this is the one screen the game holds perfectly still.
  drawMap(m) {
    const g = this.townMap, W = 760;
    const px = (x) => x + 380, pz = (z) => z + 380;
    // Parchment land, the strand's sand, the bay itself.
    g.fillStyle = "#e7d9ae"; g.fillRect(0, 0, W, W);
    g.fillStyle = "#c9cf9d";
    for (let bx = -380; bx < 380; bx += 95) for (let bz = -380; bz < 380; bz += 95) {
      if (bx + 47 > 290) continue;
      g.fillRect(px(bx + 14), pz(bz + 14), 67, 67);
    }
    g.fillStyle = "#efdda3"; g.fillRect(px(290), 0, px(340) - px(290), W);
    const sea = g.createLinearGradient(px(340), 0, W, 0);
    sea.addColorStop(0, "#3d93ad"); sea.addColorStop(1, "#1f6180");
    g.fillStyle = sea; g.fillRect(px(340), 0, W - px(340), W);
    g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const wy = 90 + i * 100;
      g.beginPath();
      for (let x = px(352); x <= W - 14; x += 14) g.lineTo(x, wy + Math.sin(x / 26 + i * 1.7) * 4);
      g.stroke();
    }
    // Bukit Kapur: hand-drawn contour rings in the north-west.
    g.strokeStyle = "rgba(120,96,52,0.5)"; g.lineWidth = 2;
    for (let r = 26; r <= 104; r += 26) { g.beginPath(); g.arc(px(-230), pz(-260), r, 0, Math.PI * 2); g.stroke(); }
    // The road grid: ink lines with a dashed amber heart.
    g.strokeStyle = "#4c4234"; g.lineWidth = 15;
    for (let l = -285; l <= 285; l += 95) {
      g.beginPath(); g.moveTo(px(l), 0); g.lineTo(px(l), W); g.stroke();
      g.beginPath(); g.moveTo(0, pz(l)); g.lineTo(W, pz(l)); g.stroke();
    }
    g.strokeStyle = "#c9962e"; g.lineWidth = 1.6; g.setLineDash([7, 7]);
    for (let l = -285; l <= 285; l += 95) {
      g.beginPath(); g.moveTo(px(l), 0); g.lineTo(px(l), W); g.stroke();
      g.beginPath(); g.moveTo(0, pz(l)); g.lineTo(W, pz(l)); g.stroke();
    }
    g.setLineDash([]);
    // The ferry pier and the safehouse corner get their glyphs.
    g.font = "17px system-ui"; g.fillText("⛴", px(336) - 8, pz(40) + 6);
    g.fillText("🏠", px(285) - 8, pz(-60) + 6);
    // District names, lettered onto the map like a poster — each
    // with a parchment halo stroked behind the letters, so the ink
    // road lines pass under the words without breaking them.
    g.textAlign = "center";
    for (const d of DISTRICTS) {
      const x = px(d.x), y = pz(d.z);
      g.font = "700 19px Georgia, serif";
      g.lineJoin = "round"; g.strokeStyle = "#e7d9ae"; g.lineWidth = 7;
      g.strokeText(d.name.toUpperCase(), x, y - 14);
      g.fillStyle = "#2c2115";
      g.fillText(d.name.toUpperCase(), x, y - 14);
      g.font = "italic 12.5px Georgia, serif";
      g.lineWidth = 5; g.strokeText(d.sub + "  •  " + d.turf.toLowerCase(), x, y + 24);
      g.fillStyle = "#6b543a";
      g.fillText(d.sub + "  •  " + d.turf.toLowerCase(), x, y + 24);
      g.fillStyle = "#8a2f1d";
      g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill();
    }
    g.textAlign = "left";
    // Dots clamp to the sheet: a package out on the pier (x 432)
    // still gets its mark, pinned to the map's edge.
    const dot = (x, z, color, r) => {
      const cx = Math.max(8, Math.min(W - 8, px(x))), cy = Math.max(8, Math.min(W - 8, pz(z)));
      g.fillStyle = color; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    };
    for (const p of m.mapPackages) dot(p.x, p.z, "#0e9db8", 4);
    for (const c of m.mapPolice) dot(c.x, c.z, (Date.now() % 600 < 300) ? "#d42a1e" : "#2456c8", 4.5);
    for (const h of m.mapHostiles) dot(h.x, h.z, "#d42a1e", 4);
    if (m.mapTarget) {
      dot(m.mapTarget.x, m.mapTarget.z, "#e8a812", 6);
      g.strokeStyle = "#e8a812"; g.lineWidth = 2.5;
      g.beginPath(); g.arc(px(m.mapTarget.x), pz(m.mapTarget.z), 10 + Math.sin(Date.now() / 300) * 2.5, 0, Math.PI * 2); g.stroke();
    }
    // The runner himself.
    g.save();
    g.translate(px(m.focus.x), pz(m.focus.z)); g.rotate(-m.focus.heading);
    g.fillStyle = "#ffffff"; g.strokeStyle = "#1c150c"; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(0, -11); g.lineTo(7.5, 8); g.lineTo(0, 4); g.lineTo(-7.5, 8); g.closePath(); g.fill(); g.stroke();
    g.restore();
    // Compass + the cartouche, lettered over the bay itself.
    g.fillStyle = "#2c2115"; g.font = "700 15px Georgia, serif";
    g.fillText("N ↑", W - 52, 30);
    g.font = "italic 13.5px Georgia, serif"; g.fillStyle = "rgba(240,230,200,0.9)";
    g.textAlign = "right";
    g.fillText("teluk senja — where the light stays", W - 18, W - 18);
    g.textAlign = "left";

    // ---- the ledger side ----
    let rank = RANKS[0];
    for (let i = 0; i < RANKS.length; i++) if (m.respect >= RANKS[i].at) rank = RANKS[i];
    $("boardName").textContent = `RAKA — ${rank.name}`;
    const racesWon = m.races.filter((r) => r.best != null).length;
    const pct = Math.round(100 * ((m.jobsDone / m.jobsTotal) + (m.packages / m.packagesTotal) + (racesWon / m.races.length)) / 3);
    $("completionPct").textContent = pct + "%";
    $("completionBar").style.width = pct + "%";
    const heat = m.wanted > 0 ? "★".repeat(m.wanted) + " — SBPD ACTIVE" : "CLEAN";
    const cell = (k, v) => `<span class="k">${k}</span><span class="v">${v}</span>`;
    $("statGrid").innerHTML =
      cell("UANG", "Rp" + Math.round(m.money).toLocaleString("en-US")) +
      cell("RESPECT", m.respect + " RP") +
      cell("STORY JOBS", `${m.jobsDone} / ${m.jobsTotal}`) +
      cell("HIDDEN PACKAGES", `${m.packages} / ${m.packagesTotal}`) +
      cell("CARS LIFTED", String(m.stolen)) +
      cell("RACES WON", `${racesWon} / ${m.races.length}`) +
      cell("DISTRICT", m.district.name.toUpperCase()) +
      cell("HEAT", heat);
    const av = (label, color) => `<span class="avatar" style="background:${color}">${label}</span>`;
    let crew = `<div class="crewRow">${av("R", "#0d5c63")}<div class="who"><b>RAKA</b><i>That's you — the hands</i></div><span class="abil">DRIVES • SHOOTS • RUNS</span></div>`;
    const crewColors = ["#d8493b", "#2e7fd9", "#2a9d8f"];
    m.crew.forEach((c, i) => {
      crew += `<div class="crewRow">${av(c.name[0], crewColors[i % crewColors.length])}<div class="who"><b>${c.name.toUpperCase()}</b><i>${c.role} — crew</i></div><span class="abil">${c.ability}</span></div>`;
    });
    $("crewList").innerHTML = crew;
    $("raceList").innerHTML = m.races.map((r) =>
      `<div class="raceRow"><span class="rn">🏁 ${r.name}</span><span class="rb ${r.best == null ? "none" : ""}">${r.best == null ? "not run — par " + r.par + " s" : r.best.toFixed(1) + " s"}</span></div>`).join("");
  }
}
