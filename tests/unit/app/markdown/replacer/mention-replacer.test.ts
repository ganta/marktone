import type KintoneClient from "@/app/kintone/kintone-client";
import MentionReplacer from "@/app/markdown/replacer/mention-replacer.ts";
import {
  type DirectoryEntity,
  DirectoryEntityType,
} from "@/models/DirectoryEntity.ts";
import { extractReplyMentions } from "@/utils/extractReplyMentions.ts";

const user: DirectoryEntity = {
  type: DirectoryEntityType.enum.User,
  id: "123",
  code: "taro",
  name: "Taro",
  avatar: "",
};

const guestUser: DirectoryEntity = {
  type: DirectoryEntityType.enum.User,
  id: "234",
  code: "guest@example.com",
  name: "Guest",
  avatar: "",
};

const organization: DirectoryEntity = {
  type: DirectoryEntityType.enum.Organization,
  id: "456",
  code: "sales",
  name: "Sales",
  avatar: "",
};

const group: DirectoryEntity = {
  type: DirectoryEntityType.enum.Group,
  id: "789",
  code: "admins",
  name: "Admins",
  avatar: "",
};

function createKintoneClient(): KintoneClient {
  const finder =
    (entities: DirectoryEntity[]) =>
    async (code: string): Promise<DirectoryEntity | null> =>
      entities.find((entity) => entity.code === code) ?? null;

  return {
    findUserByCode: vi.fn(finder([user, guestUser])),
    findOrganizationByCode: vi.fn(finder([organization])),
    findGroupByCode: vi.fn(finder([group])),
  } as unknown as KintoneClient;
}

async function replace(
  mentionReplacer: MentionReplacer,
  text: string,
): Promise<string> {
  await mentionReplacer.fetchDirectoryEntityInText(text);
  return mentionReplacer.replaceMention(text);
}

describe(MentionReplacer, () => {
  describe("createMention", () => {
    it.each([
      { type: DirectoryEntityType.enum.User, code: "taro", expected: "@taro" },
      {
        type: DirectoryEntityType.enum.Organization,
        code: "sales",
        expected: "@org/sales",
      },
      {
        type: DirectoryEntityType.enum.Group,
        code: "admins",
        expected: "@group/admins",
      },
    ])("returns $expected for $type", ({ type, code, expected }) => {
      // exercise
      const actual = MentionReplacer.createMention(type, code);

      // verify
      expect(actual).toBe(expected);
    });
  });

  describe("fetchDirectoryEntityInText", () => {
    it("looks up each mention by the directory type its prefix denotes", async () => {
      // setup
      const kintoneClient = createKintoneClient();
      const mentionReplacer = new MentionReplacer(kintoneClient);

      // exercise
      await mentionReplacer.fetchDirectoryEntityInText(
        "@taro @org/sales @group/admins",
      );

      // verify
      expect(kintoneClient.findUserByCode).toHaveBeenCalledExactlyOnceWith(
        "taro",
      );
      expect(
        kintoneClient.findOrganizationByCode,
      ).toHaveBeenCalledExactlyOnceWith("sales");
      expect(kintoneClient.findGroupByCode).toHaveBeenCalledExactlyOnceWith(
        "admins",
      );
    });

    it("looks up a mention without a prefix as a user", async () => {
      // setup
      const kintoneClient = createKintoneClient();
      const mentionReplacer = new MentionReplacer(kintoneClient);

      // exercise
      await mentionReplacer.fetchDirectoryEntityInText("@org/");

      // verify
      expect(kintoneClient.findUserByCode).toHaveBeenCalledExactlyOnceWith(
        "org/",
      );
      expect(kintoneClient.findOrganizationByCode).not.toHaveBeenCalled();
    });
  });

  describe("replaceMention", () => {
    it.each([
      {
        type: DirectoryEntityType.enum.User,
        entity: user,
        expected:
          '<a class="ocean-ui-plugin-mention-user ocean-ui-plugin-linkbubble-no" href="/k/#/people/user/taro" data-mention-id="123" data-mention-code="taro" tabindex="-1" style="-webkit-user-modify: read-only;">@<bdi>Taro</bdi></a>',
      },
      {
        type: DirectoryEntityType.enum.User,
        entity: guestUser,
        expected:
          '<a class="ocean-ui-plugin-mention-user ocean-ui-plugin-linkbubble-no" href="/k/guest/#/people/guest/guest%40example.com" data-mention-id="234" data-mention-code="guest@example.com" tabindex="-1" style="-webkit-user-modify: read-only;">@<bdi>Guest</bdi></a>',
      },
      {
        type: DirectoryEntityType.enum.Organization,
        entity: organization,
        expected:
          '<a class="ocean-ui-plugin-mention-user ocean-ui-plugin-linkbubble-no" href="#" data-org-mention-id="456" data-mention-code="sales" tabindex="-1" style="-webkit-user-modify: read-only;">@<bdi>Sales</bdi></a>',
      },
      {
        type: DirectoryEntityType.enum.Group,
        entity: group,
        expected:
          '<a class="ocean-ui-plugin-mention-user ocean-ui-plugin-linkbubble-no" href="#" data-group-mention-id="789" data-mention-code="admins" tabindex="-1" style="-webkit-user-modify: read-only;">@<bdi>Admins</bdi></a>',
      },
    ])(
      "converts the mention created for $entity.type $entity.code back to its anchor",
      async ({ type, entity, expected }) => {
        // setup
        const mentionReplacer = new MentionReplacer(createKintoneClient());
        const text = MentionReplacer.createMention(type, entity.code);

        // exercise
        const actual = await replace(mentionReplacer, text);

        // verify
        expect(actual).toBe(expected);
      },
    );

    it("keeps the raw text when the entity is not found", async () => {
      // setup
      const mentionReplacer = new MentionReplacer(createKintoneClient());

      // exercise
      const actual = await replace(mentionReplacer, "@org/unknown");

      // verify
      expect(actual).toBe("@org/unknown");
    });

    it("keeps the raw text when a trailing character is swallowed by the code", async () => {
      // setup
      const mentionReplacer = new MentionReplacer(createKintoneClient());

      // exercise
      const actual = await replace(mentionReplacer, "@org/sales.");

      // verify
      expect(actual).toBe("@org/sales.");
    });

    it("produces anchors that extractReplyMentions can read back", async () => {
      // setup
      const mentionReplacer = new MentionReplacer(createKintoneClient());
      const text = [
        MentionReplacer.createMention(DirectoryEntityType.enum.User, user.code),
        MentionReplacer.createMention(
          DirectoryEntityType.enum.Organization,
          organization.code,
        ),
        MentionReplacer.createMention(
          DirectoryEntityType.enum.Group,
          group.code,
        ),
      ].join(" ");
      const element = document.createElement("div");

      // exercise
      element.innerHTML = await replace(mentionReplacer, text);

      // verify
      expect(extractReplyMentions(element)).toEqual([
        { type: "USER", id: "123" },
        { type: "ORGANIZATION", id: "456" },
        { type: "GROUP", id: "789" },
      ]);
    });
  });
});
