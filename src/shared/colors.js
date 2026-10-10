(() => {
  const FB = (globalThis.FB ??= {});

  const HEX = /^#[0-9a-f]{6}$/i;

  function hexToRgb(hex) {
    let value = String(hex ?? "").replace("#", "").trim();
    if (value.length === 3) value = [...value].map(c => c + c).join("");
    const n = parseInt(value, 16);
    if (value.length !== 6 || Number.isNaN(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mix(a, b, weight) {
    const from = hexToRgb(a);
    const to = hexToRgb(b);
    return "#" + from
      .map((v, i) => Math.round(v + (to[i] - v) * weight).toString(16).padStart(2, "0"))
      .join("");
  }

  const alpha = (color, percent) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

  const isHex = value => HEX.test(value);

  function hsl(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const channel = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    return "#" + [0, 8, 4].map(n => channel(n).toString(16).padStart(2, "0")).join("");
  }

  FB.colors = { hexToRgb, mix, alpha, isHex, hsl };
})();
