import type { ReplyMention } from "@/components/Marktone";
import { DirectoryEntityType } from "@/models/DirectoryEntity.ts";

const MENTION_SELECTOR = "button.editor-mention";
const MENTION_WIDGET_SELECTOR = "span.editor-mention-wrapper";

// CKEditor scatters word joiners and non-breaking spaces around widgets, so a
// plain trim() never sees an editor holding nothing but mentions as empty.
const FILLER_PATTERN = /[\s⁠ ]/g;

// Allowed rather than blocked: a blocklist would let unknown content (images,
// tables, links) pass as empty and be destroyed by the mount.
const STRUCTURAL_TAG_NAMES = new Set(["P", "BR"]);

export function extractRevampedReplyMentions(
  editorField: HTMLElement,
): ReplyMention[] {
  const mentions: ReplyMention[] = [];

  for (const mentionEl of editorField.querySelectorAll<HTMLElement>(
    MENTION_SELECTOR,
  )) {
    // Marktone's own mention anchors are upcast into this same widget with an
    // empty code, so taking them in — or resolving their id through the
    // directory API — would feed the prefill back into itself.
    const code = mentionEl.dataset.mentionCode;
    if (!code) continue;

    const type = mentionTypeOf(mentionEl);
    if (type === null) continue;

    mentions.push({ type, code });
  }

  return mentions;
}

export function isEmptyExceptReplyMentions(editorField: HTMLElement): boolean {
  const clone = editorField.cloneNode(true) as HTMLElement;
  for (const widget of clone.querySelectorAll(MENTION_WIDGET_SELECTOR)) {
    widget.remove();
  }

  for (const el of clone.querySelectorAll("*")) {
    if (!STRUCTURAL_TAG_NAMES.has(el.tagName)) return false;
  }

  return (clone.textContent ?? "").replace(FILLER_PATTERN, "") === "";
}

export function replyMentionsSignature(mentions: ReplyMention[]): string {
  return Array.from(new Set(mentions.map(mentionKey)))
    .sort()
    .join(",");
}

// Merged rather than replaced: kintone may add a reply form's mentions in more
// than one task, and by the time the later ones arrive Marktone's write-back
// has already replaced the earlier ones in the editor.
export function mergeReplyMentions(
  mentions: ReplyMention[],
  additional: ReplyMention[],
): ReplyMention[] {
  const seen = new Set(mentions.map(mentionKey));
  return [
    ...mentions,
    ...additional.filter((mention) => !seen.has(mentionKey(mention))),
  ];
}

function mentionKey({ type, code }: ReplyMention): string {
  return `${type}:${code}`;
}

function mentionTypeOf(mentionEl: HTMLElement): DirectoryEntityType | null {
  if (mentionEl.dataset.mentionId) return DirectoryEntityType.enum.User;
  if (mentionEl.dataset.orgMentionId)
    return DirectoryEntityType.enum.Organization;
  if (mentionEl.dataset.groupMentionId) return DirectoryEntityType.enum.Group;
  return null;
}
