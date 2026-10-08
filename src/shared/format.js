(() => {
  const FB = (globalThis.FB ??= {});

  const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ENTITIES[c]);

  const matches = n => `${n} ${n === 1 ? "match" : "matches"}`;

  function mapName(id) {
    const name = String(id ?? "").replace(/^(de|cs)_/, "");
    return name ? name[0].toUpperCase() + name.slice(1) : "?";
  }

  const round = value => (value === null || value === undefined ? "–" : String(Math.round(value)));

  const fixed = (value, digits = 2) => (value === null || value === undefined ? "–" : value.toFixed(digits));

  const signed = value => (value === null || value === undefined ? "–" : `${value >= 0 ? "+" : ""}${Math.round(value)}`);

  FB.format = { escape, matches, mapName, round, fixed, signed };
})();
