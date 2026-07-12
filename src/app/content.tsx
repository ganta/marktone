import "@/styles/content.scss";

import { initializeCybozuData } from "@/apis/cybozu/api.ts";
import KintoneClient from "./kintone/kintone-client";
import MarktoneConfig from "./marktone-config";
import MarktoneHandler from "./marktone-handler";

// Runs in the page context (MAIN world) to reach `ckeditorInstance`, which the
// isolated content script cannot. Injected unconditionally; on the legacy UI it
// just never receives an event.
function injectCKEditorBridge(): void {
  const scriptEl = document.createElement("script");
  scriptEl.src = chrome.runtime.getURL("js/marktoneCKEditorBridge.js");
  document.body.appendChild(scriptEl);
}

function setMarktoneEnabled(enabled: boolean): void {
  document.body.dataset.marktoneEnabled = enabled.toString();

  if (enabled) {
    document.body.classList.remove("marktone-disabled");
  } else {
    document.body.classList.add("marktone-disabled");
  }
}

(async () => {
  MarktoneConfig.loadEnabled(setMarktoneEnabled);
  MarktoneConfig.onEnabledChanged(setMarktoneEnabled);

  await initializeCybozuData();

  injectCKEditorBridge();

  const kintoneClient = new KintoneClient();
  const handler = new MarktoneHandler(kintoneClient);
  handler.handle();
})();
