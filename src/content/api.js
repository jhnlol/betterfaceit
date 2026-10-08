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

  async function request(url, retries = 1) {
    const response = await fetch(url, { credentials: "include" });
    if (response.ok) return response.json();
    if (retries > 0 && RETRYABLE.has(response.status)) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
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
