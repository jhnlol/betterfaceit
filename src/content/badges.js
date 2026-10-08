(() => {
  const { settings: store, room, analysis, chips, dom } = globalThis.FB;

  const STYLE_ID = `${dom.OWN_PREFIX}-room`;
  const ROW_CLASS = "fb-room-stats";
  const NAME_SELECTOR = '[class*="ListContentPlayer"] [class*="Nickname__Name"]';
  const CARD_SELECTOR = '[class*="styles__Holder"]';
  const MIDDLE_SELECTOR = '[class*="MiddleSlotWrapper"]';
  const CHIP_KEYS = ["trust", "smurf", "kd", "winrate", "matches", "adr", "avgKills", "avgDeaths", "avgAssists", "hs", "steam"];

  const CSS = `
    .${ROW_CLASS} {
      --fb-surface: var(--f-surface-level-3, #242424);
      --fb-line: var(--f-surface-level-4, #2e2e2e);
      --fb-text: var(--f-white-full, #f1f1f1);
      --fb-muted: var(--f-white-medium, #a7a7a7);
      --fb-win: var(--f-common-outcome-win, #05ff00);
      --fb-loss: var(--f-common-outcome-loss, #ef0000);
      --fb-caution: var(--f-common-caution, #ffc700);
      --fb-accent: var(--f-core-primary-enabled, #ff4b00);
      --fb-font: var(--f-font-family, sans-serif);
      margin: 6px 0 0 var(--fb-indent, 0px);
    }
    ${chips.CSS}
  `;

  let options = null;

  const isEnabled = () => Boolean(options?.stats) && CHIP_KEYS.some(key => options[key]);

  const indentObserver = new ResizeObserver(entries => entries.forEach(entry => align(entry.target)));

  function align(card) {
    const row = card.querySelector(`:scope > .${ROW_CLASS}`);
    const middle = card.querySelector(MIDDLE_SELECTOR);
    if (!row || !middle) return;
    const indent = Math.max(0, Math.round(middle.getBoundingClientRect().left - card.getBoundingClientRect().left));
    row.style.setProperty("--fb-indent", `${indent}px`);
  }

  function paint(row, player, profile) {
    const { html, title } = chips.render(profile, player, options);
    row.innerHTML = html;
    row.title = title;
  }

  function createRow(card, player) {
    const row = document.createElement("div");
    row.className = `${ROW_CLASS} fb-chips`;
    row.dataset.player = player.id;
    row.addEventListener("click", event => event.stopPropagation());
    card.appendChild(row);
    align(card);
    indentObserver.observe(card);

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
      if (!player || !card || card.querySelector(`:scope > .${ROW_CLASS}[data-player="${player.id}"]`)) continue;
      createRow(card, player);
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
