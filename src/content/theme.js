(() => {
  const { colors, themes, settings: store, dom, sheets } = globalThis.FB;

  const STYLE_ID = `${dom.OWN_PREFIX}-theme`;
  const FONT_ID = `${dom.OWN_PREFIX}-font`;
  const CUSTOM_ID = `${dom.OWN_PREFIX}-custom-css`;

  const RGB = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)\s*(,\s*[\d.]+\s*)?\)/g;
  const PIXELS = /^(\d+(?:\.\d+)?)px$/;
  const MAX_SCALED_RADIUS = 40;

  const FACEIT_COLORS = [
    [[255, 75, 0], t => t.accent],
    [[255, 85, 0], t => t.accent],
    [[255, 97, 43], (t, v) => v["--f-core-primary-hover"]],
    [[6, 6, 6], (t, v) => v["--f-surface-level-0"]],
    [[18, 18, 18], (t, v) => v["--f-surface-level-1"]],
    [[29, 29, 29], (t, v) => v["--f-surface-level-2"]],
    [[36, 36, 36], (t, v) => v["--f-surface-level-3"]],
    [[46, 46, 46], (t, v) => v["--f-surface-level-4"]],
    [[56, 56, 56], (t, v) => v["--f-core-secondary-enabled"]],
    [[93, 93, 93], (t, v) => v["--f-core-secondary-hover"]],
    [[167, 167, 167], t => t.muted],
    [[5, 255, 0], t => t.win],
    [[239, 0, 0], t => t.loss]
  ];

  const BACKGROUND_PROP = /^background(-color)?$/;

  const state = {
    theme: null,
    style: null,
    customCss: "",
    colorMap: null,
    rewriteKey: null,
    touched: new Map(),
    seen: new WeakSet()
  };

  const usesGlass = style => style.panelOpacity < 100;

  // rgb key -> { rgb: replacement color, level: surface level whose --fb-glass-N var backgrounds use }
  function buildColorMap(theme, style) {
    const map = new Map();
    if (!theme.native) {
      const vars = themes.buildVars(theme);
      for (const [rgb, pick] of FACEIT_COLORS) map.set(rgb.join(","), { rgb: colors.hexToRgb(pick(theme, vars)) });
    }
    if (usesGlass(style)) {
      themes.NATIVE_SURFACES.forEach((hex, level) => {
        const key = colors.hexToRgb(hex).join(",");
        map.set(key, { ...map.get(key), level });
      });
    }
    return map.size ? map : null;
  }

  function recolor(value, prop) {
    const background = BACKGROUND_PROP.test(prop);
    return value.replace(RGB, (match, r, g, b, a) => {
      const to = state.colorMap.get(`${r},${g},${b}`);
      if (background && to?.level !== undefined) {
        const glass = `var(--fb-glass-${to.level})`;
        if (!a) return glass;
        const opacity = parseFloat(a.slice(a.indexOf(",") + 1)) * 100;
        return `color-mix(in srgb, ${glass} ${opacity}%, transparent)`;
      }
      if (!to?.rgb) return match;
      return a ? `rgba(${to.rgb.join(", ")}${a})` : `rgb(${to.rgb.join(", ")})`;
    });
  }

  function setProperty(rule, prop, value) {
    const { style } = rule;
    if (!state.touched.has(rule)) state.touched.set(rule, new Map());
    const original = state.touched.get(rule);
    if (!original.has(prop)) original.set(prop, [style.getPropertyValue(prop), style.getPropertyPriority(prop)]);
    style.setProperty(prop, value, style.getPropertyPriority(prop));
  }

  function rewriteRule(rule) {
    if (state.seen.has(rule)) return;
    state.seen.add(rule);

    if (rule.cssRules) for (const child of rule.cssRules) rewriteRule(child);
    if (!rule.style || rule.selectorText === undefined) return;

    const { style } = rule;
    const changes = [];

    for (const prop of style) {
      if (prop.startsWith("--")) continue;
      const value = style.getPropertyValue(prop);

      if (state.colorMap && value.includes("rgb")) {
        const next = recolor(value, prop);
        if (next !== value) changes.push([prop, next]);
      }

      if (state.style.roundness !== 100 && prop.endsWith("-radius")) {
        const px = Number(value.match(PIXELS)?.[1]);
        if (px > 0 && px < MAX_SCALED_RADIUS) changes.push([prop, `calc(${px}px * var(--fb-radius-scale))`]);
      }
    }

    for (const [prop, value] of changes) setProperty(rule, prop, value);
  }

  const needsRewrite = () => Boolean(state.colorMap) || state.style.roundness !== 100;

  function rewriteSheets() {
    if (!state.style || !needsRewrite()) return;
    for (const sheet of document.styleSheets) {
      if (dom.isOwn(sheet.ownerNode)) continue;
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) rewriteRule(rule);
    }
  }

  function restoreSheets() {
    for (const [rule, props] of state.touched) {
      for (const [prop, [value, priority]] of props) {
        if (value) rule.style.setProperty(prop, value, priority);
        else rule.style.removeProperty(prop);
      }
    }
    state.touched.clear();
    state.seen = new WeakSet();
  }

  function applyFont() {
    const href = themes.fontUrl(state.style);
    let link = document.getElementById(FONT_ID);
    if (!href) {
      link?.remove();
      return;
    }
    if (!link) {
      link = document.createElement("link");
      link.id = FONT_ID;
      link.rel = "stylesheet";
      (document.head ?? document.documentElement).appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }

  function injectCss() {
    dom.upsertStyle(STYLE_ID, themes.buildCss(state.theme, state.style), { last: true });
    dom.upsertStyle(CUSTOM_ID, state.customCss, { last: true });
    applyFont();
  }

  // Scale is real browser zoom (set by the background worker). Only touch it when the option is in
  // use or was just turned back to 100%, so a user's own Ctrl +/- zoom is left alone otherwise.
  async function applyZoom(scale) {
    try {
      const { appliedScale = 100 } = await chrome.storage.local.get("appliedScale");
      if (scale === 100 && appliedScale === 100) return;
      await chrome.runtime.sendMessage({ type: "fb-zoom", factor: scale / 100 });
      if (appliedScale !== scale) await chrome.storage.local.set({ appliedScale: scale });
    } catch {}
  }

  function apply(settings) {
    applyZoom(settings.style.scale);
    state.theme = themes.resolve(settings);
    state.style = settings.style;
    state.customCss = settings.customCss;
    injectCss();

    const key = JSON.stringify([
      state.theme.native ? null : themes.pickColors(state.theme),
      state.style.roundness !== 100,
      usesGlass(state.style)
    ]);
    if (key === state.rewriteKey) return;
    state.rewriteKey = key;

    restoreSheets();
    state.colorMap = buildColorMap(state.theme, state.style);
    sheets.setEnabled(needsRewrite());
    rewriteSheets();
  }

  store.load().then(apply);
  store.onChange((settings, changed) => {
    if (changed.has("theme") || changed.has("customTheme") || changed.has("style") || changed.has("customCss")) apply(settings);
  });

  dom.onMutation(() => {
    if (!state.theme) return;
    for (const id of [STYLE_ID, CUSTOM_ID]) {
      const el = document.getElementById(id);
      if (el) dom.keepLast(el);
    }
    rewriteSheets();
  });

  document.addEventListener("DOMContentLoaded", () => state.theme && injectCss());
})();
