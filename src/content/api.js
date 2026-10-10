(() => {
  const FB = globalThis.FB;

  const MAX_PARALLEL = 4;
  const RETRY_DELAY = 1200;
  const RETRYABLE = new Set([429, 500, 502, 503, 504]);

  const queue = [];
  let active = 0;

  class HttpError extends Error {
    constructor(status, url) {
      super(`${status} ${url}`);
      this.status = status;
    }
  }

  // FACEIT rate-limits the stats service (429 + Retry-After, up to a minute). Pause the whole queue
  // instead of failing, otherwise every player card after the limit would show "No stats".
  const MAX_RETRY_AFTER = 65000;
  let pausedUntil = 0;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function retryDelay(response) {
    const seconds = parseFloat(response.headers.get("retry-after"));
    return Number.isFinite(seconds) ? Math.min(seconds * 1000, MAX_RETRY_AFTER) : RETRY_DELAY;
  }

  async function request(url, retries = 2) {
    const wait = pausedUntil - Date.now();
    if (wait > 0) await sleep(wait);
    const response = await fetch(url, { credentials: "include" });
    if (response.ok) return response.json();
    if (retries > 0 && RETRYABLE.has(response.status)) {
      const delay = retryDelay(response);
      if (response.status === 429) pausedUntil = Math.max(pausedUntil, Date.now() + delay);
      await sleep(delay);
      return request(url, retries - 1);
    }
    throw new HttpError(response.status, url);
  }

  function pump() {
    while (active < MAX_PARALLEL && queue.length) {
      const { url, resolve, reject } = queue.shift();
      active++;
      request(url)
        .then(resolve, reject)
        .finally(() => {
          active--;
          pump();
        });
    }
  }

  function getJson(url) {
    return new Promise((resolve, reject) => {
      queue.push({ url, resolve, reject });
      pump();
    });
  }

  const unwrap = json => json?.payload ?? json;

  let meRequest = null;

  function me() {
    meRequest ??= (async () => {
      for (const url of ["/api/users/v1/sessions/me", "/api/auth/v1/sessions/me"]) {
        try {
          const user = unwrap(await getJson(url));
          const id = user?.id ?? user?.guid ?? user?.user_id ?? user?.user?.id;
          if (id) return id;
        } catch {}
      }
      return null;
    })();
    return meRequest;
  }

  FB.api = {
    match: id => getJson(`/api/match/v2/match/${id}`).then(unwrap),
    me,
    history: (playerId, game, size) => getJson(`/api/stats/v1/stats/time/users/${playerId}/games/${game}?size=${size}`),
    lifetime: (playerId, game) => getJson(`/api/stats/v1/stats/users/${playerId}/games/${game}`),
    user: playerId => getJson(`/api/users/v1/users/${playerId}`).then(unwrap)
  };
})();
