// Runs in the page context (MAIN world), which the content script's isolated
// world can't reach, to drive the revamped UI's CKEditor 5.
//
// Why setData rather than writing the editable's DOM: CKEditor submits from its
// model, so a DOM write is dropped and never enables the submit button.
//
// The editable is taken from `event.target` (the content script dispatches the
// event on it), avoiding any need to identify the editor another way.
(() => {
  const EVENT_NAME = "marktoneSetCKEditorData";

  document.addEventListener(EVENT_NAME, (event) => {
    const editable = event.target;
    if (!editable) return;

    // `ckeditorInstance` is CKEditor 5's official handle on the root element.
    const editor = editable.ckeditorInstance;
    if (!editor || typeof editor.setData !== "function") return;

    const html = typeof event.detail === "string" ? event.detail : "";
    // Not setData(""): it has a known bug that can break the editor.
    editor.setData(html === "" ? "<p></p>" : html);
  });
})();
