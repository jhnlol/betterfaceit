(() => {
  const FB = (globalThis.FB ??= {});

  const DEFAULTS = Object.freeze({
    theme: "faceit",
    customTheme: null,
    style: Object.freeze({
      roundness: 100,
      borderWidth: 0,
      font: "default",
      scale: 100,
      shadows: "default",
      scrollbar: true,
      bgImage: "",
      bgDim: 70,
      hideAds: false,
      animations: true
    }),
    room: Object.freeze({
      stats: true,
      intel: true,
      range: 20,
      trust: true,
      smurf: true,
      kd: true,
      winrate: true,
      matches: true,
      adr: true,
      avgKills: true,
      avgDeaths: false,
      avgAssists: false,
      hs: false,
      steam: true
    })
  });

  const GROUPS = ["style", "room"];

  function merge(raw = {}) {
    const settings = { ...DEFAULTS, ...raw };
    for (const group of GROUPS) settings[group] = { ...DEFAULTS[group], ...raw[group] };
    return settings;
  }

  async function load() {
    return merge(await chrome.storage.sync.get(null));
  }

  function save(patch) {
    return chrome.storage.sync.set(patch);
  }

  function onChange(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      load().then(settings => callback(settings, new Set(Object.keys(changes))));
    });
  }

  FB.settings = { DEFAULTS, load, save, onChange };
})();
