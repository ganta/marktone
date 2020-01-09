import "../styles/content.scss";

import React from "react";

import KintoneClient from "./kintone/kintone-client";
import MarktoneHandler from "./marktone-handler";

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
