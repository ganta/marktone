import { extractReplyMentions } from "@/utils/extractReplyMentions.ts";

describe(extractReplyMentions, () => {
  it("returns an array of ReplyMentionIdAndType when there are mentions", () => {
    // setup
    const element = document.createElement("div");
    element.innerHTML = `
      <a class="ocean-ui-plugin-mention-user" data-mention-id="123">user</a>
      <a class="ocean-ui-plugin-mention-user" data-org-mention-id="456">organization</a>
      <a class="ocean-ui-plugin-mention-user" data-group-mention-id="789">group</a>
    `;

    // exercise
    const actual = extractReplyMentions(element);

    // verify
    expect(actual).toEqual([
      { type: "USER", id: "123" },
      { type: "ORGANIZATION", id: "456" },
      { type: "GROUP", id: "789" },
    ]);
  });

  it("returns an empty array when there are no mentions", () => {
    // setup
    const element = document.createElement("div");
    element.innerHTML = "This is test.";

    // exercise
    const actual = extractReplyMentions(element);

    // verify
    expect(actual).toEqual([]);
  });
});
