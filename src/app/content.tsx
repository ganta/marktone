import { defineContentScript } from "wxt/sandbox";
import "@/styles/content.scss";

import { initializeCybozuData } from "@/apis/cybozu/api.ts";
import KintoneClient from "./kintone/kintone-client";
import MarktoneConfig from "./marktone-config";
import MarktoneHandler from "./marktone-handler";

function setMarktoneEnabled(enabled: boolean): void {
  document.body.dataset.marktoneEnabled = enabled.toString();

  if (enabled) {
    document.body.classList.remove("marktone-disabled");
  } else {
    document.body.classList.add("marktone-disabled");
  }
}

export default defineContentScript({
  matches: [
    "https://*.cybozu.com/k/*",
    "https://*.cybozu-dev.com/k/*",
    "https://*.kintone.com/k/*",
    "https://*.kintone-dev.com/k/*",
    "https://*.cybozu.cn/k/*",
    "https://*.cybozu-dev.cn/k/*"
  ],
  async main() {
    console.log("load content")
    MarktoneConfig.loadEnabled(setMarktoneEnabled);
    MarktoneConfig.onEnabledChanged(setMarktoneEnabled);

    await initializeCybozuData();

    const kintoneClient = new KintoneClient();
    const handler = new MarktoneHandler(kintoneClient);
    handler.handle();
  },
});
