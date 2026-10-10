(() => {
  const { settings: store, room, analysis, chips, dom } = globalThis.FB;

  const STYLE_ID = `${dom.OWN_PREFIX}-room`;
  const ROW_CLASS = "fb-room-stats";
  const NAME_SELECTOR = '[class*="ListContentPlayer"] [class*="Nickname__Name"]';
  const CARD_SELECTOR = '[class*="styles__Holder"]';
  // The dark rounded box of a player; stats go inside it so they read as part of the card.
  const BOX_SELECTOR = '[class*="ListContentPlayer__Background"]';
  const MIDDLE_SELECTOR = '[class*="MiddleSlotWrapper"]';
  const CHIP_KEYS = ["country", "trust", "smurf", "role", "form", "kd", "winrate", "matches", "adr", "avgKills", "avgDeaths", "avgAssists", "hs", "steam"];

  const CSS = `
    .${ROW_CLASS} {
      ${chips.PAGE_VARS}
      margin: 6px 0 0 var(--fb-indent, 0px);
    }
    ${BOX_SELECTOR}:has(> .${ROW_CLASS}) {
      flex-direction: column !important;
      align-items: stretch !important;
      height: auto !important;
    }
    ${BOX_SELECTOR} > .${ROW_CLASS} {
      margin: -4px 8px 8px var(--fb-indent, 8px);
    }
    .${ROW_CLASS} .fb-chip {
      height: 18px;
      padding: 0 6px;
    }
    ${chips.CSS}
  `;

  let options = null;

  const isEnabled = () => Boolean(options?.stats) && CHIP_KEYS.some(key => options[key]);

  const indentObserver = new ResizeObserver(entries => entries.forEach(entry => align(entry.target)));

  const hostOf = card => card.querySelector(BOX_SELECTOR) ?? card;

  // Line the stats up with the nickname column.
  function align(host) {
    const row = host.querySelector(`:scope > .${ROW_CLASS}`);
    const middle = host.querySelector(MIDDLE_SELECTOR);
    if (!row || !middle) return;
    const indent = Math.max(0, Math.round(middle.getBoundingClientRect().left - host.getBoundingClientRect().left));
    row.style.setProperty("--fb-indent", `${indent}px`);
  }

  function paint(row, player, profile) {
    const { html, title } = chips.render(profile, player, options);
    row.innerHTML = html;
    row.title = title;
  }

  function createRow(host, player) {
    const row = document.createElement("div");
    row.className = `${ROW_CLASS} fb-chips`;
    row.dataset.player = player.id;
    row.dataset.style = options.chipStyle;
    row.addEventListener("click", event => event.stopPropagation());
    host.appendChild(row);
    align(host);
    indentObserver.observe(host);

    paint(row, player, null);
    analysis.loadProfile(player, options.range)
      .then(profile => row.isConnected && paint(row, player, profile))
      .catch(() => row.isConnected && paint(row, player, { error: true }));
  }

  function decorate() {
    if (!isEnabled() || !room.state.match) return;
    dom.upsertStyle(STYLE_ID, CSS);

    for (const nameEl of document.querySelectorAll(NAME_SELECTOR)) {
      const player = room.state.players.get(nameEl.textContent.trim().toLowerCase());
      const card = nameEl.closest(CARD_SELECTOR);
      if (!player || !card) continue;
      const host = hostOf(card);
      if (host.querySelector(`:scope > .${ROW_CLASS}[data-player="${player.id}"]`)) continue;
      createRow(host, player);
    }
  }

  function clear() {
    document.querySelectorAll(`.${ROW_CLASS}`).forEach(row => row.remove());
  }

  store.load().then(settings => {
    options = settings.room;
    decorate();
  });

  store.onChange((settings, changed) => {
    if (!changed.has("room")) return;
    options = settings.room;
    clear();
    decorate();
  });

  room.subscribe(state => (state.match ? decorate() : clear()));
  dom.onMutation(decorate);
})();
