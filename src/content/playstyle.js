(() => {
  const FB = globalThis.FB;

  // FACEIT has no positional data (sites, angles) without parsing demos, so the role is inferred
  // from the extended stats it does track: opening duels, clutches, utility and sniper kills.
  const MIN_ROUNDS = 100;

  // Typical values for an average FACEIT player, used for the "avg" markers and the wording.
  const AVERAGE = {
    entryRate: 0.2,
    entrySuccess: 0.53,
    clutchRate: 0.06,
    flashRate: 0.4,
    utilDamage: 4,
    sniperShare: 0.1
  };

  const ROLES = {
    awp: { label: "AWPer", short: "AWP" },
    entry: { label: "Entry fragger", short: "Entry" },
    lurker: { label: "Lurker", short: "Lurk" },
    support: { label: "Support", short: "Support" },
    rifler: { label: "Rifler", short: "Rifler" }
  };

  const num = value => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  };

  const ramp = (value, from, to) =>
    value === null || value === undefined ? 0 : Math.max(0, Math.min(1, (value - from) / (to - from)));

  const pct = value => `${Math.round(value * 100)}%`;

  // Lifetime totals and per-map segments share the same "m" keys.
  function fromLifetime(raw) {
    if (!raw) return null;
    return {
      matches: num(raw.m35),
      rounds: num(raw.m20),
      kills: num(raw.m21),
      entries: num(raw.m23),
      entryWins: num(raw.m22),
      clutches: num(raw.m26) + num(raw.m28),
      clutchWins: num(raw.m25) + num(raw.m27),
      flashes: num(raw.m31),
      enemiesFlashed: num(raw.m29),
      utilDamage: num(raw.m32),
      utilCount: num(raw.m33),
      sniperKills: num(raw.m24)
    };
  }

  function rates(totals, source) {
    if (!totals || totals.rounds < MIN_ROUNDS) return null;
    const per = value => value / totals.rounds;
    return {
      source,
      matches: totals.matches,
      rounds: totals.rounds,
      kpr: per(totals.kills),
      entryRate: per(totals.entries),
      entrySuccess: totals.entries >= 10 ? totals.entryWins / totals.entries : null,
      clutchRate: per(totals.clutches),
      clutchWin: totals.clutches >= 10 ? totals.clutchWins / totals.clutches : null,
      flashRate: per(totals.flashes),
      enemiesFlashed: per(totals.enemiesFlashed),
      utilDamage: per(totals.utilDamage),
      sniperShare: totals.kills ? totals.sniperKills / totals.kills : 0
    };
  }

  function roleScores(r) {
    return {
      awp: ramp(r.sniperShare, 0.15, 0.35),
      entry: ramp(r.entryRate, 0.21, 0.27),
      // Lurkers rarely take the first duel, end up alone late in rounds and throw little team utility.
      lurker: 0.45 * ramp(r.entryRate, 0.2, 0.15) + 0.4 * ramp(r.clutchRate, 0.058, 0.08) + 0.15 * ramp(r.flashRate, 0.45, 0.2),
      support: Math.max(ramp(r.flashRate, 0.45, 0.65), ramp(r.utilDamage, 5, 7.5), ramp(r.enemiesFlashed, 0.33, 0.48))
    };
  }

  function traitsOf(r, stats) {
    const traits = [];
    const add = (tone, text) => traits.push({ tone, text });
    if (r.entrySuccess !== null && r.entryRate >= 0.17) {
      if (r.entrySuccess >= 0.58) add("bad", `wins ${pct(r.entrySuccess)} of opening duels`);
      else if (r.entrySuccess <= 0.45) add("good", `loses opening duels (${pct(r.entrySuccess)} won)`);
    }
    if (r.clutchWin !== null && r.clutchWin >= 0.45) add("bad", `strong in clutches (${pct(r.clutchWin)} won)`);
    if (r.flashRate <= 0.15) add("good", "almost never flashes");
    else if (r.flashRate >= 0.6) add("mid", `${r.flashRate.toFixed(1)} flashes per round`);
    if (r.utilDamage >= 6.5) add("mid", `${Math.round(r.utilDamage)} nade damage per round`);
    if (r.sniperShare >= 0.15 && r.sniperShare < 0.3) add("mid", `picks up the AWP sometimes (${pct(r.sniperShare)} of kills)`);
    if (stats?.hs >= 60) add("bad", `aims for the head (${Math.round(stats.hs)}% HS)`);
    if (stats?.multi >= 1.3) add("bad", `${stats.multi.toFixed(1)} rounds with 3+ kills per match`);
    return traits;
  }

  const READS = {
    awp: r => ({
      read: `Main AWP — ${pct(r.sniperShare)} of their kills are with a sniper.`,
      tip: "Smoke or flash their angle before crossing, never re-peek after they miss — they will reposition."
    }),
    entry: r => ({
      read: `First into the site — takes the opening duel in ${pct(r.entryRate)} of rounds` +
            (r.entrySuccess !== null ? ` and wins ${pct(r.entrySuccess)} of them.` : "."),
      tip: "Set up a crossfire on the entrance and use utility on first contact; a trade after their entry kills the push."
    }),
    lurker: r => ({
      read: `Lurk profile — opens only ${pct(r.entryRate)} of rounds but is alone in a 1vX in ${pct(r.clutchRate)} of rounds` +
            ` (avg ${pct(AVERAGE.clutchRate)}), so they play away from their team.`,
      tip: "Expect a flank late in the round: don't over-rotate on the first contact and keep someone watching the back."
    }),
    support: r => ({
      read: `Utility player — ${r.flashRate.toFixed(1)} flashes per round (avg ${AVERAGE.flashRate}) and ${Math.round(r.utilDamage)} nade damage per round.`,
      tip: "Their teammates come in behind flashes — turn away from pop-flashes and fall back instead of holding the peek."
    }),
    rifler: r => ({
      read: `Standard rifler — opens ${pct(r.entryRate)} of rounds, ${r.flashRate.toFixed(1)} flashes per round, nothing extreme.`,
      tip: null
    })
  };

  function classify(r, stats) {
    if (!r) return null;
    const scores = roleScores(r);
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [primary, score] = ranked[0][1] >= 0.5 ? ranked[0] : ["rifler", 0];
    const second = ranked.find(([id, value]) => id !== primary && value >= 0.5)?.[0] ?? null;
    const traits = traitsOf(r, stats);
    if (stats?.kpr >= 0.85 && stats?.adr >= 90) traits.unshift({ tone: "bad", text: "the team's star fragger" });
    const role = {
      id: primary,
      ...ROLES[primary],
      secondary: second ? ROLES[second] : null,
      confidence: primary === "rifler" ? null : score,
      traits,
      ...READS[primary](r),
      metrics: r
    };
    role.summary = describe(role);
    return role;
  }

  // Short multi-line summary for tooltips.
  function describe(role) {
    const r = role.metrics;
    const lines = [
      `Playstyle: ${role.label}${role.secondary ? ` / ${role.secondary.label}` : ""}`,
      `Opening duels: ${pct(r.entryRate)} of rounds${r.entrySuccess !== null ? `, ${pct(r.entrySuccess)} won` : ""}`,
      `1vX clutches: ${pct(r.clutchRate)} of rounds${r.clutchWin !== null ? `, ${pct(r.clutchWin)} won` : ""}`,
      `Flashes: ${r.flashRate.toFixed(2)} per round · nade dmg ${r.utilDamage.toFixed(1)}`,
      `AWP kills: ${pct(r.sniperShare)}`,
      `Based on ${r.source === "map" ? "career on this map" : "career stats"} (${r.rounds.toLocaleString("en-US")} rounds)`
    ];
    return lines.join("\n");
  }

  FB.playstyle = { AVERAGE, ROLES, fromLifetime, rates, classify };
})();
