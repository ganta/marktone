import "../styles/content.scss";

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

MarktoneConfig.loadEnabled(setMarktoneEnabled);

MarktoneConfig.onEnabledChanged(setMarktoneEnabled);

// Pass the login user information to DOM.
// Because `window.kintone` cannot be referred directly from Chrome extension.
const initializationScript = document.createElement("script");
initializationScript.src = chrome.runtime.getURL("js/initialization.js");
initializationScript.onload = function () {
  (this as HTMLScriptElement).remove();
};
(document.head || document.documentElement).appendChild(initializationScript);

const run = () => {
  const kintoneClient = new KintoneClient();
  const handler = new MarktoneHandler(kintoneClient);
  handler.handle();
};

document.body.addEventListener("marktone-initialized", run, { once: true });
