import DirectoryEntityCache from "@/app/kintone/directory-entity-cache";
import type KintoneClient from "@/app/kintone/kintone-client";
import {
  type DirectoryEntity,
  DirectoryEntityType,
} from "@/models/DirectoryEntity.ts";

const mentionPrefixes = {
  [DirectoryEntityType.enum.User]: null,
  [DirectoryEntityType.enum.Organization]: "org",
  [DirectoryEntityType.enum.Group]: "group",
} as const satisfies Record<DirectoryEntityType, string | null>;

type MentionPrefix = Exclude<
  (typeof mentionPrefixes)[DirectoryEntityType],
  null
>;

const mentionPrefixToType: Record<MentionPrefix, DirectoryEntityType> = {
  org: DirectoryEntityType.enum.Organization,
  group: DirectoryEntityType.enum.Group,
};

function isMentionPrefix(value: string | undefined): value is MentionPrefix {
  return value !== undefined && value in mentionPrefixToType;
}

class MentionReplacer {
  // Not a literal, so that the notation, the parser and the attribute name cannot drift apart again.
  // Not case-insensitive: the captured prefix is embedded in the attribute name as-is.
  private static mentionRegExp = new RegExp(
    `@(?:(${Object.keys(mentionPrefixToType).join("|")})\\/)?([^\\s]+)`,
    "g",
  );

  private readonly kintoneClient: KintoneClient;

  private readonly userCache: DirectoryEntityCache;

  private readonly organizationCache: DirectoryEntityCache;

  private readonly groupCache: DirectoryEntityCache;

  constructor(kintoneClient: KintoneClient) {
    this.kintoneClient = kintoneClient;
    this.userCache = new DirectoryEntityCache();
    this.organizationCache = new DirectoryEntityCache();
    this.groupCache = new DirectoryEntityCache();
  }

  static escapeCode(code: string): string {
    const replacer = (ch: string): string => {
      const charCodeHex = `0${ch.charCodeAt(0).toString(16)}`.substr(-2); // `substr` for zero padding
      return `%${charCodeHex}`;
    };
    return (
      code
        .replace(/[ @%&'"<>*+]/g, replacer)
        // Escape Markdown syntax characters following a multi-bytes character.
        .replace(/(?<!\w)[ _~![\]|-]/g, replacer)
    );
  }

  static unescapeCode(code: string): string {
    return code.replace(/%([0-9a-z]{2})/g, (_match, charCodeStr) => {
      const charCode = Number.parseInt(charCodeStr as string, 16);
      return String.fromCharCode(charCode);
    });
  }

  // Not `toDirectoryEntityType`: that one silently falls back to `User` for any unknown value,
  // which is what hid the `org`/`Organization` mismatch this replaces.
  private static toEntityType(prefix: string | undefined): DirectoryEntityType {
    return isMentionPrefix(prefix)
      ? mentionPrefixToType[prefix]
      : DirectoryEntityType.enum.User;
  }

  static createMention(type: DirectoryEntityType, code: string): string {
    const escapedCode = MentionReplacer.escapeCode(code);
    const prefix = mentionPrefixes[type];
    if (prefix === null) {
      return `@${escapedCode}`;
    }
    return `@${prefix}/${escapedCode}`;
  }

  async fetchDirectoryEntityInText(text: string): Promise<void> {
    const matches = text.matchAll(MentionReplacer.mentionRegExp);
    const promises: Promise<DirectoryEntity | null>[] = [];
    for (const match of matches) {
      const prefix = match[1];
      const escapedCode = match[2];
      const code = MentionReplacer.unescapeCode(escapedCode);
      // Fetching should be skipped if the `code` exceeds 100 characters, as the kintone API returns a 520 error.
      if (code.length > 100) {
        continue;
      }

      switch (MentionReplacer.toEntityType(prefix)) {
        case DirectoryEntityType.enum.Organization:
          promises.push(this.findOrganizationWithCache(code));
          break;
        case DirectoryEntityType.enum.Group:
          promises.push(this.findGroupWithCache(code));
          break;
        default:
          promises.push(this.findUserWithCache(code));
          break;
      }
    }
    await Promise.all(promises);
  }

  replaceMention(text: string): string {
    const className =
      "ocean-ui-plugin-mention-user ocean-ui-plugin-linkbubble-no";
    const style = "-webkit-user-modify: read-only;";

    const replacer = (
      match: string,
      prefix: string | undefined,
      escapedCode: string,
    ): string => {
      const code = MentionReplacer.unescapeCode(escapedCode);
      let entity: DirectoryEntity | null;
      switch (MentionReplacer.toEntityType(prefix)) {
        case DirectoryEntityType.enum.Organization:
          entity = this.getOrganizationFromCache(code);
          break;
        case DirectoryEntityType.enum.Group:
          entity = this.getGroupFromCache(code);
          break;
        default:
          entity = this.getUserFromCache(code);
          break;
      }
      if (!entity) return match;

      const attrName = prefix ? `${prefix}-mention-id` : "mention-id";
      const href = prefix
        ? "#"
        : code.includes("@")
          ? `/k/guest/#/people/guest/${escapedCode}`
          : `/k/#/people/user/${escapedCode}`;
      // LRO/RLO may be included in `name`. Therefore, it is surrounded by bdi element.
      // The code is emitted alongside the id because kintone's revamped UI
      // carries an organization or group mention into a "reply to all" prefill
      // by code only, and drops the ones it has no code for.
      return `<a class="${className}" href="${href}" data-${attrName}="${entity.id}" data-mention-code="${entity.code}" tabindex="-1" style="${style}">@<bdi>${entity.name}</bdi></a>`;
    };
    return text.replace(MentionReplacer.mentionRegExp, replacer);
  }

  private async findUserWithCache(
    code: string,
  ): Promise<DirectoryEntity | null> {
    let user = this.getUserFromCache(code);
    if (user) return null;

    user = await this.kintoneClient.findUserByCode(code);
    this.userCache.set(code, user);

    return user;
  }

  private getUserFromCache(code: string): DirectoryEntity | null {
    return this.userCache.get(code);
  }

  private async findOrganizationWithCache(
    code: string,
  ): Promise<DirectoryEntity | null> {
    let organization = this.getOrganizationFromCache(code);
    if (organization) return null;

    organization = await this.kintoneClient.findOrganizationByCode(code);
    this.organizationCache.set(code, organization);

    return organization;
  }

  private getOrganizationFromCache(code: string): DirectoryEntity | null {
    return this.organizationCache.get(code);
  }

  private async findGroupWithCache(
    code: string,
  ): Promise<DirectoryEntity | null> {
    let group = this.getGroupFromCache(code);
    if (group) return null;

    group = await this.kintoneClient.findGroupByCode(code);
    this.groupCache.set(code, group);

    return group;
  }

  private getGroupFromCache(code: string): DirectoryEntity | null {
    return this.groupCache.get(code);
  }
}

export default MentionReplacer;
