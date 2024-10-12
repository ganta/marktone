// biome-ignore lint/complexity/noStaticOnlyClass: TODO: Refactor this class to be non-class.
class MarktoneConfig {
  static loadEnabled(func: (enabled: boolean) => void): void {
    chrome.storage.sync.get(["marktoneEnabled"], (result) => {
      let enabled = result.marktoneEnabled as boolean;

      if (enabled === undefined) enabled = true;

      func(enabled);
    });
  }

  static async saveEnabled(enabled: boolean): Promise<void> {
    await chrome.storage.sync.set({ marktoneEnabled: enabled });
  }

  static onEnabledChanged(func: (enabled: boolean) => void): void {
    chrome.storage.onChanged.addListener((changes, _namespace) => {
      if (changes.marktoneEnabled) {
        func(changes.marktoneEnabled.newValue as boolean);
      }
    });
  }
}

export default MarktoneConfig;
