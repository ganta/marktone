function shouldBeEnabledMarktone(url: string | undefined) {
  if (!url) return false;

  return !!url.match(
    /https:\/\/[^.]+\.cybozu(?:-dev)?\.com\/k\/(?:#\/(?:space|people)\/|\d+\/show#|#\/ntf\/)/
  );
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlMatches: "https://[^.]+\\.cybozu\\.com/k/.*" }
          }),
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlMatches: "https://[^.]+\\.cybozu-dev\\.com/k/.*" }
          })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }
    ]);
  });
});

chrome.pageAction.onClicked.addListener(activeTab => {
  if (!shouldBeEnabledMarktone(activeTab.url)) {
    return;
  }

  chrome.tabs.executeScript(
    {
      // Use `code` because `file` cannot pass a return value to the callback function.
      code: `
        // Do not add a const declaration because a predefined error occurs.
        notificationIframeEl = document.getElementById("notification-iframe-gaia");
        if (notificationIframeEl !== null) {
          notificationIframeEl.contentDocument.documentElement.querySelector("body").classList.toggle("marktone-disabled")
        }
        document.body.dataset.marktoneEnabled = !document.body.classList.toggle("marktone-disabled");
      `
    },
    result => {
      if (typeof result === "undefined" || typeof result[0] === "undefined")
        return;

      const marktoneEnabled = result[0];
      chrome.pageAction.setIcon({
        tabId: activeTab.id as number,
        path: marktoneEnabled ? "icons/icon48.png" : "icons/disabled-icon48.png"
      });
    }
  );
});
