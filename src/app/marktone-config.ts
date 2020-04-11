class MarktoneConfig {
  static loadEnabled(func: (enabled: boolean) => void): void {
    chrome.storage.sync.get(["marktoneEnabled"], (result) => {
      let enabled = result.marktoneEnabled;

      if (enabled === undefined) enabled = true;

      func(enabled);
    });
  }

  static saveEnabled(enabled: boolean): void {
    chrome.storage.sync.set({ marktoneEnabled: enabled });
  }

  static onEnabledChanged(func: (enabled: boolean) => void): void {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (changes.marktoneEnabled) {
        func(changes.marktoneEnabled.newValue);
      }
    });
  }
}

export default MarktoneConfig;
