(() => {
  const { settings: store, room, chips, dom } = globalThis.FB;

  const STYLE_ID = `${dom.OWN_PREFIX}-teams`;
  const ROW_CLASS = "fb-team-elo";
  const NAME_SELECTOR = '[class*="FactionInfo"] [class*="StyledFactionName"]';

  const CSS = `
    ${chips.CSS}
    .${ROW_CLASS}.fb-chips {
      ${chips.PAGE_VARS}
      display: block;
      margin-top: 4px;
    }
  `;

  let enabled = false;

  function averageElo(team) {
    const elos = team.roster.map(p => p.elo).filter(Number.isFinite);
    return elos.length ? Math.round(elos.reduce((a, b) => a + b, 0) / elos.length) : null;
  }

  function render(avg, opponent) {
    const diff = opponent === null ? null : avg - opponent;
    const tone = diff === null || diff === 0 ? "" : diff > 0 ? "good" : "bad";
    const sign = diff > 0 ? "+" : "";
    const title = diff === null ? "Average ELO of the team" : `Average ELO of the team (${sign}${diff} vs opponent)`;
    const delta = diff ? ` <span class="fb-label">${sign}${diff}</span>` : "";
    return `<span class="fb-chip ${tone}" title="${title}"><span class="fb-label">Avg ELO</span><b>${avg.toLocaleString("en-US")}</b>${delta}</span>`;
  }

  function decorate() {
    const { teams, match } = room.state;
    if (!enabled || !match || teams.length !== 2) return;
    dom.upsertStyle(STYLE_ID, CSS);

    const averages = teams.map(averageElo);
    for (const nameEl of document.querySelectorAll(NAME_SELECTOR)) {
      const index = teams.findIndex(t => t.name === nameEl.textContent.trim());
      const avg = averages[index];
      if (index < 0 || avg === null) continue;

      const info = nameEl.parentElement;
      const html = render(avg, averages[1 - index]);
      let row = info.querySelector(`:scope > .${ROW_CLASS}`);
      if (!row) {
        row = document.createElement("div");
        row.className = `${ROW_CLASS} fb-chips`;
        nameEl.after(row);
      }
      if (row.innerHTML !== html) row.innerHTML = html;
    }
  }

  function clear() {
    document.querySelectorAll(`.${ROW_CLASS}`).forEach(row => row.remove());
  }

  function apply(settings) {
    enabled = Boolean(settings.room.teamElo);
    clear();
    decorate();
  }

  store.load().then(apply);
  store.onChange((settings, changed) => changed.has("room") && apply(settings));
  room.subscribe(state => (state.match ? decorate() : clear()));
  dom.onMutation(decorate);
})();
