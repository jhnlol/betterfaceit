(() => {
  const { settings: store, dom } = globalThis.FB;

  const PANEL = "data-fb-panel";
  const BACKDROP = "data-fb-backdrop";
  const CANDIDATES = "div, section, article, aside, header, nav, li, a, dialog";
  const IGNORE = `button, [role="button"], [class*="Avatar"], [id^="${dom.OWN_PREFIX}"], .fb-chips`;
  const MIN_WIDTH = 120;
  const MIN_HEIGHT = 36;
  // Below this a background is a hover tint or table stripe, not a panel.
  const MIN_FILL_ALPHA = 0.2;
  const SIDES = ["Top", "Right", "Bottom", "Left"];
  const SLASH_ALPHA = /\/\s*([\d.]+)(%?)\s*\)$/;
  const RGBA_ALPHA = /^rgba\([^)]*,\s*([\d.]+)\)$/;

  const want = { panels: false, backdrops: false };
  // element -> className it was classified with, so React re-renders that swap classes get rechecked.
  let checked = new WeakMap();

  function alphaOf(color) {
    if (!color || color === "transparent") return 0;
    const slash = color.match(SLASH_ALPHA);
    if (slash) return parseFloat(slash[1]) / (slash[2] ? 100 : 1);
    const rgba = color.match(RGBA_ALPHA);
    return rgba ? parseFloat(rgba[1]) : 1;
  }

  function backgroundBehind(el, cache) {
    for (let node = el.parentElement; node; node = node.parentElement) {
      if (!cache.has(node)) cache.set(node, getComputedStyle(node).backgroundColor);
      const color = cache.get(node);
      if (alphaOf(color) > 0) return color;
    }
    return getComputedStyle(document.documentElement).backgroundColor;
  }

  // FACEIT draws most cards with a 1px border on a transparent background.
  const isOutlined = style => SIDES.every(side =>
    parseFloat(style[`border${side}Width`]) > 0 &&
    style[`border${side}Style`] !== "none" &&
    alphaOf(style[`border${side}Color`]) > 0
  );

  function classify(el, rect, cache) {
    const style = getComputedStyle(el);
    const background = style.backgroundColor;
    cache.set(el, background);

    const radius = parseFloat(style.borderTopLeftRadius) || 0;
    const fill = alphaOf(background);

    // Page-wide containers (the page itself, the main canvas) are never panels: outlining them
    // frames the whole page, and a backdrop-filter on them re-anchors every fixed popup inside
    // (accept-match dialog, menus) to the canvas and clips it.
    if (rect.width >= innerWidth * 0.9) {
      // Square layers in the normal flow are the page background itself
      // (fill may already be translucent from panel opacity).
      const inFlow = style.position === "static" || style.position === "relative";
      return radius === 0 && fill > 0 && inFlow && rect.height >= innerHeight * 0.6 ? BACKDROP : null;
    }
    if (el.closest(IGNORE)) return null;

    const filled = fill >= MIN_FILL_ALPHA && background !== backgroundBehind(el, cache);
    if (!filled && !(radius > 0 && isOutlined(style))) return null;

    const parent = el.parentElement;
    if (parent?.hasAttribute(PANEL)) {
      const outer = parent.getBoundingClientRect();
      if (Math.abs(outer.width - rect.width) < 4 && Math.abs(outer.height - rect.height) < 4) return null;
    }
    return PANEL;
  }

  function scan() {
    if (!(want.panels || want.backdrops) || !document.body) return;
    const cache = new Map();
    for (const el of document.body.querySelectorAll(CANDIDATES)) {
      const className = el.getAttribute("class") ?? "";
      if (checked.get(el) === className) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) continue;
      checked.set(el, className);

      el.removeAttribute(PANEL);
      el.removeAttribute(BACKDROP);
      const kind = classify(el, rect, cache);
      if ((kind === PANEL && want.panels) || (kind === BACKDROP && want.backdrops)) el.setAttribute(kind, "");
    }
  }

  function reset() {
    for (const el of document.querySelectorAll(`[${PANEL}], [${BACKDROP}]`)) {
      el.removeAttribute(PANEL);
      el.removeAttribute(BACKDROP);
    }
    checked = new WeakMap();
  }

  function apply({ style }) {
    reset();
    want.panels = style.borderWidth > 0 || style.blur > 0 || style.hover !== "none" || style.panelAccent !== "none";
    want.backdrops = Boolean(style.bgImage) || style.bgEffect !== "none";
    // Wait a frame so the new theme CSS is applied before reading computed colors.
    requestAnimationFrame(scan);
  }

  store.load().then(apply);
  store.onChange((settings, changed) => {
    if (changed.has("style") || changed.has("theme") || changed.has("customTheme")) apply(settings);
  });
  dom.onMutation(scan);
  addEventListener("resize", () => {
    checked = new WeakMap();
    scan();
  });
})();
