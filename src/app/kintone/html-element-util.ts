interface ReplyMentionIdAndType {
  type: string;
  id: string;
}

class HTMLElementUtil {
  static extractReplyMentions(element: HTMLElement): ReplyMentionIdAndType[] {
    return Array.from<HTMLAnchorElement, ReplyMentionIdAndType>(
      element.querySelectorAll("a.ocean-ui-plugin-mention-user"),
      anchor => {
        if (anchor.hasAttribute("data-org-mention-id")) {
          return {
            type: "ORGANIZATION",
            id: anchor.dataset.orgMentionId as string
          };
        }
        if (anchor.hasAttribute("data-group-mention-id")) {
          return {
            type: "GROUP",
            id: anchor.dataset.groupMentionId as string
          };
        }
        return { type: "USER", id: anchor.dataset.mentionId as string };
      }
    );
  }
}

export default HTMLElementUtil;
