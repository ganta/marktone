function isKintoneURL(url: string | undefined) {
    if (!url) return false;

    return !!url.match(/https:\/\/[^.]+\.cybozu(?:-dev)?\.com\/k\/#\/(?:space|people)\//);
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        chrome.declarativeContent.onPageChanged.addRules([
            {
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { urlMatches: 'https://[^.]+\\.cybozu\\.com/k/.*' },
                    }),
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { urlMatches: 'https://[^.]+\\.cybozu-dev\\.com/k/.*' },
                    }), // continue with more urls if needed
                ],
                actions: [new chrome.declarativeContent.ShowPageAction()],
            },
        ]);
    });
});

chrome.pageAction.onClicked.addListener((activeTab) => {
    if (!isKintoneURL(activeTab.url)) {
        return;
    }

    chrome.tabs.executeScript({
        // Use `code` because `file` cannot pass a return value to the callback function.
        code: 'document.body.classList.toggle("marktone-disabled");',
    }, (result) => {
        if (typeof result === 'undefined' || typeof result[0] === 'undefined') return;

        const marktoneDisabled = result[0];
        chrome.pageAction.setIcon({
            tabId: activeTab.id as number,
            path: marktoneDisabled ? 'icons/disabled-icon48.png' : 'icons/icon48.png',
        });
    });
});
