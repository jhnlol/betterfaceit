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

  FB.colors = { hexToRgb, mix, alpha, isHex };
})();
