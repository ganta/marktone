(async () => {
  const script = chrome.runtime.getURL("content.js");
  await import(script);
})();
