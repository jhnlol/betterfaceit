(() => {
  const FB = (globalThis.FB ??= {});

  const PRESETS = Object.freeze([
    { id: "faceit",    name: "FACEIT",      bg: "#121212", surface: "#1d1d1d", accent: "#ff4b00", text: "#f1f1f1", native: true },
    { id: "midnight",  name: "Midnight",    bg: "#0b1120", surface: "#151d2e", accent: "#3b82f6", text: "#e5ecf7" },
    { id: "toxic",     name: "Toxic",       bg: "#0a0f0a", surface: "#141c14", accent: "#39ff14", text: "#e6f5e6" },
    { id: "purple",    name: "Purple Haze", bg: "#0f0a17", surface: "#1b1328", accent: "#a855f7", text: "#eee6f7" },
    { id: "blood",     name: "Blood",       bg: "#0e0808", surface: "#1b1010", accent: "#ef4444", text: "#f3e6e6" },
    { id: "synthwave", name: "Synthwave",   bg: "#120b1a", surface: "#1f1230", accent: "#ff2bd6", text: "#f7e6f5", border: "#4a1f5c" },
    { id: "ocean",     name: "Ocean",       bg: "#071315", surface: "#0f2226", accent: "#22d3ee", text: "#e3f6f8" },
    { id: "gold",      name: "Royal Gold",  bg: "#0d0b06", surface: "#1a170e", accent: "#ffc700", text: "#f6f1e1", border: "#3a3216" },
    { id: "amoled",    name: "AMOLED",      bg: "#000000", surface: "#0c0c0c", accent: "#ff5500", text: "#ffffff" },
    { id: "nord",      name: "Nord",        bg: "#2e3440", surface: "#3b4252", accent: "#88c0d0", text: "#eceff4", win: "#a3be8c", loss: "#bf616a" },
    { id: "dracula",   name: "Dracula",     bg: "#1e1f29", surface: "#282a36", accent: "#ff79c6", text: "#f8f8f2", win: "#50fa7b", loss: "#ff5555" },
    { id: "tokyo",     name: "Tokyo Night", bg: "#1a1b26", surface: "#24283b", accent: "#7aa2f7", text: "#c0caf5", win: "#9ece6a", loss: "#f7768e" },
    { id: "catppuccin", name: "Catppuccin", bg: "#1e1e2e", surface: "#313244", accent: "#cba6f7", text: "#cdd6f4", win: "#a6e3a1", loss: "#f38ba8" },
    { id: "gruvbox",   name: "Gruvbox",     bg: "#1d2021", surface: "#282828", accent: "#fe8019", text: "#ebdbb2", win: "#b8bb26", loss: "#fb4934" },
    { id: "rosepine",  name: "Rosé Pine",   bg: "#191724", surface: "#1f1d2e", accent: "#ebbcba", text: "#e0def4", win: "#9ccfd8", loss: "#eb6f92" }
  ]);

  const COLOR_KEYS = Object.freeze(["bg", "surface", "border", "accent", "text", "muted", "win", "loss"]);

  const CUSTOM_BASE = Object.freeze({ id: "custom", name: "Custom", bg: "#101418", surface: "#1a2027", accent: "#00e5a0", text: "#eef2f5" });

  const FONTS = Object.freeze([
    { id: "default",        name: "Geist (FACEIT)" },
    { id: "Inter",          name: "Inter",          google: "Inter:wght@400;500;600;700;800" },
    { id: "Montserrat",     name: "Montserrat",     google: "Montserrat:wght@400;500;600;700;800" },
    { id: "Poppins",        name: "Poppins",        google: "Poppins:wght@400;500;600;700;800" },
    { id: "Rajdhani",       name: "Rajdhani",       google: "Rajdhani:wght@400;500;600;700" },
    { id: "Exo 2",          name: "Exo 2",          google: "Exo+2:wght@400;500;600;700;800" },
    { id: "Chakra Petch",   name: "Chakra Petch",   google: "Chakra+Petch:wght@400;500;600;700" },
    { id: "JetBrains Mono", name: "JetBrains Mono", google: "JetBrains+Mono:wght@400;500;600;700;800" },
    { id: "Segoe UI",       name: "Segoe UI (system)" },
    { id: "Verdana",        name: "Verdana (system)" }
  ]);

  const BG_EFFECTS = Object.freeze(["none", "glow", "aurora", "grid", "dots", "vignette"]);

  const MAX_CSS = 5000;

  const AD_SELECTORS = '[class*="AdPlacement"], [id^="div-gpt-ad"], iframe[id^="google_ads_iframe"]';

  function withDerivedColors(theme) {
    const { mix } = FB.colors;
    return {
      ...theme,
      border: theme.border || mix(theme.surface, theme.text, 0.18),
      muted: theme.muted || mix(theme.text, theme.bg, 0.38),
      win: theme.win || "#05ff00",
      loss: theme.loss || "#ef0000"
    };
  }

  // Dark palette tinted with one hue — used by "Randomize" in the custom theme editor.
  function generate(hue = Math.floor(Math.random() * 360)) {
    const { hsl } = FB.colors;
    return {
      bg: hsl(hue, 28, 6),
      surface: hsl(hue, 22, 11),
      accent: hsl(hue, 90, 58),
      text: hsl(hue, 25, 93)
    };
  }

  function resolve(settings) {
    const theme = settings.theme === "custom"
      ? { ...CUSTOM_BASE, ...settings.customTheme, id: "custom" }
      : PRESETS.find(t => t.id === settings.theme) ?? PRESETS[0];
    return withDerivedColors(theme);
  }

  function pickColors(theme) {
    return Object.fromEntries(COLOR_KEYS.map(key => [key, theme[key]]));
  }

  function buildVars(theme) {
    const { mix, alpha } = FB.colors;
    const { bg, surface, accent, text, muted, win, loss } = theme;
    const level0 = mix(bg, "#000000", 0.45);
    const level3 = mix(surface, text, 0.04);
    const level4 = mix(surface, text, 0.09);
    const secondary = mix(surface, text, 0.14);
    const secondaryHover = mix(surface, text, 0.28);
    const accentHover = mix(accent, "#ffffff", 0.12);

    return {
      "--f-surface-level-0": level0,
      "--f-surface-level-1": bg,
      "--f-surface-level-2": surface,
      "--f-surface-level-3": level3,
      "--f-surface-level-4": level4,
      "--f-palette-gray-100": level0,
      "--f-palette-gray-90": bg,
      "--f-palette-gray-80": surface,
      "--f-palette-gray-60": level4,
      "--f-black-full": level0,
      "--f-black-high": alpha(level0, 88),
      "--f-black-medium": alpha(level0, 60),
      "--f-black-low": alpha(level0, 40),
      "--f-black-disabled": alpha(level0, 20),
      "--f-common-overlay": alpha(level0, 88),
      "--f-white-full": text,
      "--f-white-high": mix(text, muted, 0.5),
      "--f-white-medium": muted,
      "--f-white-low": mix(muted, bg, 0.4),
      "--f-white-disabled": secondary,
      "--f-interaction-enabled": alpha(text, 5),
      "--f-interaction-active": alpha(text, 5),
      "--f-interaction-focused": alpha(text, 8),
      "--f-interaction-hover": alpha(text, 16),
      "--f-core-primary-enabled": accent,
      "--f-core-primary-active": accent,
      "--f-core-primary-hover": accentHover,
      "--f-core-primary-focused": accentHover,
      "--f-core-primary-high": alpha(accent, 24),
      "--f-core-primary-medium": alpha(accent, 16),
      "--f-core-primary-low": alpha(accent, 8),
      "--f-core-secondary-enabled": secondary,
      "--f-core-secondary-active": secondary,
      "--f-core-secondary-hover": secondaryHover,
      "--f-core-secondary-focused": secondaryHover,
      "--f-core-secondary-high": alpha(secondary, 24),
      "--f-core-secondary-medium": alpha(secondary, 16),
      "--f-core-secondary-low": alpha(secondary, 8),
      "--f-common-outcome-win": win,
      "--f-common-success": win,
      "--f-common-online": win,
      "--f-common-outcome-loss": loss,
      "--f-common-error": loss,
      "--f-common-destructive": loss,
      "--f-common-playing": accent,
      "--f-focus-visible-outline": `1px solid ${accent}`
    };
  }

  function fontFamily(style) {
    const font = FONTS.find(f => f.id === style.font);
    return font && font.id !== "default" ? `"${font.id}", "Segoe UI", system-ui, sans-serif` : "";
  }

  function fontUrl(style) {
    const font = FONTS.find(f => f.id === style.font);
    return font?.google ? `https://fonts.googleapis.com/css2?family=${font.google}&display=swap` : "";
  }

  function shadowVars(theme, mode) {
    const { alpha } = FB.colors;
    switch (mode) {
      case "none":
        return { "--f-shadow-s": "none", "--f-shadow-l": "none" };
      case "strong":
        return { "--f-shadow-s": "0 4px 14px 4px rgba(0, 0, 0, .55)", "--f-shadow-l": "0 8px 28px 8px rgba(0, 0, 0, .7)" };
      case "glow":
        return { "--f-shadow-s": `0 0 12px 2px ${alpha(theme.accent, 35)}`, "--f-shadow-l": `0 0 24px 4px ${alpha(theme.accent, 40)}` };
      default:
        return {};
    }
  }

  // Each layer: [image, size]. Effects sit on top of the (dimmed) background image.
  function backgroundLayers(theme, style) {
    const { alpha, mix } = FB.colors;
    const { accent, text } = theme;
    const layers = {
      glow: [
        [`radial-gradient(1200px 650px at 10% -10%, ${alpha(accent, 20)}, transparent 65%)`, "auto"],
        [`radial-gradient(900px 500px at 110% 0%, ${alpha(accent, 10)}, transparent 60%)`, "auto"]
      ],
      aurora: [
        [`radial-gradient(1100px 600px at 15% 0%, ${alpha(accent, 22)}, transparent 60%)`, "auto"],
        [`radial-gradient(1000px 650px at 85% 10%, ${alpha(mix(accent, "#7c3aed", 0.55), 20)}, transparent 60%)`, "auto"],
        [`radial-gradient(1200px 500px at 50% 110%, ${alpha(mix(accent, "#06b6d4", 0.5), 12)}, transparent 60%)`, "auto"]
      ],
      grid: [
        [`linear-gradient(${alpha(text, 4)} 1px, transparent 1px)`, "36px 36px"],
        [`linear-gradient(90deg, ${alpha(text, 4)} 1px, transparent 1px)`, "36px 36px"]
      ],
      dots: [[`radial-gradient(${alpha(text, 8)} 1px, transparent 1.5px)`, "20px 20px"]],
      vignette: [["radial-gradient(ellipse at center, transparent 45%, rgba(0, 0, 0, .55))", "auto"]]
    }[style.bgEffect] ?? [];

    if (style.bgImage) {
      const url = style.bgImage.replace(/["\\\n]/g, "");
      const dim = alpha(theme.bg, style.bgDim);
      layers.push([`linear-gradient(${dim}, ${dim})`, "auto"], [`url("${url}")`, "cover"]);
    }
    return layers;
  }

  // FACEIT's own surface colors, level 0 (darkest) to 4.
  const NATIVE_SURFACES = Object.freeze(["#060606", "#121212", "#1d1d1d", "#242424", "#2e2e2e"]);

  function surfaces(theme) {
    if (theme.native) return NATIVE_SURFACES;
    const vars = buildVars(theme);
    return [0, 1, 2, 3, 4].map(level => vars[`--f-surface-level-${level}`]);
  }

  // --fb-glass-N: surface backgrounds with panel opacity applied. theme.js points FACEIT's
  // hard-coded background colors at these, so opacity reaches panels that don't use CSS variables.
  function panelVars(theme, style) {
    const { alpha } = FB.colors;
    const opaque = style.panelOpacity >= 100;
    const levels = surfaces(theme).map(color => (opaque ? color : alpha(color, style.panelOpacity)));
    const vars = Object.fromEntries(levels.map((color, level) => [`--fb-glass-${level}`, color]));
    if (opaque) return vars;

    levels.forEach((color, level) => { vars[`--f-surface-level-${level}`] = color; });
    Object.assign(vars, {
      "--f-palette-gray-100": levels[0],
      "--f-palette-gray-90": levels[1],
      "--f-palette-gray-80": levels[2],
      "--f-palette-gray-60": levels[4]
    });
    return vars;
  }

  // Accent line and hover highlight on detected panels. Both are box-shadows, so they're combined
  // into one value per state. No transforms: they would re-anchor fixed popups inside the panel.
  function panelEffects(theme, style) {
    const { alpha } = FB.colors;
    const line = {
      top: `inset 0 2px 0 ${theme.accent}`,
      left: `inset 3px 0 0 ${theme.accent}`
    }[style.panelAccent];
    const hover = {
      glow: `0 0 0 1px ${alpha(theme.accent, 65)}, 0 0 26px ${alpha(theme.accent, 32)}`,
      outline: `inset 0 0 0 1px ${theme.accent}`
    }[style.hover];
    if (!line && !hover) return [];

    // Only the innermost hovered panel lights up, not every panel around it.
    const outer = "[data-fb-panel]:not([data-fb-panel] [data-fb-panel])";
    const hovered = ":hover:not(:has([data-fb-panel]:hover))";
    const rules = [];
    if (line) rules.push(`${outer} { box-shadow: ${line} !important; }`);
    if (hover) {
      rules.push("[data-fb-panel] { transition: box-shadow .15s ease; }");
      rules.push(`[data-fb-panel]${hovered} { box-shadow: ${hover} !important; }`);
      if (line) rules.push(`${outer}${hovered} { box-shadow: ${line}, ${hover} !important; }`);
    }
    return rules;
  }

  function buildCss(theme, style) {
    const { alpha } = FB.colors;
    const font = fontFamily(style);
    const vars = {
      ...(theme.native ? {} : buildVars(theme)),
      ...shadowVars(theme, style.shadows),
      ...panelVars(theme, style),
      "--fb-radius-scale": String(style.roundness / 100),
      ...(font ? { "--f-font-family": font, "--font-geist": font } : {})
    };

    const rules = [
      `html:root, :root {\n${Object.entries(vars).map(([k, v]) => `  ${k}: ${v} !important;`).join("\n")}\n}`
    ];

    if (!theme.native) {
      rules.push(`html, body { background-color: ${theme.bg} !important; }`);
      rules.push(`::selection { background: ${alpha(theme.accent, 40)}; }`);
    }
    if (font) rules.push(`body, body :not(code, pre, kbd, samp) { font-family: ${font} !important; }`);
    if (style.borderWidth > 0) {
      const color = style.borderColor === "accent" ? alpha(theme.accent, 55) : theme.border;
      rules.push(`[data-fb-panel] { outline: ${style.borderWidth}px solid ${color} !important; outline-offset: -${style.borderWidth}px; }`);
    }
    rules.push(...panelEffects(theme, style));
    if (style.blur > 0) {
      // Outermost panels only: nested blurs cost a lot and look the same.
      rules.push(`[data-fb-panel]:not([data-fb-panel] [data-fb-panel]) { backdrop-filter: blur(${style.blur}px) saturate(1.2); }`);
    }
    if (style.scrollbar) rules.push(`* { scrollbar-color: ${alpha(theme.accent, 70)} transparent; }`);
    if (style.thinScrollbar) rules.push("* { scrollbar-width: thin; }");

    const layers = backgroundLayers(theme, style);
    if (layers.length) {
      const list = pick => layers.map(pick).join(", ");
      rules.push(`html {
  background-color: ${theme.bg} !important;
  background-image: ${list(([image]) => image)} !important;
  background-size: ${list(([, size]) => size)} !important;
  background-repeat: ${list(([, size]) => (size.includes("px") ? "repeat" : "no-repeat"))} !important;
  background-position: center !important;
  background-attachment: fixed !important;
}`);
      // Page-sized wrappers would otherwise paint over the background.
      rules.push("body, [data-fb-backdrop] { background-color: transparent !important; background-image: none !important; }");
    }
    if (style.hideAds) rules.push(`${AD_SELECTORS} { display: none !important; }`);
    if (!style.animations) {
      rules.push("*, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }");
    }

    return rules.join("\n");
  }

  const SHARE_PREFIX = "FB1.";
  const SHADOWS = ["default", "none", "strong", "glow"];
  const ENUMS = {
    shadows: SHADOWS,
    bgEffect: BG_EFFECTS,
    borderColor: ["theme", "accent"],
    hover: ["none", "glow", "outline"],
    panelAccent: ["none", "top", "left"]
  };
  const RANGES = { roundness: [0, 200], borderWidth: [0, 3], scale: [80, 120], bgDim: [0, 95], panelOpacity: [40, 100], blur: [0, 20] };

  function toBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function fromBase64Url(code) {
    const binary = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
  }

  function exportCode(settings) {
    const payload = { theme: settings.theme, style: settings.style };
    if (settings.theme === "custom") payload.colors = pickColors(resolve(settings));
    if (settings.customCss) payload.css = settings.customCss;
    return SHARE_PREFIX + toBase64Url(JSON.stringify(payload));
  }

  function sanitizeStyle(raw, defaults) {
    const style = {};
    for (const [key, fallback] of Object.entries(defaults)) {
      const value = raw?.[key];
      if (typeof value !== typeof fallback) continue;
      if (typeof value === "number") {
        const [min, max] = RANGES[key] ?? [-Infinity, Infinity];
        if (Number.isFinite(value)) style[key] = Math.min(max, Math.max(min, value));
      } else {
        style[key] = value;
      }
    }
    if (style.font && !FONTS.some(f => f.id === style.font)) delete style.font;
    for (const [key, allowed] of Object.entries(ENUMS)) {
      if (style[key] !== undefined && !allowed.includes(style[key])) delete style[key];
    }
    if (style.bgImage && !/^https?:\/\/\S+$/i.test(style.bgImage)) delete style.bgImage;
    return { ...defaults, ...style };
  }

  function importCode(code, defaultStyle) {
    const trimmed = String(code ?? "").trim();
    if (!trimmed.startsWith(SHARE_PREFIX)) return null;

    let payload;
    try {
      payload = JSON.parse(fromBase64Url(trimmed.slice(SHARE_PREFIX.length)));
    } catch {
      return null;
    }
    if (!payload || typeof payload !== "object") return null;

    const style = sanitizeStyle(payload.style, defaultStyle);
    const extra = typeof payload.css === "string" ? { customCss: payload.css.slice(0, MAX_CSS) } : {};
    if (payload.theme === "custom") {
      const colors = Object.fromEntries(
        COLOR_KEYS.filter(key => FB.colors.isHex(payload.colors?.[key])).map(key => [key, payload.colors[key].toLowerCase()])
      );
      return { theme: "custom", customTheme: colors, style, ...extra };
    }
    if (!PRESETS.some(t => t.id === payload.theme)) return null;
    return { theme: payload.theme, style, ...extra };
  }

  FB.themes = { NATIVE_SURFACES, PRESETS, COLOR_KEYS, CUSTOM_BASE, FONTS, BG_EFFECTS, MAX_CSS, generate, resolve, withDerivedColors, pickColors, buildVars, buildCss, fontUrl, exportCode, importCode };
})();
