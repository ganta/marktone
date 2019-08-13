function isKintoneURL(url: string | undefined) {
    if (!url) return false;

    return !!url.match(/https:\/\/[^.]+\.cybozu(?:-dev)?\.com\/k\/#\/(?:space|people)\//);
}

chrome.browserAction.onClicked.addListener((activeTab) => {
    if (!isKintoneURL(activeTab.url)) {
        return;
    }

    chrome.tabs.executeScript({
        // Use `code` because `file` cannot pass a return value to the callback function.
        code: 'document.body.classList.toggle("marktone-disabled");',
    }, (result) => {
        if (typeof result === 'undefined' || typeof result[0] === 'undefined') return;

        const marktoneDisabled = result[0];
        chrome.browserAction.setIcon({
            tabId: activeTab.id,
            path: marktoneDisabled ? 'icons/disabled-icon48.png' : 'icons/icon48.png',
        });
    });
});
