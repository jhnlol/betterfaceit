(() => {
  const { api, dom } = globalThis.FB;

  const VOTE_POLL_MS = 10000;
  const FINAL_STATES = new Set(["FINISHED", "CANCELLED"]);

  const state = {
    id: null,
    match: null,
    teams: [],
    players: new Map(),
    map: null,
    meId: null
  };

  const listeners = new Set();
  let loading = null;

  const notify = () => listeners.forEach(listener => listener(state));

  const roomIdFromUrl = () => location.pathname.match(/\/room\/([^/?#]+)/)?.[1] ?? null;

  const pickedMap = match => match.voting?.map?.pick?.[0] ?? null;

  function setMatch(match) {
    state.match = match;
    state.map = pickedMap(match);
    state.players = new Map();
    state.teams = Object.entries(match.teams ?? {}).map(([key, team]) => {
      const roster = (team.roster ?? []).map(p => ({
        id: p.id,
        nickname: p.nickname,
        steam: p.gameId,
        game: match.game || "cs2",
        level: p.gameSkillLevel,
        elo: p.elo,
        team: key
      }));
      for (const player of roster) state.players.set(player.nickname.toLowerCase(), player);
      return { key, name: team.name, roster };
    });
  }

  function reset(id) {
    Object.assign(state, { id, match: null, teams: [], players: new Map(), map: null });
    loading = null;
  }

  function load(id) {
    loading = api.match(id)
      .then(match => {
        if (state.id !== id) return;
        setMatch(match);
        notify();
      })
      .catch(() => {
        if (state.id === id) loading = null;
      });

    api.me().then(meId => {
      if (state.id !== id || state.meId === meId) return;
      state.meId = meId;
      notify();
    });
  }

  function sync() {
    const id = roomIdFromUrl();
    if (id !== state.id) {
      reset(id);
      notify();
    }
    if (state.id && !state.match && !loading) load(state.id);
  }

  function pollVote() {
    const { id, match, map } = state;
    if (!id || !match || map || FINAL_STATES.has(match.state)) return;
    api.match(id)
      .then(next => {
        if (state.id !== id) return;
        setMatch(next);
        if (state.map !== map) notify();
      })
      .catch(() => {});
  }

  dom.onMutation(sync);
  setInterval(pollVote, VOTE_POLL_MS);
  sync();

  globalThis.FB.room = {
    state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
    }
  };
})();
