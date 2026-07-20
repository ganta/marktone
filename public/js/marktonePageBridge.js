// Runs in the page context (MAIN world) because the content script's isolated
// world can reach neither the `kintone` global nor CKEditor 5's
// `ckeditorInstance` expando property.
(() => {
  const IS_REVAMPED_UI_REQUEST_EVENT = "marktoneIsRevampedUIRequest";
  const IS_REVAMPED_UI_RESPONSE_EVENT = "marktoneIsRevampedUIResponse";
  const SET_CKEDITOR_DATA_EVENT = "marktoneSetCKEditorData";

  document.addEventListener(IS_REVAMPED_UI_REQUEST_EVENT, async (event) => {
    const requestId = event.detail;
    const available =
      typeof kintone !== "undefined" &&
      typeof kintone.isRevampedUI === "function";

    let isRevampedUI = false;
    if (available) {
      try {
        isRevampedUI = await kintone.isRevampedUI();
      } catch {
        // Treated the same as the API answering false; the content script
        // side decides the fallback behavior based on `available`.
      }
    }

    document.dispatchEvent(
      new CustomEvent(IS_REVAMPED_UI_RESPONSE_EVENT, {
        detail: JSON.stringify({ requestId, available, isRevampedUI }),
      }),
    );
  });

  // The content script dispatches this event on the editable element itself,
  // so `event.target` identifies the editor without any other addressing.
  document.addEventListener(SET_CKEDITOR_DATA_EVENT, (event) => {
    const editor = event.target?.ckeditorInstance;
    if (!editor || typeof editor.setData !== "function") return;

    const html = typeof event.detail === "string" ? event.detail : "";
    // Not setData(""): the empty string is known to break CKEditor 5.
    editor.setData(html === "" ? "<p></p>" : html);
  });
})();
