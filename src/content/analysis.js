(() => {
  const { api, format } = globalThis.FB;

  const num = value => {
    const n = parseFloat(value);
    return Number.isNaN(n) ? null : n;
  };

  const average = values => {
    const present = values.filter(v => v !== null && v !== undefined);
    return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
  };

  const inRange = (value, min, max) => (value !== null && value >= min && value <= max ? value : null);

  const sum = (items, key) => items.reduce((total, item) => total + (item[key] || 0), 0);

  function parseGame(raw) {
    return {
      matchId: raw.matchId,
      map: raw.i1 || "?",
      win: raw.i10 === "1" ? 1 : 0,
      kills: num(raw.i6) ?? 0,
      assists: num(raw.i7) ?? 0,
      deaths: num(raw.i8) ?? 0,
      kpr: num(raw.c3),
      hs: num(raw.c4),
      adr: num(raw.c10),
      elo: num(raw.elo),
      date: raw.date || raw.created_at || 0
    };
  }

  function rating(stats) {
    if (!stats.n) return null;
    return 0.4 * stats.kd +
           0.3 * ((stats.adr ?? 70) / 75) +
           0.2 * ((stats.kpr ?? 0.65) / 0.68) +
           0.1 * (stats.winrate / 50);
  }

  function summarize(games) {
    const n = games.length;
    if (!n) return { n: 0 };

    const kills = sum(games, "kills");
    const deaths = sum(games, "deaths");
    const assists = sum(games, "assists");
    const wins = sum(games, "win");
    const stats = {
      n,
      kd: kills / Math.max(deaths, 1),
      kpr: average(games.map(g => g.kpr)),
      adr: average(games.map(g => g.adr)),
      hs: average(games.map(g => g.hs)),
      winrate: (wins / n) * 100,
      avgK: kills / n,
      avgD: deaths / n,
      avgA: assists / n
    };
    stats.rating = rating(stats);
    return stats;
  }

  // 0 at `from`, 1 at `to`, linear in between (works with from > to too).
  const ramp = (value, from, to) =>
    value === null || value === undefined ? 0 : Math.max(0, Math.min(1, (value - from) / (to - from)));

  function trustFactor(profile) {
    const { stats, accountAgeDays: age, matchesTotal: total, eloTrend, lifetimeKd, lifetimeHs } = profile;
    const elo = num(profile.elo);
    const penalties = [];
    const bonuses = [];
    const penalize = (points, why) => points >= 0.5 && penalties.push([points, why]);

    // Account maturity: smooth curves instead of hard steps.
    if (age !== null) penalize(25 * (1 - ramp(age, 0, 365)) ** 2, `account is ${age} days old`);
    if (total !== null) penalize(20 * (1 - ramp(total, 0, 500)) ** 2, `only ${format.matches(total)}`);

    // Strong stats on a long-established account are far less suspicious than on a fresh one.
    const maturity = age === null && total === null ? 0.5 : (ramp(age, 0, 730) + ramp(total, 0, 1000)) / (age !== null && total !== null ? 2 : 1);
    // Few recent matches = noisy stats, so weigh them less.
    const confidence = ramp(stats.n ?? 0, 3, 20);
    const exposure = (1 - 0.6 * maturity) * confidence;
    // High-ELO players legitimately post higher numbers.
    const skill = ramp(elo, 2000, 3500);

    if (stats.n) {
      const kdLimit = 1.25 + 0.25 * skill;
      penalize(18 * exposure * ramp(stats.kd, kdLimit, kdLimit + 0.6), `K/D ${stats.kd.toFixed(2)}`);
      penalize(14 * exposure * ramp(stats.hs, 58, 75), `HS ${Math.round(stats.hs)}%`);
      const adrLimit = 95 + 10 * skill;
      penalize(10 * exposure * ramp(stats.adr, adrLimit, adrLimit + 30), `ADR ${Math.round(stats.adr)}`);
      penalize(10 * exposure * ramp(stats.winrate, 65, 85), `WR ${Math.round(stats.winrate)}%`);
    }
    if (eloTrend !== null) {
      penalize(12 * (1 - 0.5 * maturity) * ramp(eloTrend, 200, 450), `${format.signed(eloTrend)} ELO in ${format.matches(stats.n)}`);
    }

    // Sudden jump compared to lifetime stats (account sharing, new "tools") — not reduced by maturity,
    // since it is exactly how an old account turns suspicious.
    if (stats.n && total >= 100) {
      if (lifetimeKd !== null) {
        penalize(15 * confidence * ramp(stats.kd - lifetimeKd, 0.25, 0.75),
          `K/D jumped ${lifetimeKd.toFixed(2)} → ${stats.kd.toFixed(2)}`);
      }
      if (lifetimeHs !== null && stats.hs !== null) {
        penalize(12 * confidence * ramp(stats.hs - lifetimeHs, 8, 20),
          `HS jumped ${Math.round(lifetimeHs)}% → ${Math.round(stats.hs)}%`);
      }
    }

    if (profile.verified) bonuses.push([5, "verified account"]);
    if (profile.memberships.includes("premium")) bonuses.push([3, "premium"]);

    const rounded = list => list.map(([points, why]) => [Math.round(points), why]).filter(([points]) => points > 0);
    const lost = rounded(penalties).sort((a, b) => b[0] - a[0]);
    const gained = rounded(bonuses);
    const reasons = [
      ...lost.map(([points, why]) => `−${points} ${why}`),
      ...gained.map(([points, why]) => `+${points} ${why}`)
    ];

    const totalOf = list => list.reduce((acc, [points]) => acc + points, 0);
    const score = Math.max(0, Math.min(100, 100 - totalOf(lost) + totalOf(gained)));
    const tone = score >= 75 ? "good" : score >= 50 ? "mid" : "bad";
    const label = { good: "Trusted", mid: "Neutral", bad: "Suspicious" }[tone];
    return { score, level: tone, label, reasons };
  }

  function smurfCheck(profile) {
    const { stats, accountAgeDays: age, matchesTotal: total, eloTrend, level } = profile;
    const fewMatches = total !== null && total < 200;
    const newAccount = age !== null && age < 120;
    if (!stats.n || !(fewMatches || newAccount)) return { flag: false, reasons: [] };

    const reasons = [];
    if (fewMatches) reasons.push(format.matches(total));
    if (newAccount) reasons.push(`${age}-day-old account`);

    const signals = [
      [stats.kd >= 1.3, `K/D ${stats.kd.toFixed(2)}`],
      [stats.adr >= 90, `ADR ${Math.round(stats.adr)}`],
      [stats.winrate >= 65, `WR ${Math.round(stats.winrate)}%`],
      [stats.hs >= 55, `HS ${Math.round(stats.hs)}%`],
      [level >= 8 && fewMatches, `level ${level}`],
      [eloTrend >= 200, `+${eloTrend} ELO`]
    ].filter(([hit]) => hit);

    reasons.push(...signals.map(([, why]) => why));
    return { flag: signals.length >= 2, reasons };
  }

  function buildProfile(player, history, lifetime, user) {
    const games = (Array.isArray(history) ? history : []).map(parseGame).sort((a, b) => b.date - a.date);
    const byMap = Map.groupBy(games, g => g.map);
    const elos = games.map(g => g.elo).filter(e => e !== null);
    const created = Date.parse(user?.activated_at ?? user?.created_at);

    const profile = {
      ...player,
      games,
      stats: summarize(games),
      form: games.slice(0, 5).map(g => (g.win ? "W" : "L")),
      maps: Object.fromEntries([...byMap].map(([map, list]) => [map, summarize(list)])),
      matchesTotal: num(lifetime?.lifetime?.m1),
      lifetimeKd: inRange(num(lifetime?.lifetime?.k5), 0.1, 5),
      lifetimeHs: inRange(num(lifetime?.lifetime?.k6), 1, 100),
      eloTrend: elos.length >= 2 ? elos[0] - elos[elos.length - 1] : null,
      accountAgeDays: Number.isNaN(created) ? null : Math.floor((Date.now() - created) / 864e5),
      verified: Boolean(user?.verified),
      country: /^[a-z]{2}$/i.test(user?.country ?? "") ? user.country.toLowerCase() : null,
      memberships: user?.memberships ?? []
    };

    profile.trust = trustFactor(profile);
    profile.smurf = smurfCheck(profile);
    return profile;
  }

  const cache = new Map();

  function loadProfile(player, range) {
    const key = `${player.id}|${range}`;
    if (!cache.has(key)) {
      const request = Promise.all([
        api.history(player.id, player.game, range),
        api.lifetime(player.id, player.game).catch(() => null),
        api.user(player.id).catch(() => null)
      ]).then(([history, lifetime, user]) => buildProfile(player, history, lifetime, user));
      request.catch(() => cache.delete(key));
      cache.set(key, request);
    }
    return cache.get(key);
  }

  function teamMaps(profiles) {
    const maps = new Map();
    for (const { games } of profiles) {
      for (const game of games) {
        if (!maps.has(game.map)) maps.set(game.map, new Map());
        const played = maps.get(game.map);
        if (!played.has(game.matchId)) played.set(game.matchId, game.win);
      }
    }
    return [...maps]
      .map(([map, played]) => {
        const n = played.size;
        const w = [...played.values()].reduce((a, b) => a + b, 0);
        return { map, name: format.mapName(map), n, w, winrate: n ? (w / n) * 100 : 0 };
      })
      .sort((a, b) => b.n - a.n);
  }

  function ratingOn(profile, map) {
    const overall = profile.stats.rating;
    const onMap = map ? profile.maps[map] : null;
    return onMap?.n >= 3 && overall !== null ? (overall + onMap.rating) / 2 : overall;
  }

  function largestParty(team, match) {
    const ids = new Set(team.roster.map(p => p.id));
    const sizes = (match.parties ?? []).map(party => party.users.filter(id => ids.has(id)).length);
    return Math.max(1, ...sizes);
  }

  function analyzeTeam(team, profiles, match, map) {
    const players = profiles.filter(p => p?.stats?.n);
    const statAverage = key => average(players.map(p => p.stats[key]));
    const maps = teamMaps(players);
    const formResults = players.flatMap(p => p.form);
    const ranked = players
      .map(p => ({ profile: p, rating: ratingOn(p, map) }))
      .filter(entry => entry.rating !== null)
      .sort((a, b) => b.rating - a.rating);

    const analysis = {
      players,
      maps,
      mapInfo: map ? maps.find(m => m.map === map) ?? { map, name: format.mapName(map), n: 0, w: 0, winrate: 0 } : null,
      form: formResults.length ? (formResults.filter(r => r === "W").length / formResults.length) * 100 : null,
      danger: ranked[0] ?? null,
      weakest: ranked.length > 1 ? ranked.at(-1) : null,
      party: largestParty(team, match),
      smurfs: players.filter(p => p.smurf.flag),
      avgElo: average(team.roster.map(p => num(p.elo))),
      eloTrend: average(players.map(p => p.eloTrend)),
      kd: statAverage("kd"),
      adr: statAverage("adr"),
      hs: statAverage("hs"),
      avgK: statAverage("avgK"),
      avgD: statAverage("avgD"),
      avgA: statAverage("avgA")
    };

    return { ...analysis, ...advise(analysis, map) };
  }

  function advise(a, map) {
    const strengths = [];
    const weaknesses = [];
    const tips = [];
    const pct = value => `${Math.round(value)}%`;
    const mapName = map ? format.mapName(map) : null;
    const info = a.mapInfo;

    if (info) {
      if (info.n >= 5 && info.winrate >= 60) {
        strengths.push(`Strong on ${mapName}: ${pct(info.winrate)} won (${format.matches(info.n)})`);
        tips.push(`${mapName} is their map — play slower and gather info with utility instead of blind aggression.`);
      } else if (info.n >= 3 && info.winrate <= 40) {
        weaknesses.push(`Weak on ${mapName}: ${pct(info.winrate)} won (${format.matches(info.n)})`);
        tips.push(`They struggle on ${mapName} — set the pace from the very first round.`);
      }
      if (info.n < 3) {
        weaknesses.push(`Rarely play ${mapName} (${info.n} of their recent matches)`);
        tips.push(`They barely know ${mapName} — fast executes and off-meta setups can catch them off guard.`);
      }
    }

    if (a.form !== null) {
      if (a.form >= 60) strengths.push(`In form: ${pct(a.form)} won in the last 5 matches`);
      else if (a.form <= 40) {
        weaknesses.push(`Out of form: ${pct(a.form)} won in the last 5 matches`);
        tips.push("They are on a bad run — winning the pistol rounds and an early lead can break them mentally.");
      }
    }

    if (a.eloTrend !== null && a.eloTrend >= 75) strengths.push(`Gaining ELO (avg ${format.signed(a.eloTrend)} per player)`);
    if (a.eloTrend !== null && a.eloTrend <= -75) weaknesses.push(`Losing ELO (avg ${format.signed(a.eloTrend)} per player)`);

    if (a.hs !== null && a.hs >= 55) {
      strengths.push(`Sharp aim: avg HS ${pct(a.hs)}`);
      tips.push("They aim well — avoid long open duels and smoke off their angles.");
    } else if (a.hs !== null && a.hs <= 40) {
      weaknesses.push(`Weaker aim: avg HS ${pct(a.hs)}`);
    }

    if (a.adr !== null && a.adr >= 85) strengths.push(`High damage output: avg ADR ${Math.round(a.adr)}`);
    else if (a.adr !== null && a.adr <= 70) weaknesses.push(`Low damage output: avg ADR ${Math.round(a.adr)}`);

    if (a.avgA !== null && a.avgA >= 5) {
      strengths.push(`Team play: ${a.avgA.toFixed(1)} assists per match`);
    } else if (a.avgA !== null && a.avgA <= 3.5) {
      weaknesses.push(`Few assists (${a.avgA.toFixed(1)} per match) — they play individually`);
      tips.push("They play solo — hit one site together; numbers and trades will win you rounds.");
    }

    if (a.avgK >= 17 && a.avgD >= 17) {
      tips.push("They play aggressively (many kills and deaths) — hold your angles and let them come to you.");
    }

    if (a.party >= 3) {
      strengths.push(`${a.party}-stack premade — better communication`);
      tips.push("The premade is coordinated — expect stacks and retakes, vary your pace and sites.");
    } else if (a.party === 1) {
      weaknesses.push("No premade — weaker communication");
    }

    if (a.danger) {
      const { profile: p } = a.danger;
      strengths.push(`${p.nickname} carries the team (K/D ${p.stats.kd.toFixed(2)}, ADR ${format.round(p.stats.adr)})`);
      tips.push(`Watch out for ${p.nickname} — never give them dry duels, flash before peeking and play for trades.`);
    }

    if (a.weakest) {
      const { profile: p } = a.weakest;
      if (p.stats.kd < 1) weaknesses.push(`${p.nickname} is the weak link (K/D ${p.stats.kd.toFixed(2)})`);
      tips.push(`Look for duels against ${p.nickname} — lowest rating on the team. Find where they play and hit that site.`);
    }

    for (const p of a.smurfs) {
      strengths.push(`${p.nickname} — possible smurf (${p.smurf.reasons.slice(0, 3).join(", ")})`);
      tips.push(`${p.nickname} may be a smurf — treat them as the biggest threat.`);
    }

    return { strengths, weaknesses, tips: tips.slice(0, 6) };
  }

  globalThis.FB.analysis = { loadProfile, analyzeTeam };
})();
