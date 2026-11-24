// hud.js — every piece of screen furniture the player reads: the
// mission and dispatch panels, weapon slots, crew cards, the
// district block, health and armour, the dialogue box, the speed
// cluster, and two canvases — the circular minimap that rides the
// player's shoulder and the parchment town board behind TAB.
// The class only ever renders a `view` object main.js hands it;
// it owns no game state of its own beyond panel timers.

import { RANKS, DISTRICTS } from "./config.js";

const el = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.minimap = el("minimap").getContext("2d");
    this.townMap = el("townMap").getContext("2d");
    this.dialogueTimer = 0;
    this.toastTimer = 0;
    this.lastDispatchHtml = "";
    this.lastDistrict = "";
    this.districtFade = 1;
    this.titleTimer = 0;
  }

  show(id, on) { const n = el(id); if (n) n.style.display = on ? "" : "none"; }

  toast(text, sub) {
    el("toastTitle").textContent = text;
    el("toastSub").textContent = sub || "";
    this.show("toast", true);
    this.toastTimer = 2.6;
  }

  dialogue(name, role, text, color) {
    el("dlgName").textContent = name;
    el("dlgRole").textContent = role;
    el("dlgText").textContent = text;
    const av = el("dlgAvatar");
    av.style.background = color || "#2a9d8f";
    av.textContent = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
    this.show("dialogue", true);
    this.dialogueTimer = 6.5;
  }

  banner(title, sub) {
    el("bannerTitle").textContent = title;
    el("bannerSub").textContent = sub || "";
    this.show("banner", true);
    setTimeout(() => this.show("banner", false), 3400);
  }

  rankFor(respect) {
    let rank = RANKS[0], next = null;
    for (let i = 0; i < RANKS.length; i++) if (respect >= RANKS[i].at) { rank = RANKS[i]; next = RANKS[i + 1] || null; }
    return { rank, next };
  }

  update(dt, v) {
    if (this.toastTimer > 0) { this.toastTimer -= dt; if (this.toastTimer <= 0) this.show("toast", false); }
    if (this.dialogueTimer > 0) { this.dialogueTimer -= dt; if (this.dialogueTimer <= 0) this.show("dialogue", false); }

    // Clock, money, wanted.
    const hh = String(Math.floor(v.clock)).padStart(2, "0");
    const mm = String(Math.floor((v.clock % 1) * 60)).padStart(2, "0");
    el("clock").textContent = `${hh}:${mm}`;
    el("money").textContent = "Rp" + Math.round(v.money).toLocaleString("en-US");
    let stars = "";
    for (let i = 0; i < 5; i++) stars += i < v.wanted ? "★" : "☆";
    const starsEl = el("stars");
    starsEl.textContent = stars;
    starsEl.style.color = v.wanted >= 4 ? "#ff4757" : v.wanted >= 2 ? "#ffa502" : "#e8e8e8";
    const status = el("status");
    status.textContent =
      v.wanted === 0 ? "" :
      v.wanted >= 4 ? (v.heliActive ? "AIR UNIT DEPLOYED" : "ARMED RESPONSE") :
      v.searching ? "SEARCHING — STAY HIDDEN" : "IN SIGHT";
    status.style.color = v.searching ? "#ffd32a" : "#ff6b81";

    // Rank and respect.
    const { rank, next } = this.rankFor(v.respect);
    el("rankName").textContent = rank.name;
    el("respectText").textContent = next ? `${v.respect} / ${next.at} RP` : `${v.respect} RP — MAX`;
    el("respectBar").style.width = (next ? ((v.respect - rank.at) / (next.at - rank.at)) * 100 : 100) + "%";

    // Side hustles.
    if (v.activity) {
      el("activityRace").textContent = v.activity.line1;
      el("activityPack").textContent = v.activity.line2;
    }

    // Mission panel.
    if (v.mission) {
      const m = v.mission;
      el("missionKicker").textContent = `JOB ${m.index + 1}/${m.total}  •  ${m.giver.toUpperCase()}`;
      el("stageChip").textContent = `STAGE ${m.stage + 1}/${m.stageCount}`;
      el("missionTitle").textContent = m.title;
      el("missionObjective").textContent = m.objective;
      el("missionNext").innerHTML = m.next ? `<b>NEXT</b>&nbsp; ${m.next}` : (m.distance != null ? `<b>DIST</b>&nbsp; ${Math.round(m.distance)} m` : "");
      let segs = "";
      for (let i = 0; i < m.stageCount; i++) segs += `<span class="seg ${i < m.stage ? "done" : i === m.stage ? "now" : ""}"></span>`;
      el("stageSegs").innerHTML = segs;
      this.show("missionPanel", true);
    } else this.show("missionPanel", false);

    // Dispatch board: rebuilt only when its text actually changes.
    if (v.wanted > 0 && v.dispatch && v.dispatch.length) {
      let html = `<div class="dp-head"><span>● SBPD DISPATCH</span><span>${v.dispatch.length} UNITS • ${v.wanted}★</span></div>`;
      for (const u of v.dispatch.slice(0, 5)) {
        html += `<div class="dp-row"><span class="dp-name">▲ ${u.name}</span><span class="dp-tac ${u.cls}">${u.tactic}</span><span class="dp-dist">${Math.round(u.dist)} m</span></div>`;
      }
      if (v.dispatch.length > 5) html += `<div class="dp-more">+${v.dispatch.length - 5} more units${v.roadblockAhead ? " • roadblock ahead" : ""}</div>`;
      if (v.dispatchLine) html += `<div class="dp-line">📻 &ldquo;${v.dispatchLine}&rdquo;</div>`;
      if (html !== this.lastDispatchHtml) { el("dispatchPanel").innerHTML = html; this.lastDispatchHtml = html; }
      this.show("dispatchPanel", true);
    } else { this.show("dispatchPanel", false); this.lastDispatchHtml = ""; }

    // Weapon slots.
    let wh = "";
    for (const w of v.weapons) {
      wh += `<div class="wslot ${w.active ? "active" : ""} ${w.locked ? "locked" : ""}"><span class="wkey">${w.slot}</span><span class="wname">${w.name}</span><span class="wammo">${w.locked ? "LOCKED" : w.ammoText}</span></div>`;
    }
    el("weaponSlots").innerHTML = wh;

    // Crew cards.
    let ch = "";
    for (const c of v.crew) {
      const pct = c.ready ? 100 : Math.round((1 - c.left / c.cooldown) * 100);
      ch += `<div class="crew ${c.ready ? "" : "cooling"}"><span class="ckey">${c.keyLabel}</span><div class="cinfo"><b>${c.ability}</b><i>${c.name} • ${c.role}</i></div><span class="ccd">${c.ready ? "READY" : Math.ceil(c.left) + "s"}</span><span class="cbar" style="width:${pct}%"></span></div>`;
    }
    el("crewPanel").innerHTML = ch;

    // Health, armour, district.
    el("healthBar").style.width = Math.max(0, v.health) + "%";
    el("healthText").textContent = Math.ceil(Math.max(0, v.health));
    el("armorBar").style.width = Math.max(0, v.armour) + "%";
    el("armorText").textContent = Math.ceil(Math.max(0, v.armour));
    const d = v.district;
    el("districtName").textContent = d.name.toUpperCase();
    el("districtSub").textContent = d.sub;
    el("turfLabel").textContent = d.turf;
    el("turfBar").style.width = v.turfValue + "%";
    const dBox = el("districtBox");
    if (this.lastDistrict !== d.name) {
      this.lastDistrict = d.name;
      this.districtFade = 0;
      if (!v.stage) {
        el("districtTitleName").textContent = d.name.toUpperCase();
        el("districtTitleSub").textContent = d.sub.toUpperCase();
        this.titleTimer = 3.6;
      }
    }
    this.districtFade = Math.min(1, this.districtFade + dt / 0.45);
    dBox.style.opacity = (0.3 + 0.7 * this.districtFade).toFixed(2);
    dBox.style.transform = `translateY(${Math.round((1 - this.districtFade) * 10)}px)`;
    const tEl = el("districtTitle");
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
    if (v.inCar) {
      this.show("speedBox", true);
      el("speedValue").textContent = Math.round(v.speedKmh);
      el("vehicleName").textContent = v.vehicleName.toUpperCase();
      el("conditionBar").style.width = Math.max(0, v.condition) + "%";
      el("conditionText").textContent = Math.round(Math.max(0, v.condition)) + "% " + (v.condition < 30 ? "WRECKED" : v.condition < 65 ? "DENTED" : "CLEAN");
      el("radioLine").textContent = `♪ ${v.radio.name} ${v.radio.freq} — ${v.radio.track}`;
    } else this.show("speedBox", false);

    this.drawMinimap(v);
  }

  drawMinimap(v) {
    const g = this.minimap, W = 230, C = W / 2, scale = W / 340;
    const px = (x) => C + (x - v.focus.x) * scale;
    const pz = (z) => C + (z - v.focus.z) * scale;
    g.clearRect(0, 0, W, W);
    g.save();
    g.beginPath(); g.arc(C, C, C - 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = "#7d9b6a"; g.fillRect(0, 0, W, W);
    g.fillStyle = "#eed9a0"; g.fillRect(px(296), 0, W, W);
    g.fillStyle = "#1d7fa8"; g.fillRect(px(388), 0, W, W);
    g.fillStyle = "#93a983";
    for (let bx = -380; bx < 380; bx += 95) for (let bz = -380; bz < 380; bz += 95) {
      g.fillRect(px(bx + 14), pz(bz + 14), 67 * scale, 67 * scale);
    }
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
    for (const c of v.mapCars) dot(c.x, c.z, "#cfd8dc", 2);
    for (const c of v.mapPolice) dot(c.x, c.z, (Date.now() % 600 < 300) ? "#ff2222" : "#2266ff", 3.4);
    for (const h of v.mapHostiles) dot(h.x, h.z, "#ff4757", 3);
    if (v.mapTarget) {
      dot(v.mapTarget.x, v.mapTarget.z, "#ffe14d", 5);
      g.strokeStyle = "#ffe14d"; g.lineWidth = 2;
      g.beginPath(); g.arc(px(v.mapTarget.x), pz(v.mapTarget.z), 8 + Math.sin(Date.now() / 300) * 2, 0, Math.PI * 2); g.stroke();
    }
    g.save();
    g.translate(px(v.focus.x), pz(v.focus.z)); g.rotate(-v.focus.heading);
    g.fillStyle = "#ffffff"; g.strokeStyle = "#111"; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(0, -8); g.lineTo(5.5, 6); g.lineTo(0, 3); g.lineTo(-5.5, 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.fillStyle = "#fff"; g.font = "bold 13px system-ui"; g.fillText("N", C - 4, 18);
    g.font = "11px system-ui";
    g.fillText("🏠", px(285) - 6, pz(-60) + 4);
    g.fillText("⛽", px(-120) - 6, pz(-190) + 4);
    g.restore();
    g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 3;
    g.beginPath(); g.arc(C, C, C - 2, 0, Math.PI * 2); g.stroke();
  }

  // The town board: a parchment sheet of the whole bay with the
  // runner's ledger lettered beside it in the page's DOM. The world
  // pauses underneath while it is open, so this is the one screen
  // the game holds perfectly still.
  drawMap(m) {
    const g = this.townMap, W = 760;
    const px = (x) => x + 380, pz = (z) => z + 380;
    g.fillStyle = "#e7d9ae"; g.fillRect(0, 0, W, W);
    g.fillStyle = "#c9cf9d";
    for (let bx = -380; bx < 380; bx += 95) for (let bz = -380; bz < 380; bz += 95) {
      if (bx + 47 > 290) continue;
      g.fillRect(px(bx + 14), pz(bz + 14), 67, 67);
    }
    g.fillStyle = "#efdda3"; g.fillRect(px(296), 0, px(340) - px(296), W);
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
    // Bukit Kapur's contour rings, hand-inked in the north-west.
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
    g.font = "17px system-ui";
    g.fillText("⛴", px(336) - 8, pz(40) + 6);
    g.fillText("🏠", px(285) - 8, pz(-60) + 6);
    // District names lettered on like a travel poster, each with a
    // parchment halo so the ink roads pass under the words.
    g.textAlign = "center";
    for (const d of DISTRICTS) {
      const x = px(d.x), y = pz(d.z);
      g.font = "700 19px Georgia, serif";
      g.lineJoin = "round"; g.strokeStyle = "#e7d9ae"; g.lineWidth = 7;
      g.strokeText(d.name.toUpperCase(), x, y - 14);
      g.fillStyle = "#2c2115";
      g.fillText(d.name.toUpperCase(), x, y - 14);
      g.font = "italic 12.5px Georgia, serif";
      g.lineWidth = 5;
      g.strokeText(d.sub + "  •  " + d.turf.toLowerCase(), x, y + 24);
      g.fillStyle = "#6b543a";
      g.fillText(d.sub + "  •  " + d.turf.toLowerCase(), x, y + 24);
      g.fillStyle = "#8a2f1d";
      g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill();
    }
    g.textAlign = "left";
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
    g.save();
    g.translate(px(m.focus.x), pz(m.focus.z)); g.rotate(-m.focus.heading);
    g.fillStyle = "#ffffff"; g.strokeStyle = "#1c150c"; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(0, -11); g.lineTo(7.5, 8); g.lineTo(0, 4); g.lineTo(-7.5, 8); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.fillStyle = "#2c2115"; g.font = "700 15px Georgia, serif";
    g.fillText("N ↑", W - 52, 30);
    g.font = "italic 13.5px Georgia, serif"; g.fillStyle = "rgba(240,230,200,0.9)";
    g.textAlign = "right";
    g.fillText("teluk senja — where the light stays", W - 18, W - 18);
    g.textAlign = "left";

    // ---- the ledger side (DOM) ----
    const { rank } = this.rankFor(m.respect);
    el("boardName").textContent = `RAKA — ${rank.name}`;
    el("completionPct").textContent = m.completion + "%";
    el("completionBar").style.width = m.completion + "%";
    const heat = m.wanted > 0 ? "★".repeat(m.wanted) + " — SBPD ACTIVE" : "CLEAN";
    const cell = (k, val) => `<span class="k">${k}</span><span class="v">${val}</span>`;
    el("statGrid").innerHTML =
      cell("UANG", "Rp" + Math.round(m.money).toLocaleString("en-US")) +
      cell("RESPECT", m.respect + " RP") +
      cell("STORY JOBS", `${m.jobsDone} / ${m.jobsTotal}`) +
      cell("HIDDEN PACKAGES", `${m.packages} / ${m.packagesTotal}`) +
      cell("CARS LIFTED", String(m.stolen)) +
      cell("RACES WON", `${m.racesWon} / ${m.racesTotal}`) +
      cell("DISTRICT", m.district.name.toUpperCase()) +
      cell("HEAT", heat);
    const av = (label, color) => `<span class="avatar" style="background:${color}">${label}</span>`;
    let crew = `<div class="crewRow">${av("R", "#0d5c63")}<div class="who"><b>RAKA</b><i>That's you — the hands</i></div><span class="abil">DRIVES • SHOOTS • RUNS</span></div>`;
    m.crew.forEach((c) => {
      crew += `<div class="crewRow">${av(c.name[0], c.color)}<div class="who"><b>${c.name}</b><i>${c.role} — crew</i></div><span class="abil">${c.ability}</span></div>`;
    });
    el("crewList").innerHTML = crew;
    el("raceList").innerHTML = m.races.map((r) =>
      `<div class="raceRow"><span class="rn">🏁 ${r.name}</span><span class="rb ${r.best == null ? "none" : ""}">${r.best == null ? "not run — par " + r.par + " s" : r.best.toFixed(1) + " s"}</span></div>`).join("");
  }
}
