(() => {
  const FB = globalThis.FB;
  const { dom } = FB;

  const COPY_ATTR = "data-fb-copy";
  const LINKS = 'link[rel="stylesheet"][href]';
  const URL_PATTERN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  const ABSOLUTE = /^(data:|https?:|\/\/|#)/i;

  const texts = new Map();
  const copies = new Map();
  let enabled = false;

  function isReadable(sheet) {
    try {
      return Boolean(sheet.cssRules);
    } catch {
      return false;
    }
  }

  const absolutize = (css, base) =>
    css.replace(URL_PATTERN, (match, quote, url) => (ABSOLUTE.test(url) ? match : `url("${new URL(url, base).href}")`));

  function fetchCss(href) {
    if (!texts.has(href)) {
      const request = fetch(href, { credentials: "omit" })
        .then(response => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
        .then(css => absolutize(css, href));
      request.catch(() => texts.delete(href));
      texts.set(href, request);
    }
    return texts.get(href);
  }

  async function mirror(link) {
    copies.set(link, null);
    try {
      const css = await fetchCss(link.href);
      if (!enabled || !link.isConnected) {
        copies.delete(link);
        return;
      }
      const style = document.createElement("style");
      style.setAttribute(COPY_ATTR, link.href);
      style.textContent = css;
      link.after(style);
      copies.set(link, style);
    } catch {
      copies.delete(link);
    }
  }

  function sync() {
    for (const [link, style] of copies) {
      if (link.isConnected) continue;
      style?.remove();
      copies.delete(link);
    }
    if (!enabled) return;

    for (const link of document.querySelectorAll(LINKS)) {
      if (copies.has(link) || dom.isOwn(link)) continue;
      if (!link.sheet) {
        link.addEventListener("load", sync, { once: true });
        continue;
      }
      if (!isReadable(link.sheet)) mirror(link);
    }
  }

  function setEnabled(value) {
    enabled = value;
    if (!enabled) {
      for (const style of copies.values()) style?.remove();
      copies.clear();
    }
    sync();
  }

  dom.onMutation(sync);

  FB.sheets = { setEnabled };
})();
