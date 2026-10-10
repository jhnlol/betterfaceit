(() => {
  const FB = (globalThis.FB ??= {});

  const DEFAULTS = Object.freeze({
    theme: "faceit",
    customTheme: null,
    customCss: "",
    style: Object.freeze({
      roundness: 100,
      borderWidth: 0,
      font: "default",
      scale: 100,
      shadows: "default",
      scrollbar: true,
      thinScrollbar: false,
      bgImage: "",
      bgDim: 70,
      bgEffect: "none",
      panelOpacity: 100,
      blur: 0,
      borderColor: "theme",
      hover: "none",
      panelAccent: "none",
      hideAds: false,
      animations: true
    }),
    room: Object.freeze({
      stats: true,
      intel: true,
      teamElo: true,
      range: 20,
      chipStyle: "default",
      country: true,
      hoverCard: true,
      trust: true,
      smurf: true,
      role: true,
      form: true,
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
