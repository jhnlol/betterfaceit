// The "Scale" option is applied as real browser zoom. CSS `zoom` on <html> also scales vh units,
// so FACEIT's full-height layouts (e.g. the match room canvas) end short of the window.
chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (message?.type !== "fb-zoom" || tabId === undefined) return;

  chrome.tabs.getZoom(tabId)
    .then(current => {
      if (Math.abs(current - message.factor) > 0.001) return chrome.tabs.setZoom(tabId, message.factor);
    })
    .catch(() => {});
});
