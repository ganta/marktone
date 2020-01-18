import "../styles/content.scss";

import React from "react";

import KintoneClient from "./kintone/kintone-client";
import MarktoneHandler from "./marktone-handler";
import MarktoneConfig from "./marktone-config";

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
initializationScript.text = `
    document.body.dataset.loginUser = JSON.stringify(kintone.getLoginUser());
    document.body.dataset.requestToken = kintone.getRequestToken();
`;
document.body.appendChild(initializationScript);

const kintoneClient = new KintoneClient();
const handler = new MarktoneHandler(kintoneClient);
handler.handle();
