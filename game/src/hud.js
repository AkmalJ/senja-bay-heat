// hud.js — every piece of screen furniture: the mission and dispatch panels,
// weapon slots, crew abilities, health and respect, the dialogue box, the
// speed cluster, toasts, and the circular minimap drawn on a 2D canvas.

import { RANKS } from "./config.js";

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.minimap = $("minimap").getContext("2d");
    this.dialogueTimer = 0;
    this.lastDispatchHtml = "";
    this.toastTimer = 0;
    this.lastDistrict = "";
    this.districtFade = 1;
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
    if (this.lastDistrict !== d.name) { this.lastDistrict = d.name; this.districtFade = 0; }
    this.districtFade = Math.min(1, this.districtFade + dt / 0.45);
    dEl.style.opacity = (0.3 + 0.7 * this.districtFade).toFixed(2);
    dEl.style.transform = `translateY(${Math.round((1 - this.districtFade) * 10)}px)`;

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
}
