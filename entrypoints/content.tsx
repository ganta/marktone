import "@/styles/content.scss";

import { initializeCybozuData } from "./apis/cybozu/api.ts";
import KintoneClient from "./app/kintone/kintone-client";
import MarktoneConfig from "./app/marktone-config";
import MarktoneHandler from "./app/marktone-handler";

function setMarktoneEnabled(enabled: boolean): void {
  document.body.dataset.marktoneEnabled = enabled.toString();

  if (enabled) {
    document.body.classList.remove("marktone-disabled");
  } else {
    document.body.classList.add("marktone-disabled");
  }
}

export default defineContentScript({
  matches: [""],
  async main() {
    MarktoneConfig.loadEnabled(setMarktoneEnabled);
    MarktoneConfig.onEnabledChanged(setMarktoneEnabled);

    await initializeCybozuData();

    const kintoneClient = new KintoneClient();
    const handler = new MarktoneHandler(kintoneClient);
    handler.handle();
  },
});
