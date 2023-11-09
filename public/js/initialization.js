/* eslint-disable no-undef */
// noinspection JSUnresolvedVariable

// TODO: Use CustomEvent to pass values.
document.body.dataset.loginUser = JSON.stringify(kintone.getLoginUser());
document.body.dataset.requestToken = kintone.getRequestToken();

document.body.dispatchEvent(new CustomEvent("marktone-initialized"));
