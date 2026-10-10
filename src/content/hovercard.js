(() => {
  const { settings: store, room, analysis, playstyle, format, icons, dom } = globalThis.FB;
  const { escape, round, fixed, signed, mapName, matches } = format;

  const HOST_ID = `${dom.OWN_PREFIX}-card`;
  const CARD_SELECTOR = '[class*="styles__Holder"]';
  const ROW_SELECTOR = ".fb-room-stats[data-player]";
  const SHOW_DELAY = 280;
  const WIDTH = 300;
  const GAP = 10;

  // Bar scales for the playstyle meters; the marker shows the average player.
  const METERS = [
    { key: "entryRate", label: "Opening duels", max: 0.35, value: r => `${Math.round(r.entryRate * 100)}% of rounds` },
    { key: "clutchRate", label: "Alone in 1vX", max: 0.12, value: r => `${Math.round(r.clutchRate * 100)}% of rounds` },
    { key: "flashRate", label: "Flashes", max: 0.9, value: r => `${r.flashRate.toFixed(2)} / round` },
    { key: "sniperShare", label: "AWP kills", max: 0.6, value: r => `${Math.round(r.sniperShare * 100)}% of kills` }
  ];

  const CSS = `
    :host {
      all: initial;
      --surface-0: var(--f-surface-level-1, #121212);
      --surface-1: var(--f-surface-level-2, #1d1d1d);
      --surface-2: var(--f-surface-level-3, #242424);
      --line: var(--f-surface-level-4, #2e2e2e);
      --text: var(--f-white-full, #f1f1f1);
      --muted: var(--f-white-medium, #a7a7a7);
      --accent: var(--f-core-primary-enabled, #ff4b00);
      --good: color-mix(in oklch, var(--f-common-outcome-win, #05ff00) 85%, white);
      --bad: color-mix(in oklch, var(--f-common-outcome-loss, #ef0000) 90%, white);
      --mid: color-mix(in oklch, var(--f-common-caution, #ffc700) 90%, white);
      --radius: calc(1px * var(--fb-radius-scale, 1));
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .good { color: var(--good); }
    .bad { color: var(--bad); }
    .mid { color: var(--mid); }

    .card {
      position: fixed;
      z-index: 2147483002;
      width: ${WIDTH}px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: calc(12 * var(--radius));
      background: var(--surface-0);
      box-shadow: 0 14px 40px rgba(0, 0, 0, .55);
      font: 12px/1.4 var(--f-font-family, "Segoe UI", sans-serif);
      color: var(--text);
      pointer-events: none;
      animation: pop .14s ease;
    }
    @keyframes pop { from { opacity: 0; transform: translateY(4px); } }

    header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px 10px;
      background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, var(--surface-1)), var(--surface-1) 70%);
      border-bottom: 1px solid var(--surface-2);
    }
    .flag { width: 20px; height: 14px; border-radius: 2px; object-fit: cover; box-shadow: 0 0 0 1px rgba(0,0,0,.3); }
    .nick { overflow: hidden; font-size: 15px; font-weight: 800; white-space: nowrap; text-overflow: ellipsis; }
    .meta { font-size: 11px; color: var(--muted); }
    .trend {
      margin-left: auto;
      padding: 2px 7px;
      border-radius: calc(5 * var(--radius));
      background: var(--surface-2);
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    section { padding: 10px 14px; border-bottom: 1px solid var(--surface-2); }
    section:last-child { border-bottom: none; }
    h4 {
      margin-bottom: 6px;
      font-size: 9.5px;
      letter-spacing: .8px;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 700;
    }

    .role { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: calc(6 * var(--radius));
      background: color-mix(in srgb, var(--accent) 18%, transparent);
      color: var(--accent);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .4px;
      text-transform: uppercase;
    }
    .role-badge svg { width: 12px; height: 12px; }
    .role-badge.second { background: var(--surface-2); color: var(--muted); }
    .source { margin-left: auto; font-size: 10px; color: var(--muted); }
    .read { color: var(--text); opacity: .9; }
    .traits { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .traits span {
      padding: 2px 6px;
      border-radius: calc(5 * var(--radius));
      background: var(--surface-2);
      font-size: 10.5px;
      font-weight: 600;
    }

    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .tile { padding: 6px 4px; border-radius: calc(7 * var(--radius)); background: var(--surface-1); text-align: center; }
    .tile b { display: block; font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .tile span { font-size: 9.5px; letter-spacing: .5px; text-transform: uppercase; color: var(--muted); }
    .tile small { display: block; font-size: 9.5px; color: var(--muted); }

    .spark { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .spark svg { flex: 1; height: 34px; overflow: visible; }
    .form { display: inline-flex; gap: 3px; }
    .form i { width: 7px; height: 7px; border-radius: 50%; background: var(--bad); }
    .form i.W { background: var(--good); }

    .meters { display: flex; flex-direction: column; gap: 5px; }
    .meter { display: grid; grid-template-columns: 88px 1fr 84px; align-items: center; gap: 8px; }
    .meter > span:first-child { color: var(--muted); }
    .meter > span:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    .track { position: relative; height: 6px; border-radius: 3px; background: var(--surface-2); }
    .fill { height: 100%; border-radius: 3px; background: var(--accent); }
    .avg { position: absolute; top: -3px; bottom: -3px; width: 2px; border-radius: 1px; background: var(--text); opacity: .55; }

    .maps { display: flex; flex-direction: column; gap: 3px; }
    .map { display: grid; grid-template-columns: 1fr 44px 44px 50px; gap: 6px; font-variant-numeric: tabular-nums; }
    .map span:not(:first-child) { text-align: right; }
    .map.head span { font-size: 9.5px; text-transform: uppercase; color: var(--muted); }
    .map.current span:first-child { color: var(--accent); font-weight: 700; }

    .trust { display: flex; align-items: center; gap: 8px; }
    .tf {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: calc(5 * var(--radius));
      background: color-mix(in srgb, var(--c) 14%, transparent);
      color: var(--c);
      font-weight: 800;
    }
    .tf.good { --c: var(--good); }
    .tf.mid { --c: var(--mid); }
    .tf.bad { --c: var(--bad); }
    .tf svg { width: 11px; height: 11px; }
    .why { color: var(--muted); font-size: 11px; }
    .smurf { margin-top: 6px; color: var(--bad); font-weight: 700; }
    .loading { padding: 18px 14px; color: var(--muted); }
  `;

  const ui = { host: null, root: null, enabled: false, card: null, playerId: null, timer: null, renderId: 0 };

  function mount() {
    if (ui.host?.isConnected || !document.body) return;
    ui.host = document.createElement("div");
    ui.host.id = HOST_ID;
    ui.root = ui.host.attachShadow({ mode: "open" });
    ui.root.innerHTML = `<style>${CSS}</style><div class="slot"></div>`;
    document.body.appendChild(ui.host);
  }

  function hide() {
    clearTimeout(ui.timer);
    ui.card = null;
    ui.playerId = null;
    ui.renderId++;
    if (ui.root) ui.root.querySelector(".slot").innerHTML = "";
  }

  const playerById = id => [...room.state.players.values()].find(p => p.id === id);

  function onOver(event) {
    if (!ui.enabled || !room.state.match) return;
    const card = event.target.closest?.(CARD_SELECTOR);
    const row = card?.querySelector(ROW_SELECTOR);
    if (!row) {
      if (ui.card) hide();
      return;
    }
    if (card === ui.card) return;
    hide();
    ui.card = card;
    ui.playerId = row.dataset.player;
    ui.timer = setTimeout(() => show(card, row.dataset.player), SHOW_DELAY);
  }

  function place(el, card) {
    const rect = card.getBoundingClientRect();
    const height = el.offsetHeight;
    const right = rect.right + GAP + WIDTH <= innerWidth - 8;
    const left = right ? rect.right + GAP : Math.max(8, rect.left - GAP - WIDTH);
    const top = Math.max(8, Math.min(rect.top, innerHeight - height - 8));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  async function show(card, playerId) {
    const player = playerById(playerId);
    if (!player || !card.isConnected) return;
    mount();
    const slot = ui.root.querySelector(".slot");
    const renderId = ++ui.renderId;
    const paint = html => {
      if (renderId !== ui.renderId) return;
      slot.innerHTML = `<div class="card">${html}</div>`;
      place(slot.firstElementChild, card);
    };

    paint(`<div class="loading">Loading ${escape(player.nickname)}…</div>`);
    try {
      const profile = await analysis.loadProfile(player, ui.options.range);
      paint(content(profile));
    } catch {
      paint(`<div class="loading">No stats for ${escape(player.nickname)}</div>`);
    }
  }

  function header(p) {
    const flag = p.country ? `<img class="flag" src="https://flagcdn.com/w40/${p.country}.png" alt="">` : "";
    const elo = Number.isFinite(p.elo) ? `${p.elo.toLocaleString("en-US")} ELO` : "";
    const trendTone = p.eloTrend > 0 ? "good" : p.eloTrend < 0 ? "bad" : "";
    const trend = p.eloTrend !== null ? `<span class="trend ${trendTone}" title="ELO change over the last ${matches(p.stats.n)}">${signed(p.eloTrend)}</span>` : "";
    return `
      <header>
        ${flag}
        <div style="min-width:0">
          <div class="nick">${escape(p.nickname)}</div>
          <div class="meta">Level ${p.level ?? "?"}${elo ? ` · ${elo}` : ""}${p.matchesTotal !== null ? ` · ${matches(p.matchesTotal.toLocaleString("en-US"))}` : ""}</div>
        </div>
        ${trend}
      </header>`;
  }

  function roleSection(p) {
    const { role, onMap } = analysis.styleOf(p, room.state.map);
    if (!role) {
      return `<section><h4>Playstyle</h4><div class="read">${p.matchesTotal ? "No extended stats for this player yet" : "Not enough data"}</div></section>`;
    }
    const r = role.metrics;
    const source = `career · ${matches(r.matches.toLocaleString("en-US"))}`;
    const second = role.secondary ? `<span class="role-badge second">${role.secondary.short}</span>` : "";
    const mapNote = onMap && onMap.id !== role.id
      ? `<div class="read" style="margin-top:4px">On ${escape(mapName(room.state.map))}: <b>${onMap.label}</b> — ${escape(onMap.read)}</div>`
      : "";
    const traits = role.traits.length
      ? `<div class="traits">${role.traits.slice(0, 4).map(t => `<span class="${t.tone}">${escape(t.text)}</span>`).join("")}</div>`
      : "";
    return `
      <section>
        <div class="role">
          <span class="role-badge">${icons.crosshair}${role.label}</span>${second}
          <span class="source">${source}</span>
        </div>
        <div class="read">${escape(role.read)}</div>
        ${mapNote}
        ${traits}
      </section>
      <section>
        <h4>Tendencies <span style="text-transform:none;letter-spacing:0">(white mark = average player)</span></h4>
        <div class="meters">${METERS.map(m => meter(m, r)).join("")}</div>
      </section>`;
  }

  function meter(m, r) {
    const width = Math.min(100, (r[m.key] / m.max) * 100);
    const avg = Math.min(100, (playstyle.AVERAGE[m.key] / m.max) * 100);
    return `
      <div class="meter">
        <span>${m.label}</span>
        <div class="track"><div class="fill" style="width:${width}%"></div><i class="avg" style="left:${avg}%"></i></div>
        <span>${m.value(r)}</span>
      </div>`;
  }

  const tone = (value, good, bad) => (value === null || value === undefined ? "" : value >= good ? "good" : value < bad ? "bad" : "");

  function statsSection(p) {
    const s = p.stats;
    if (!s.n) return `<section><div class="read">No recent matches</div></section>`;
    const lifetime = p.lifetimeKd !== null ? `<small>career ${fixed(p.lifetimeKd)}</small>` : `<small>&nbsp;</small>`;
    return `
      <section>
        <h4>Last ${matches(s.n)}</h4>
        <div class="grid">
          <div class="tile"><span>K/D</span><b class="${tone(s.kd, 1.1, 0.9)}">${fixed(s.kd)}</b>${lifetime}</div>
          <div class="tile"><span>ADR</span><b class="${tone(s.adr, 80, 65)}">${round(s.adr)}</b><small>${fixed(s.kpr)} KPR</small></div>
          <div class="tile"><span>HS</span><b>${round(s.hs)}%</b><small>${s.avgK.toFixed(1)} kills</small></div>
          <div class="tile"><span>Win</span><b class="${tone(s.winrate, 55, 45)}">${round(s.winrate)}%</b><small>${fixed(s.multi, 1)} 3k+</small></div>
        </div>
        ${sparkline(p)}
      </section>`;
  }

  function sparkline(p) {
    const elos = p.games.map(g => g.elo).filter(e => e !== null).reverse();
    const form = `<span class="form" title="Last 5, newest first">${p.form.map(r => `<i class="${r}"></i>`).join("")}</span>`;
    if (elos.length < 3) return `<div class="spark">${form}</div>`;
    const min = Math.min(...elos);
    const max = Math.max(...elos);
    const span = Math.max(max - min, 1);
    const points = elos.map((e, i) => `${(i / (elos.length - 1)) * 100},${30 - ((e - min) / span) * 28}`).join(" ");
    const color = elos.at(-1) >= elos[0] ? "var(--good)" : "var(--bad)";
    return `
      <div class="spark" title="ELO ${min}–${max}">
        <svg viewBox="0 0 100 32" preserveAspectRatio="none">
          <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
        </svg>
        ${form}
      </div>`;
  }

  function mapsSection(p) {
    const current = room.state.map;
    const list = Object.entries(p.maps).sort((a, b) => b[1].n - a[1].n).slice(0, 4);
    if (current && p.maps[current] && !list.some(([map]) => map === current)) list.push([current, p.maps[current]]);
    if (!list.length) return "";
    return `
      <section>
        <h4>Maps</h4>
        <div class="maps">
          <div class="map head"><span>Map</span><span>Played</span><span>Win</span><span>K/D</span></div>
          ${list.map(([map, s]) => `
            <div class="map ${map === current ? "current" : ""}">
              <span>${escape(mapName(map))}</span><span>${s.n}</span>
              <span class="${tone(s.winrate, 55, 45)}">${round(s.winrate)}%</span>
              <span class="${tone(s.kd, 1.1, 0.9)}">${fixed(s.kd)}</span>
            </div>`).join("")}
        </div>
      </section>`;
  }

  function trustSection(p) {
    const t = p.trust;
    const why = t.reasons[0] ? escape(t.reasons.slice(0, 2).join(", ")) : "no concerns";
    const smurf = p.smurf.flag ? `<div class="smurf">⚠ Possible smurf: ${escape(p.smurf.reasons.join(", "))}</div>` : "";
    const age = p.accountAgeDays !== null ? ` · account ${p.accountAgeDays.toLocaleString("en-US")} days old` : "";
    return `
      <section>
        <div class="trust"><span class="tf ${t.level}">${icons.shield}${t.score}</span><span class="why">${t.label} — ${why}${age}</span></div>
        ${smurf}
      </section>`;
  }

  function content(p) {
    return header(p) + roleSection(p) + statsSection(p) + mapsSection(p) + trustSection(p);
  }

  function apply(settings) {
    ui.options = settings.room;
    ui.enabled = Boolean(settings.room.hoverCard && settings.room.stats);
    if (!ui.enabled) hide();
  }

  store.load().then(apply);
  store.onChange((settings, changed) => changed.has("room") && apply(settings));
  room.subscribe(state => !state.match && hide());
  document.addEventListener("mouseover", onOver, { passive: true });
  document.addEventListener("mouseout", event => !event.relatedTarget && hide(), { passive: true });
  addEventListener("scroll", hide, { passive: true, capture: true });
})();
