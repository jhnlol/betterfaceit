(() => {
  const { colors, themes, settings: store, chips } = globalThis.FB;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const COLOR_FIELDS = [
    { key: "bg", label: "Background", desc: "Page background" },
    { key: "surface", label: "Panels", desc: "Cards, menus, dialogs" },
    { key: "border", label: "Borders", desc: "Panel outline color" },
    { key: "accent", label: "Accent", desc: "Buttons and highlights" },
    { key: "text", label: "Text", desc: "Primary text color" },
    { key: "muted", label: "Secondary text", desc: "Descriptions, captions, icons" },
    { key: "win", label: "Win", desc: "Wins and good stats" },
    { key: "loss", label: "Loss", desc: "Losses and bad stats" }
  ];

  const FORMATTERS = {
    "style.roundness": v => (v === 0 ? "Sharp" : v === 100 ? "Default" : `${v}%`),
    "style.borderWidth": v => (v === 0 ? "None" : `${v}px`),
    "style.scale": v => `${v}%`,
    "style.bgDim": v => `${v}%`
  };

  const VALIDATORS = {
    "style.bgImage": v => v === "" || /^https?:\/\/\S+$/i.test(v)
  };

  const SAMPLE_PLAYER = { steam: "0" };
  const SAMPLE_PROFILE = {
    stats: { n: 20, kd: 1.24, winrate: 55, adr: 86, avgK: 18.3, avgD: 14.8, avgA: 4.6, hs: 48 },
    matchesTotal: 1284,
    country: "pl",
    trust: { score: 68, level: "mid", label: "Neutral", reasons: ["−10 only 140 matches"] },
    smurf: { flag: true, reasons: ["140 matches", "K/D 1.24"] }
  };

  let settings = null;

  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  const hideToast = debounce(() => $("#toast").classList.remove("show"), 1200);

  function toast(message = "Saved ✓") {
    $("#toast").textContent = message;
    $("#toast").classList.add("show");
    hideToast();
  }

  let pending = {};

  const flush = debounce(() => {
    const patch = pending;
    pending = {};
    store.save(patch).then(() => toast());
  }, 250);

  function save(patch) {
    Object.assign(pending, patch);
    flush();
  }

  function openTab(id) {
    for (const tab of $$(".tab")) tab.classList.toggle("active", tab.dataset.tab === id);
    for (const page of $$(".page")) {
      const active = page.id === id;
      page.classList.toggle("active", active);
      if (active) $("#subtitle").textContent = page.dataset.subtitle;
    }
    chrome.storage.local.set({ lastTab: id });
  }

  function applyPopupTheme(theme) {
    const vars = {
      "--bg": theme.bg,
      "--panel": theme.surface,
      "--panel-2": colors.mix(theme.surface, theme.text, 0.05),
      "--border": colors.mix(theme.border, theme.surface, 0.2),
      "--text": theme.text,
      "--muted": theme.muted,
      "--accent": theme.accent,
      "--accent-soft": `${theme.accent}24`,
      "--win": theme.win,
      "--loss": theme.loss
    };
    for (const [name, value] of Object.entries(vars)) document.documentElement.style.setProperty(name, value);
  }

  function swatch(theme) {
    const outline = theme.border ? `;box-shadow:inset 0 0 0 1px ${theme.border}` : "";
    return `
      <div class="swatch" style="background:${theme.bg}">
        <div class="bar" style="background:${theme.surface}${outline}"></div>
        <div class="line" style="background:${theme.text}"></div>
        <div class="dot" style="background:${theme.accent}"></div>
      </div>`;
  }

  function renderThemes() {
    const custom = settings.customTheme
      ? swatch(themes.resolve({ theme: "custom", customTheme: settings.customTheme }))
      : `<div class="swatch rainbow"><span>+</span></div>`;

    $("#themes").innerHTML = [
      ...themes.PRESETS.map(t => `
        <button class="theme" data-theme="${t.id}" title="${t.name}">
          ${swatch(t)}
          <div class="theme-name">${t.name}</div>
        </button>`),
      `<button class="theme" data-theme="custom" title="Create your own theme">
        ${custom}
        <div class="theme-name">Custom</div>
      </button>`
    ].join("");

    for (const button of $$(".theme")) button.classList.toggle("selected", button.dataset.theme === settings.theme);
    $("#custom-editor").hidden = settings.theme !== "custom";
    applyPopupTheme(themes.resolve(settings));
  }

  function selectTheme(id) {
    if (id === "custom" && !settings.customTheme) {
      settings.customTheme = themes.pickColors(themes.resolve(settings));
    }
    settings.theme = id;
    fillColorEditor();
    renderThemes();
    save({ theme: id, customTheme: settings.customTheme });
  }

  function buildColorEditor() {
    const card = $("#custom-colors");
    const startRow = card.lastElementChild;

    for (const { key, label, desc } of COLOR_FIELDS) {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <div><div class="label">${label}</div><div class="desc">${desc}</div></div>
        <div class="color">
          <input type="color" data-color="${key}">
          <input class="text" type="text" maxlength="7" spellcheck="false" data-hex="${key}">
        </div>`;
      card.insertBefore(row, startRow);
    }

    $("#custom-base").innerHTML = `<option value="">Choose…</option>` +
      themes.PRESETS.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
  }

  function fillColorEditor() {
    const theme = themes.resolve({ theme: "custom", customTheme: settings.customTheme });
    for (const key of themes.COLOR_KEYS) {
      $(`[data-color="${key}"]`).value = theme[key];
      const hex = $(`[data-hex="${key}"]`);
      hex.value = theme[key];
      hex.classList.remove("invalid");
    }
  }

  function setCustomColor(key, value) {
    settings.customTheme = { ...themes.pickColors(themes.resolve({ theme: "custom", customTheme: settings.customTheme })), [key]: value };
    renderThemes();
    save({ customTheme: settings.customTheme });
  }

  function bindColorEditor() {
    const card = $("#custom-colors");

    card.addEventListener("input", event => {
      const { color, hex } = event.target.dataset;
      if (color) {
        const field = $(`[data-hex="${color}"]`);
        field.value = event.target.value;
        field.classList.remove("invalid");
        setCustomColor(color, event.target.value);
      }
      if (hex) {
        const raw = event.target.value.trim();
        const value = (raw.startsWith("#") ? raw : `#${raw}`).toLowerCase();
        const valid = colors.isHex(value);
        event.target.classList.toggle("invalid", !valid);
        if (!valid) return;
        $(`[data-color="${hex}"]`).value = value;
        setCustomColor(hex, value);
      }
    });

    $("#custom-base").addEventListener("change", event => {
      const preset = themes.PRESETS.find(t => t.id === event.target.value);
      event.target.value = "";
      if (!preset) return;
      settings.customTheme = themes.pickColors(themes.withDerivedColors(preset));
      fillColorEditor();
      renderThemes();
      save({ customTheme: settings.customTheme });
    });
  }

  const readPath = path => path.split(".").reduce((value, key) => value?.[key], settings);

  function writePath(path, value) {
    const [group, key] = path.split(".");
    settings[group] = { ...settings[group], [key]: value };
    return group;
  }

  function inputValue(input) {
    if (input.type === "checkbox") return input.checked;
    const typed = typeof readPath(input.dataset.bind);
    return typed === "number" ? Number(input.value) : input.value.trim();
  }

  function fillBindings() {
    for (const input of $$("[data-bind]")) {
      const value = readPath(input.dataset.bind);
      if (input.type === "checkbox") input.checked = Boolean(value);
      else input.value = value;
    }
    renderOutputs();
  }

  function renderOutputs() {
    for (const output of $$("[data-output]")) {
      const path = output.dataset.output;
      output.textContent = FORMATTERS[path](readPath(path));
    }
  }

  function bindInputs() {
    for (const input of $$("[data-bind]")) {
      const event = input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input";
      input.addEventListener(event, () => {
        const path = input.dataset.bind;
        const value = inputValue(input);
        const valid = VALIDATORS[path]?.(value) ?? true;
        input.classList.toggle("invalid", !valid);
        if (!valid) return;

        const group = writePath(path, value);
        renderOutputs();
        renderPreview();
        save({ [group]: settings[group] });
      });
    }

    $("#style-reset").addEventListener("click", () => {
      settings.style = { ...store.DEFAULTS.style };
      fillBindings();
      save({ style: settings.style });
    });
  }

  function bindShare() {
    const field = $("#theme-code");

    $("#theme-export").addEventListener("click", async () => {
      const code = themes.exportCode(settings);
      field.value = code;
      field.classList.remove("invalid");
      try {
        await navigator.clipboard.writeText(code);
        toast("Code copied ✓");
      } catch {
        field.select();
        toast("Copy the code below");
      }
    });

    const load = () => {
      const patch = themes.importCode(field.value, store.DEFAULTS.style);
      field.classList.toggle("invalid", !patch);
      if (!patch) return toast("Invalid code");

      Object.assign(settings, patch);
      field.value = "";
      fillColorEditor();
      fillBindings();
      renderThemes();
      Object.assign(pending, patch);
      flush();
      toast("Theme loaded ✓");
    };

    $("#theme-import").addEventListener("click", load);
    field.addEventListener("keydown", event => { if (event.key === "Enter") load(); });
    field.addEventListener("input", () => field.classList.remove("invalid"));
  }

  function renderPreview() {
    const { room } = settings;
    const { html } = chips.render(SAMPLE_PROFILE, SAMPLE_PLAYER, room);
    const empty = !room.stats ? "Stats are turned off" : html ? "" : "Nothing selected";

    $("#room-options").classList.toggle("disabled", !room.stats);
    $("#preview-chips").innerHTML = room.stats ? html : "";
    $("#preview-empty").textContent = empty;
  }

  function injectChipStyles() {
    const style = document.createElement("style");
    style.textContent = chips.CSS;
    document.head.appendChild(style);
  }

  async function init() {
    injectChipStyles();
    $("#version").textContent = `v${chrome.runtime.getManifest().version}`;
    $("#font-select").innerHTML = themes.FONTS.map(f => `<option value="${f.id}">${f.name}</option>`).join("");

    settings = await store.load();
    const { lastTab } = await chrome.storage.local.get("lastTab");

    buildColorEditor();
    fillColorEditor();
    fillBindings();
    renderThemes();
    renderPreview();
    openTab(lastTab ?? "appearance");

    bindColorEditor();
    bindInputs();
    bindShare();
    for (const tab of $$(".tab")) tab.addEventListener("click", () => openTab(tab.dataset.tab));
    $("#themes").addEventListener("click", event => {
      const button = event.target.closest("[data-theme]");
      if (button) selectTheme(button.dataset.theme);
    });
  }

  init();
})();
