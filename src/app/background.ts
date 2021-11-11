import MarktoneConfig from "./marktone-config";

function setExtensionIcon(enabled: boolean): void {
  const path = chrome.runtime.getURL(
    enabled ? "icons/icon48.png" : "icons/disabled-icon48.png"
  );
  chrome.action.setIcon({ path });
}

MarktoneConfig.loadEnabled((enabled) => {
  setExtensionIcon(enabled);
});

chrome.action.onClicked.addListener((_tab) => {
  MarktoneConfig.loadEnabled((enabled) => {
    const newEnabled = !enabled;

    setExtensionIcon(newEnabled);

    void MarktoneConfig.saveEnabled(newEnabled);
  });
});
