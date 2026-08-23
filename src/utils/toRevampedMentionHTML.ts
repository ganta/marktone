const MENTION_ANCHOR_SELECTOR =
  "a[data-mention-id], a[data-org-mention-id], a[data-group-mention-id]";

const MENTION_ID_ATTRIBUTE_NAMES = [
  "data-mention-id",
  "data-org-mention-id",
  "data-group-mention-id",
];

/**
 * Rewrites Marktone's legacy mention anchors into the mention widget of
 * kintone's revamped UI.
 */
export function toRevampedMentionHTML(html: string): string {
  if (html === "") return html;

  const body = new DOMParser().parseFromString(html, "text/html").body;

  for (const anchor of body.querySelectorAll(MENTION_ANCHOR_SELECTOR)) {
    // Rewritten rather than left as an anchor: CKEditor upcasts only user
    // mentions, so an organization or group anchor stays plain markup and
    // kintone never registers it as a mention — no notification, and no carry
    // over into a later "reply to all" prefill.
    const mention = document.createElement("button");
    mention.type = "button";
    mention.classList.add("editor-mention");
    mention.setAttribute("contenteditable", "false");
    mention.dataset.mentionCode =
      anchor.getAttribute("data-mention-code") ?? "";
    for (const name of MENTION_ID_ATTRIBUTE_NAMES) {
      const id = anchor.getAttribute(name);
      if (id !== null) mention.setAttribute(name, id);
    }
    mention.textContent = anchor.textContent;

    anchor.replaceWith(mention);
  }

  return body.innerHTML;
}
