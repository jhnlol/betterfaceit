(() => {
  const FB = globalThis.FB;

  const OWN_PREFIX = "faceit-better";
  const listeners = new Set();
  let pending = null;

  function flush() {
    pending = null;
    for (const listener of listeners) listener();
  }

  new MutationObserver(() => {
    pending ??= setTimeout(flush, 250);
  }).observe(document.documentElement, { childList: true, subtree: true });

  function onMutation(listener) {
    listeners.add(listener);
  }

  function upsertStyle(id, css, { last = false } = {}) {
    let el = document.getElementById(id);
    if (!css) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      (document.head ?? document.documentElement).appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
    if (last) keepLast(el);
  }

  function keepLast(el) {
    const parent = document.head ?? document.documentElement;
    if (el.parentNode !== parent || el !== parent.lastElementChild) parent.appendChild(el);
  }

  const isOwn = node => Boolean(node?.id?.startsWith(OWN_PREFIX));

  FB.dom = { OWN_PREFIX, onMutation, upsertStyle, keepLast, isOwn };
})();
