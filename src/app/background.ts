import MarktoneConfig from "./marktone-config";

function setExtensionIcon(enabled: boolean): void {
  chrome.browserAction.setIcon({
    path: enabled ? "icons/icon48.png" : "icons/disabled-icon48.png",
  });
}

MarktoneConfig.loadEnabled((enabled) => {
  setExtensionIcon(enabled);
});

chrome.browserAction.onClicked.addListener((tab) => {
  MarktoneConfig.loadEnabled((enabled) => {
    const newEnabled = !enabled;

    setExtensionIcon(newEnabled);

    MarktoneConfig.saveEnabled(newEnabled);
  });
});
