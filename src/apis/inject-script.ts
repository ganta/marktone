export function injectScript(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptEl = document.createElement("script");
    // Listeners are registered before appendChild so that a synchronously
    // dispatched load event (as test doubles do) cannot be missed.
    scriptEl.addEventListener("load", () => resolve(), { once: true });
    scriptEl.addEventListener(
      "error",
      () => reject(new Error(`Failed to load the injected script: ${path}`)),
      { once: true },
    );
    scriptEl.src = chrome.runtime.getURL(path);
    document.body.appendChild(scriptEl);
  });
}
