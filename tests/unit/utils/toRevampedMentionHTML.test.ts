import { describe, expect, it } from "vitest";
import { toRevampedMentionHTML } from "@/utils/toRevampedMentionHTML";

describe(toRevampedMentionHTML, () => {
  it.each([
    { name: "user", idAttribute: "data-mention-id", id: "123", code: "taro" },
    {
      name: "organization",
      idAttribute: "data-org-mention-id",
      id: "456",
      code: "sales",
    },
    {
      name: "group",
      idAttribute: "data-group-mention-id",
      id: "789",
      code: "admins",
    },
  ])(
    "rewrites the $name mention anchor into the revamped widget",
    ({ idAttribute, id, code }) => {
      // setup
      const html = `<p><a class="ocean-ui-plugin-mention-user" href="#" ${idAttribute}="${id}" data-mention-code="${code}" tabindex="-1" style="-webkit-user-modify: read-only;">@<bdi>Name</bdi></a></p>`;

      // exercise
      const actual = toRevampedMentionHTML(html);

      // verify
      expect(actual).toBe(
        `<p><button type="button" class="editor-mention" contenteditable="false" data-mention-code="${code}" ${idAttribute}="${id}">@Name</button></p>`,
      );
    },
  );

  it("keeps the rest of the HTML untouched", () => {
    // setup
    const html = "<h1>title</h1><ul><li>item</li></ul>";

    // exercise & verify
    expect(toRevampedMentionHTML(html)).toBe(html);
  });

  it("keeps an anchor that is not a mention", () => {
    // setup
    const html = '<p><a href="https://example.com">link</a></p>';

    // exercise & verify
    expect(toRevampedMentionHTML(html)).toBe(html);
  });

  it("returns an empty string unchanged", () => {
    // exercise & verify
    expect(toRevampedMentionHTML("")).toBe("");
  });
});
