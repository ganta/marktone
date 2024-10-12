import { createRoot } from "react-dom/client";
import Marktone, { type ReplyMention } from "./components/marktone";
import HTMLElementUtil from "./kintone/html-element-util";
import type KintoneClient from "./kintone/kintone-client";
import EmojiReplacer from "./markdown/replacer/emoji-replacer";
import MentionReplacer from "./markdown/replacer/mention-replacer";

class MarktoneHandler {
  private readonly kintoneClient: KintoneClient;
  private readonly mentionReplacer: MentionReplacer;
  private readonly emojiReplacer: EmojiReplacer;

  private static isExpandedStatusChangedCommentFormRecord(
    record: MutationRecord,
  ): boolean {
    const targetElement = record.target as HTMLElement;

    if (!targetElement.classList.contains("ocean-ui-comments-commentform"))
      return false;

    const oldValue = record.oldValue;

    if (oldValue === null) return false;

    const currentValue = targetElement.getAttribute("aria-expanded");

    return oldValue !== currentValue;
  }

  constructor(kintoneClient: KintoneClient) {
    this.kintoneClient = kintoneClient;
    this.mentionReplacer = new MentionReplacer(kintoneClient);
    this.emojiReplacer = new EmojiReplacer();
  }

  handle(): void {
    this.observeCommentFormAppearance();
  }

  private observeCommentFormAppearance(): void {
    const observer = new MutationObserver((records) => {
      const commentFormRecords = records.filter((record) =>
        MarktoneHandler.isExpandedStatusChangedCommentFormRecord(record),
      );

      for (const record of commentFormRecords) {
        const targetElement = record.target as HTMLElement;
        const isFormExpanded = targetElement.getAttribute("aria-expanded");
        const originalForm = targetElement.querySelector<HTMLFormElement>(
          "form.ocean-ui-comments-commentform-form",
        ) as HTMLFormElement;

        if (isFormExpanded === "true") {
          // The original comment form is opened.
          void this.renderMarktone(originalForm);
        } else {
          // The original comment form is closed.
          this.unmountMarktone(originalForm);
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeOldValue: true,
      attributeFilter: ["aria-expanded"],
    });
  }

  private async renderMarktone(originalForm: HTMLFormElement): Promise<void> {
    const originalTextbox = originalForm.querySelector<HTMLDivElement>(
      ".ocean-ui-editor-field",
    ) as HTMLDivElement;

    const replyMentions = await this.extractReplyMentions(originalTextbox);
    const marktoneContainer = this.findOrCreateMarktoneContainer(originalForm);

    const root = createRoot(marktoneContainer);
    originalForm.addEventListener(
      "unmountMarktone",
      () => {
        root.unmount();
      },
      { once: true },
    );

    root.render(
      <Marktone
        originalFormEl={originalForm}
        replayMentions={replyMentions}
        kintoneClient={this.kintoneClient}
        mentionReplacer={this.mentionReplacer}
        emojiReplacer={this.emojiReplacer}
      />,
    );
  }

  private unmountMarktone(originalForm: HTMLFormElement): void {
    const marktoneContainer = originalForm.querySelector<Element>(
      ".marktone-container",
    ) as Element;
    const event = new Event("unmountMarktone");
    originalForm.dispatchEvent(event);
    originalForm.removeChild(marktoneContainer);
  }

  private async extractReplyMentions(
    element: HTMLElement,
  ): Promise<ReplyMention[]> {
    const idAndTypes = HTMLElementUtil.extractReplyMentions(element);
    const entities =
      await this.kintoneClient.listDirectoryEntityByIdAndType(idAndTypes);

    return entities.map<ReplyMention>((entity) => {
      return { type: entity.type, code: entity.code };
    });
  }

  private findOrCreateMarktoneContainer(
    originalForm: HTMLFormElement,
  ): HTMLDivElement {
    const container = originalForm.querySelector<HTMLDivElement>(
      ".marktone-container",
    );
    if (container !== null) return container;

    const createdContainer = document.createElement("div");
    createdContainer.classList.add("marktone-container");
    originalForm.prepend(createdContainer);

    return createdContainer;
  }
}

export default MarktoneHandler;
