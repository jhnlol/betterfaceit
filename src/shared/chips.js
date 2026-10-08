(() => {
  const FB = (globalThis.FB ??= {});

  const CSS = `
    .fb-chips {
      --fb-good: color-mix(in oklch, var(--fb-win) 85%, white);
      --fb-bad: color-mix(in oklch, var(--fb-loss) 90%, white);
      --fb-mid: color-mix(in oklch, var(--fb-caution) 90%, white);
      --fb-chip-radius: calc(5px * var(--fb-radius-scale, 1));
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      font: 600 11px/1 var(--fb-font, inherit);
      color: var(--fb-muted);
      cursor: default;
    }
    .fb-chip {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      box-sizing: border-box;
      height: 20px;
      padding: 0 7px;
      border: 1px solid var(--fb-line);
      border-radius: var(--fb-chip-radius);
      background: var(--fb-surface);
      white-space: nowrap;
    }
    .fb-chip svg { width: 11px; height: 11px; }
    .fb-chip .fb-label {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: .4px;
      text-transform: uppercase;
      color: var(--fb-muted);
    }
    .fb-chip b {
      color: var(--fb-text);
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .fb-chip.good { --c: var(--fb-good); }
    .fb-chip.mid { --c: var(--fb-mid); }
    .fb-chip.bad { --c: var(--fb-bad); }
    .fb-chip:is(.good, .mid, .bad) {
      background: color-mix(in srgb, var(--c) 10%, var(--fb-surface));
      border-color: color-mix(in srgb, var(--c) 16%, var(--fb-line));
      box-shadow: inset 2px 0 0 var(--c);
    }
    .fb-chip:is(.good, .mid, .bad) b,
    .fb-chip.fb-trust svg { color: var(--c); }
    .fb-meter {
      width: 22px;
      height: 4px;
      border-radius: 2px;
      background: color-mix(in srgb, var(--c) 18%, transparent);
      overflow: hidden;
    }
    .fb-meter i { display: block; height: 100%; border-radius: 2px; background: var(--c); }
    .fb-chip.fb-smurf {
      border-color: color-mix(in srgb, var(--fb-bad) 55%, transparent);
      background: color-mix(in srgb, var(--fb-bad) 20%, var(--fb-surface));
      color: var(--fb-bad);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .5px;
    }
    .fb-chip.fb-muted { opacity: .6; }
    a.fb-chip {
      color: var(--fb-muted);
      text-decoration: none;
      cursor: pointer;
      transition: color .15s, border-color .15s;
    }
    a.fb-chip:hover {
      color: var(--fb-accent);
      border-color: color-mix(in srgb, var(--fb-accent) 50%, transparent);
    }
  `;

  const level = (value, good, bad) => (value >= good ? "good" : value < bad ? "bad" : "");

  function stat(label, value, tone = "", title = "") {
    return {
      text: `${label} ${value}`,
      html: `<span class="fb-chip ${tone}"${title ? ` title="${title}"` : ""}><span class="fb-label">${label}</span><b>${value}</b></span>`
    };
  }

  function trust({ score, level: tone, label, reasons }) {
    const title = `Trust factor: ${label} (${score}/100)&#10;${reasons.join("&#10;") || "No concerns"}`;
    return {
      text: `TF ${score}`,
      html: `<span class="fb-chip fb-trust ${tone}" title="${title}">${FB.icons.shield}<span class="fb-label">TF</span><b>${score}</b>` +
            `<span class="fb-meter"><i style="width:${score}%"></i></span></span>`
    };
  }

  function note(text, className = "fb-muted", title = "", icon = "") {
    return { text, html: `<span class="fb-chip ${className}"${title ? ` title="${title}"` : ""}>${icon}${text}</span>` };
  }

  function statChips(profile, room) {
    const { stats } = profile;
    if (!stats.n) return [note("No matches")];

    const chips = [];
    if (room.kd) chips.push(stat("K/D", stats.kd.toFixed(2), stats.kd >= 1 ? "good" : "bad"));
    if (room.winrate) chips.push(stat("WR", `${Math.round(stats.winrate)}%`, stats.winrate >= 50 ? "good" : "bad"));
    if (room.adr && stats.adr !== null) chips.push(stat("ADR", Math.round(stats.adr), level(stats.adr, 80, 65)));
    if (room.avgKills) chips.push(stat("K", stats.avgK.toFixed(1), "", "Average kills per match"));
    if (room.avgDeaths) chips.push(stat("D", stats.avgD.toFixed(1), "", "Average deaths per match"));
    if (room.avgAssists) chips.push(stat("A", stats.avgA.toFixed(1), "", "Average assists per match"));
    if (room.hs && stats.hs !== null) chips.push(stat("HS", `${Math.round(stats.hs)}%`));
    return chips;
  }

  function render(profile, player, room) {
    const chips = [];

    if (!profile) {
      chips.push(note("Loading…"));
    } else if (profile.error) {
      chips.push(note("No stats"));
    } else {
      if (room.smurf && profile.smurf.flag) {
        chips.push(note("SMURF?", "fb-smurf", `Possible smurf: ${profile.smurf.reasons.join(", ")}`, FB.icons.warning));
      }
      if (room.trust) chips.push(trust(profile.trust));
      chips.push(...statChips(profile, room));
      if (room.matches && profile.matchesTotal !== null) {
        chips.push(stat("Matches", profile.matchesTotal.toLocaleString("en-US")));
      }
    }

    if (room.steam && player.steam) {
      chips.push({
        text: "Steam",
        html: `<a class="fb-chip" href="https://steamcommunity.com/profiles/${player.steam}" target="_blank" rel="noopener noreferrer" title="Steam profile">` +
              `${FB.icons.external}<span class="fb-label">Steam</span></a>`
      });
    }

    const summary = chips.map(c => c.text).join(" · ");
    const recent = profile?.stats?.n ? `Last ${FB.format.matches(profile.stats.n)}: ` : "";
    return { html: chips.map(c => c.html).join(""), title: recent + summary };
  }

  FB.chips = { CSS, render };
})();
