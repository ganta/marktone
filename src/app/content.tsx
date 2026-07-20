import "@/styles/content.scss";

import { initializeCybozuData } from "@/apis/cybozu/api.ts";
import { injectPageBridge } from "@/apis/kintone/api.ts";
import KintoneClient from "./kintone/kintone-client";
import MarktoneConfig from "./marktone-config";
import MarktoneHandler from "./marktone-handler";
import RevampedMarktoneHandler from "./revamped-marktone-handler";

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
  injectPageBridge();

  const kintoneClient = new KintoneClient();

  // Both handlers observe at once instead of branching on
  // kintone.isRevampedUI() up front: legacy and revamped screens coexist in
  // one page load (in-app hash navigation does not reload), so the answer at
  // startup does not hold for later screens. Each handler only reacts to its
  // own UI's DOM, so the other is inert.
  new MarktoneHandler(kintoneClient).handle();
  new RevampedMarktoneHandler(kintoneClient).handle();
})();
