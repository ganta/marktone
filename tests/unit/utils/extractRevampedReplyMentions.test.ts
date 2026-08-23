import { describe, expect, it } from "vitest";
import { DirectoryEntityType } from "@/models/DirectoryEntity";
import {
  extractRevampedReplyMentions,
  isEmptyExceptReplyMentions,
  replyMentionsSignature,
} from "@/utils/extractRevampedReplyMentions";

function createEditorField(innerHTML: string): HTMLElement {
  const editorField = document.createElement("div");
  editorField.innerHTML = innerHTML;
  return editorField;
}

function mentionWidget(attributes: string, label = "user"): string {
  return `<span class="editor-mention-wrapper ck-widget" contenteditable="false"><span><button type="button" class="editor-mention" ${attributes}>@${label}</button></span></span>⁠ `;
}

describe(extractRevampedReplyMentions, () => {
  it("should extract the user, organization and group mentions", () => {
    // setup
    const editorField = createEditorField(
      `<p>${mentionWidget('data-mention-code="cybozu" data-mention-id="1"')}${mentionWidget('data-mention-code="test_org" data-org-mention-id="2"')}${mentionWidget('data-mention-code="Administrators" data-group-mention-id="3"')}</p>`,
    );

    // exercise
    const mentions = extractRevampedReplyMentions(editorField);

    // verify
    expect(mentions).toEqual([
      { type: DirectoryEntityType.enum.User, code: "cybozu" },
      { type: DirectoryEntityType.enum.Organization, code: "test_org" },
      { type: DirectoryEntityType.enum.Group, code: "Administrators" },
    ]);
  });

  it("should ignore a mention without a code", () => {
    // setup
    const editorField = createEditorField(
      `<p>${mentionWidget('data-mention-code="" data-mention-id="1"')}</p>`,
    );

    // exercise
    const mentions = extractRevampedReplyMentions(editorField);

    // verify
    expect(mentions).toEqual([]);
  });

  it("should ignore a mention without an id attribute", () => {
    // setup
    const editorField = createEditorField(
      `<p>${mentionWidget('data-mention-code="cybozu"')}</p>`,
    );

    // exercise
    const mentions = extractRevampedReplyMentions(editorField);

    // verify
    expect(mentions).toEqual([]);
  });

  it("should return no mentions for an empty editor", () => {
    // setup
    const editorField = createEditorField("<p><br></p>");

    // exercise
    const mentions = extractRevampedReplyMentions(editorField);

    // verify
    expect(mentions).toEqual([]);
  });
});

describe(isEmptyExceptReplyMentions, () => {
  it("should treat an empty editor as empty", () => {
    // setup
    const editorField = createEditorField('<p><br data-cke-filler="true"></p>');

    // exercise & verify
    expect(isEmptyExceptReplyMentions(editorField)).toBe(true);
  });

  it("should treat mentions surrounded by CKEditor fillers as empty", () => {
    // setup
    const editorField = createEditorField(
      `<p>${mentionWidget('data-mention-code="cybozu" data-mention-id="1"')}</p>`,
    );

    // exercise & verify
    expect(isEmptyExceptReplyMentions(editorField)).toBe(true);
  });

  it("should not treat a mention with text as empty", () => {
    // setup
    const editorField = createEditorField(
      `<p>${mentionWidget('data-mention-code="cybozu" data-mention-id="1"')}hello</p>`,
    );

    // exercise & verify
    expect(isEmptyExceptReplyMentions(editorField)).toBe(false);
  });

  it("should not treat a mention with an image as empty", () => {
    // setup
    const editorField = createEditorField(
      `<p>${mentionWidget('data-mention-code="cybozu" data-mention-id="1"')}<img src="a.png" alt=""></p>`,
    );

    // exercise & verify
    expect(isEmptyExceptReplyMentions(editorField)).toBe(false);
  });
});

describe(replyMentionsSignature, () => {
  it("should be stable regardless of order and duplicates", () => {
    // setup
    const user = { type: DirectoryEntityType.enum.User, code: "cybozu" };
    const group = {
      type: DirectoryEntityType.enum.Group,
      code: "Administrators",
    };

    // exercise & verify
    expect(replyMentionsSignature([user, group, user])).toBe(
      replyMentionsSignature([group, user]),
    );
  });

  it("should differ when a mention is added", () => {
    // setup
    const user = { type: DirectoryEntityType.enum.User, code: "cybozu" };
    const group = {
      type: DirectoryEntityType.enum.Group,
      code: "Administrators",
    };

    // exercise & verify
    expect(replyMentionsSignature([user])).not.toBe(
      replyMentionsSignature([user, group]),
    );
  });

  it("should be empty for no mentions", () => {
    // exercise & verify
    expect(replyMentionsSignature([])).toBe("");
  });
});
