interface ReplyMentionIdAndType {
  type: string;
  id: string;
}

export function extractReplyMentions(
  element: HTMLElement,
): ReplyMentionIdAndType[] {
  const mentionElements = element.querySelectorAll<HTMLAnchorElement>(
    "a.ocean-ui-plugin-mention-user",
  );
  const mentions: ReplyMentionIdAndType[] = [];
  for (const mentionEl of mentionElements) {
    if (mentionEl.dataset.mentionId) {
      mentions.push({
        type: "USER",
        id: mentionEl.dataset.mentionId,
      });
    } else if (mentionEl.dataset.orgMentionId) {
      mentions.push({
        type: "ORGANIZATION",
        id: mentionEl.dataset.orgMentionId,
      });
    } else if (mentionEl.dataset.groupMentionId) {
      mentions.push({
        type: "GROUP",
        id: mentionEl.dataset.groupMentionId,
      });
    }
  }
  return mentions;
}
