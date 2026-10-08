(() => {
  const { settings: store, dom } = globalThis.FB;

  const ATTR = "data-fb-panel";
  const CANDIDATES = "div, section, article, aside, li, a";
  const MIN_WIDTH = 120;
  const MIN_HEIGHT = 36;
  const SLASH_ALPHA = /\/\s*([\d.]+)(%?)\s*\)$/;
  const RGBA_ALPHA = /^rgba\([^)]*,\s*([\d.]+)\)$/;

  let enabled = false;
  let checked = new WeakSet();

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

  function isPanel(el, rect, cache) {
    if (rect.width >= innerWidth * 0.98) return false;
    if (el.closest(`[id^="${dom.OWN_PREFIX}"], .fb-chips`)) return false;

    const style = getComputedStyle(el);
    if (style.position === "fixed" || style.position === "sticky") return false;

    const background = style.backgroundColor;
    cache.set(el, background);
    if (alphaOf(background) === 0 || background === backgroundBehind(el, cache)) return false;

    const parent = el.parentElement;
    if (parent?.hasAttribute(ATTR)) {
      const outer = parent.getBoundingClientRect();
      if (Math.abs(outer.width - rect.width) < 4 && Math.abs(outer.height - rect.height) < 4) return false;
    }
    return true;
  }

  function scan() {
    if (!enabled || !document.body) return;
    const cache = new Map();
    for (const el of document.body.querySelectorAll(CANDIDATES)) {
      if (checked.has(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) continue;
      checked.add(el);
      if (isPanel(el, rect, cache)) el.setAttribute(ATTR, "");
    }
  }

  function reset() {
    for (const el of document.querySelectorAll(`[${ATTR}]`)) el.removeAttribute(ATTR);
    checked = new WeakSet();
  }

  function apply(settings) {
    reset();
    enabled = settings.style.borderWidth > 0;
    if (enabled) requestAnimationFrame(scan);
  }

  store.load().then(apply);
  store.onChange((settings, changed) => {
    if (changed.has("style") || changed.has("theme") || changed.has("customTheme")) apply(settings);
  });
  dom.onMutation(scan);
})();
