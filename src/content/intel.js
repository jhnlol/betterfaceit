(() => {
  const { settings: store, room, analysis, format, icons, dom } = globalThis.FB;
  const { escape, round, fixed, signed, mapName, matches } = format;

  const HOST_ID = `${dom.OWN_PREFIX}-intel`;

  const CSS = `
    :host {
      all: initial;
      --surface-0: var(--f-surface-level-1, #121212);
      --surface-1: var(--f-surface-level-2, #1d1d1d);
      --surface-2: var(--f-surface-level-3, #242424);
      --line: var(--f-surface-level-4, #2e2e2e);
      --text: var(--f-white-full, #f1f1f1);
      --text-soft: var(--f-white-high, #ccc);
      --muted: var(--f-white-medium, #a7a7a7);
      --accent: var(--f-core-primary-enabled, #ff4b00);
      --good: color-mix(in oklch, var(--f-common-outcome-win, #05ff00) 85%, white);
      --bad: color-mix(in oklch, var(--f-common-outcome-loss, #ef0000) 90%, white);
      --mid: color-mix(in oklch, var(--f-common-caution, #ffc700) 90%, white);
      --radius: calc(1px * var(--fb-radius-scale, 1));
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .root { font: 13px/1.4 var(--f-font-family, "Segoe UI", sans-serif); color: var(--text); }
    .good { color: var(--good); }
    .bad { color: var(--bad); }
    .mid { color: var(--mid); }

    .launcher {
      position: fixed;
      top: 50%;
      right: 0;
      z-index: 2147483000;
      transform: translateY(-50%);
      writing-mode: vertical-rl;
      padding: 14px 7px;
      border: none;
      border-radius: calc(8 * var(--radius)) 0 0 calc(8 * var(--radius));
      background: var(--accent);
      color: #fff;
      font: 700 12px/1 var(--f-font-family, sans-serif);
      letter-spacing: .5px;
      cursor: pointer;
      box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 45%, transparent);
    }
    .launcher:hover { filter: brightness(1.12); }

    .panel {
      position: fixed;
      top: 72px;
      right: 16px;
      bottom: 16px;
      z-index: 2147483001;
      display: flex;
      flex-direction: column;
      width: 390px;
      max-width: calc(100vw - 32px);
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: calc(12 * var(--radius));
      background: var(--surface-0);
      box-shadow: 0 12px 40px rgba(0, 0, 0, .6);
      animation: slide-in .18s ease;
    }
    @keyframes slide-in { from { opacity: 0; transform: translateX(16px); } }

    header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid var(--surface-2);
    }
    h2 { font-size: 16px; font-weight: 800; }
    h2 span { color: var(--accent); }
    header p { font-size: 11px; color: var(--muted); }
    .close {
      width: 28px;
      height: 28px;
      margin-left: auto;
      border: none;
      border-radius: calc(6 * var(--radius));
      background: var(--surface-2);
      color: var(--muted);
      font-size: 16px;
      cursor: pointer;
    }
    .close:hover { color: var(--text); }

    .body { flex: 1; overflow-y: auto; padding: 12px 16px 18px; }
    .body::-webkit-scrollbar { width: 6px; }
    .body::-webkit-scrollbar-thumb { border-radius: 3px; background: var(--line); }

    h3 {
      margin: 16px 0 8px;
      font-size: 10.5px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--muted);
    }
    h3:first-child { margin-top: 0; }

    .options { display: flex; flex-wrap: wrap; gap: 6px; }
    .options button {
      flex: 1;
      padding: 7px 10px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: calc(7 * var(--radius));
      background: var(--surface-1);
      color: var(--text-soft);
      font: 600 12px/1.2 var(--f-font-family, sans-serif);
      white-space: nowrap;
      text-overflow: ellipsis;
      cursor: pointer;
    }
    .options.maps button { flex: 0 0 auto; }
    .options button.active {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 14%, var(--surface-1));
      color: var(--text);
    }
    .options button.picked::after { content: " ✓"; color: var(--good); }
    .options small { font-weight: 500; color: var(--muted); }
    .hint { margin-top: 6px; font-size: 11px; color: var(--muted); }

    .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .card {
      min-width: 0;
      padding: 10px 12px;
      border: 1px solid var(--surface-2);
      border-radius: calc(9 * var(--radius));
      background: var(--surface-1);
    }
    .card.wide { grid-column: span 2; display: flex; align-items: center; gap: 10px; }
    .label { font-size: 10.5px; letter-spacing: .6px; text-transform: uppercase; color: var(--muted); }
    .value { margin-top: 2px; font-size: 20px; font-weight: 800; }
    .sub { margin-top: 2px; font-size: 11px; color: var(--muted); }
    .badge {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: calc(8 * var(--radius));
      font-size: 16px;
    }
    .threat .badge { background: color-mix(in srgb, var(--bad) 18%, transparent); }
    .target .badge { background: color-mix(in srgb, var(--good) 14%, transparent); }
    .nick { overflow: hidden; font-size: 14px; font-weight: 800; white-space: nowrap; text-overflow: ellipsis; }

    ul { display: flex; flex-direction: column; gap: 6px; list-style: none; }
    li {
      position: relative;
      padding: 8px 10px 8px 28px;
      border-radius: calc(8 * var(--radius));
      background: var(--surface-1);
      font-size: 12px;
    }
    li::before { position: absolute; top: 8px; left: 10px; font-weight: 800; }
    .strengths li::before { content: "+"; color: var(--bad); }
    .weaknesses li::before { content: "−"; color: var(--good); }
    .tips { counter-reset: tip; }
    .tips li { counter-increment: tip; }
    .tips li::before { content: counter(tip); color: var(--accent); }
    .empty { padding: 4px 0; font-size: 12px; color: var(--muted); }

    .bars { display: flex; flex-direction: column; gap: 6px; }
    .bar { display: grid; grid-template-columns: 70px 1fr 80px; align-items: center; gap: 8px; font-size: 12px; }
    .track { height: 8px; overflow: hidden; border-radius: 4px; background: var(--surface-2); }
    .fill { height: 100%; border-radius: 4px; background: var(--accent); }
    .bar.selected .fill { background: var(--good); }
    .bar .count { text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; }

    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th {
      padding: 0 4px 6px;
      font-size: 10px;
      font-weight: 600;
      text-align: left;
      text-transform: uppercase;
      color: var(--muted);
    }
    td { padding: 7px 4px; border-top: 1px solid var(--surface-2); font-variant-numeric: tabular-nums; }
    td.player { max-width: 100px; overflow: hidden; font-weight: 700; white-space: nowrap; text-overflow: ellipsis; }
    .smurf { font-weight: 800; color: var(--bad); }
    .form { display: inline-flex; gap: 2px; }
    .form i { width: 6px; height: 6px; border-radius: 50%; background: var(--bad); }
    .form i.W { background: var(--good); }
    .tf {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      min-width: 34px;
      padding: 2px 6px;
      border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
      border-radius: calc(5 * var(--radius));
      background: color-mix(in srgb, var(--c) 12%, transparent);
      color: var(--c);
      font-weight: 800;
    }
    .tf.good { --c: var(--good); }
    .tf.mid { --c: var(--mid); }
    .tf.bad { --c: var(--bad); }
    .tf svg { width: 10px; height: 10px; }

    .loading { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 0; color: var(--muted); }
    .spinner {
      width: 26px;
      height: 26px;
      border: 3px solid var(--line);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;

  const ui = {
    host: null,
    root: null,
    open: false,
    teamKey: null,
    previewMap: null,
    renderId: 0,
    options: null
  };

  function mount() {
    if (ui.host?.isConnected || !document.body) return;
    ui.host = document.createElement("div");
    ui.host.id = HOST_ID;
    ui.root = ui.host.attachShadow({ mode: "open" });
    ui.root.innerHTML = `<style>${CSS}</style><div class="root"></div>`;
    ui.root.addEventListener("click", onClick);
    document.body.appendChild(ui.host);
  }

  function unmount() {
    ui.host?.remove();
    ui.host = null;
    ui.root = null;
  }

  const selectedMap = () => room.state.map ?? ui.previewMap;

  function defaultTeam() {
    const { teams, meId } = room.state;
    const mine = meId ? teams.find(t => t.roster.some(p => p.id === meId)) : null;
    return (mine ? teams.find(t => t !== mine) : teams.at(-1))?.key ?? null;
  }

  function onClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action, value } = target.dataset;

    if (action === "open") ui.open = true;
    if (action === "close") ui.open = false;
    if (action === "team") ui.teamKey = value;
    if (action === "map") {
      if (room.state.map) return;
      ui.previewMap = ui.previewMap === value ? null : value;
    }
    render();
  }

  function update() {
    const { id, match, teams } = room.state;
    if (!id) {
      Object.assign(ui, { open: false, teamKey: null, previewMap: null });
    }
    if (!id || !match || !ui.options?.intel) {
      unmount();
      return;
    }
    if (!teams.some(t => t.key === ui.teamKey)) ui.teamKey = defaultTeam();
    mount();
    render();
  }

  function render() {
    if (!ui.root) return;
    const container = ui.root.querySelector(".root");

    if (!ui.open) {
      container.innerHTML = `<button class="launcher" data-action="open" title="Faceit Better — Match Intel">⚡ MATCH INTEL</button>`;
      return;
    }

    container.innerHTML = `
      <div class="panel">
        <header>
          <div>
            <h2>Match <span>Intel</span></h2>
            <p>Based on each player's last ${matches(ui.options.range)}</p>
          </div>
          <button class="close" data-action="close" title="Close">✕</button>
        </header>
        <div class="body"><div class="loading"><div class="spinner"></div>Loading stats…</div></div>
      </div>`;

    const team = room.state.teams.find(t => t.key === ui.teamKey);
    if (!team) return;

    const renderId = ++ui.renderId;
    Promise.all(team.roster.map(p => analysis.loadProfile(p, ui.options.range).catch(() => null))).then(profiles => {
      if (renderId !== ui.renderId || !ui.open || !ui.root) return;
      const result = analysis.analyzeTeam(team, profiles, room.state.match, selectedMap());
      ui.root.querySelector(".body").innerHTML = body(result);
    });
  }

  function teamOptions() {
    const { teams, meId } = room.state;
    return teams.map(t => {
      const mine = meId && t.roster.some(p => p.id === meId);
      return `<button data-action="team" data-value="${t.key}" class="${t.key === ui.teamKey ? "active" : ""}">` +
             `${escape(t.name)}${mine ? " <small>(you)</small>" : ""}</button>`;
    }).join("");
  }

  function mapOptions(result) {
    const map = selectedMap();
    const voted = room.state.match.voting?.map?.entities ?? [];
    const list = voted.length
      ? voted.map(e => ({ id: e.class_name || e.game_map_id, name: e.name }))
      : result.maps.slice(0, 7).map(m => ({ id: m.map, name: m.name }));

    return list.map(m => {
      const classes = [m.id === map && "active", m.id === room.state.map && "picked"].filter(Boolean).join(" ");
      return `<button data-action="map" data-value="${escape(m.id)}" class="${classes}">${escape(m.name)}</button>`;
    }).join("");
  }

  function mapHint() {
    if (room.state.map) return `Picked map: <b>${escape(mapName(room.state.map))}</b>`;
    return ui.previewMap ? "Preview — the map has not been picked yet" : "Map not picked yet — click one to preview the intel";
  }

  const tone = (value, high, low) => (value === null ? "" : value >= high ? "bad" : value <= low ? "good" : "mid");

  function playerCard(kind, icon, title, entry, map) {
    if (!entry) return "";
    const { profile: p, rating } = entry;
    const onMap = map ? p.maps[map] : null;
    const detail = onMap?.n
      ? `${mapName(map)}: K/D ${fixed(onMap.kd)} · ${matches(onMap.n)}`
      : `K/D ${fixed(p.stats.kd)} · ADR ${round(p.stats.adr)} · HS ${round(p.stats.hs)}%`;
    return `
      <div class="card wide ${kind}">
        <div class="badge">${icon}</div>
        <div style="min-width:0">
          <div class="label">${title}</div>
          <div class="nick">${escape(p.nickname)} <span class="sub">rating ${fixed(rating)}</span></div>
          <div class="sub">${escape(detail)}</div>
        </div>
      </div>`;
  }

  function summary(r, map) {
    const info = r.mapInfo;
    return `
      <div class="cards">
        <div class="card">
          <div class="label">Current form</div>
          <div class="value ${tone(r.form, 60, 40)}">${r.form === null ? "–" : `${round(r.form)}%`}</div>
          <div class="sub">won in the last 5 matches</div>
        </div>
        <div class="card">
          <div class="label">${info ? escape(info.name) : "Map"}</div>
          <div class="value ${info?.n ? tone(info.winrate, 60, 40) : ""}">${info?.n ? `${round(info.winrate)}%` : "–"}</div>
          <div class="sub">${info ? `${info.w}W / ${info.n - info.w}L on this map` : "pick a map"}</div>
        </div>
        <div class="card">
          <div class="label">Avg ELO</div>
          <div class="value">${round(r.avgElo)}</div>
          <div class="sub">trend ${signed(r.eloTrend)} per player</div>
        </div>
        <div class="card">
          <div class="label">Team</div>
          <div class="value">${fixed(r.kd)}</div>
          <div class="sub">K/D · ADR ${round(r.adr)} · HS ${round(r.hs)}%</div>
        </div>
        ${playerCard("threat", "🔥", "Biggest threat", r.danger, map)}
        ${playerCard("target", "🎯", "Weakest link", r.weakest, map)}
      </div>`;
  }

  function list(items, className, empty) {
    if (!items.length) return `<div class="empty">${empty}</div>`;
    return `<ul class="${className}">${items.map(item => `<li>${escape(item)}</li>`).join("")}</ul>`;
  }

  function mapBars(r, map) {
    if (!r.maps.length) return `<div class="empty">No map data</div>`;
    const max = Math.max(...r.maps.map(m => m.n));
    return `<div class="bars">${r.maps.map(m => `
      <div class="bar ${m.map === map ? "selected" : ""}">
        <span>${escape(m.name)}</span>
        <div class="track"><div class="fill" style="width:${(m.n / max) * 100}%"></div></div>
        <span class="count">${m.n}× · ${round(m.winrate)}%</span>
      </div>`).join("")}</div>`;
  }

  function playerTable(r, map) {
    const rows = [...r.players]
      .sort((a, b) => (b.stats.rating ?? 0) - (a.stats.rating ?? 0))
      .map(p => {
        const onMap = map ? p.maps[map] : null;
        const trust = `${p.trust.label}: ${p.trust.reasons.join(", ") || "no concerns"}`;
        const smurf = p.smurf.flag ? ` <span class="smurf" title="${escape(p.smurf.reasons.join(", "))}">⚠</span>` : "";
        return `
          <tr>
            <td class="player" title="${escape(p.nickname)}">${escape(p.nickname)}${smurf}</td>
            <td><span class="form">${p.form.map(result => `<i class="${result}"></i>`).join("")}</span></td>
            <td class="${p.stats.kd >= 1 ? "good" : "bad"}">${fixed(p.stats.kd)}</td>
            <td>${round(p.stats.adr)}</td>
            <td>${round(p.stats.winrate)}%</td>
            <td title="${onMap ? `${matches(onMap.n)} on ${escape(mapName(map))}` : ""}">${onMap ? fixed(onMap.kd) : "–"}</td>
            <td><span class="tf ${p.trust.level}" title="${escape(trust)}">${icons.shield}${p.trust.score}</span></td>
          </tr>`;
      }).join("");

    return `
      <table>
        <tr><th>Player</th><th>Form</th><th>K/D</th><th>ADR</th><th>WR</th><th>${map ? "Map K/D" : "Map"}</th><th>TF</th></tr>
        ${rows}
      </table>`;
  }

  function body(r) {
    const map = selectedMap();
    return `
      <h3>Analyzed team</h3>
      <div class="options">${teamOptions()}</div>

      <h3>Map</h3>
      <div class="options maps">${mapOptions(r)}</div>
      <div class="hint">${mapHint()}</div>

      <h3>Overview</h3>
      ${summary(r, map)}

      <h3>How to win</h3>
      ${list(r.tips, "tips", "Not enough data for recommendations")}

      <h3>Their strengths</h3>
      ${list(r.strengths, "strengths", "Nothing stands out")}

      <h3>Their weaknesses</h3>
      ${list(r.weaknesses, "weaknesses", "Nothing stands out")}

      <h3>Most played maps</h3>
      ${mapBars(r, map)}

      <h3>Players</h3>
      ${playerTable(r, map)}`;
  }

  store.load().then(settings => {
    ui.options = settings.room;
    room.subscribe(update);
  });

  store.onChange((settings, changed) => {
    if (!changed.has("room")) return;
    ui.options = settings.room;
    update();
  });
})();
