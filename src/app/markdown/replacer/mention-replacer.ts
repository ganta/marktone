import DirectoryEntityCache from "../../kintone/directory-entity-cache";
import {
  DirectoryEntity,
  DirectoryEntityType,
} from "../../kintone/directory-entity";
import KintoneClient from "../../kintone/kintone-client";

class MentionReplacer {
  private static mentionRegExp = /@(?:(org|group)\/)?([^\s]+)/g;

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
        .replace(/(?<!\w)[ _~![\]|\\-]/g, replacer)
    );
  }

  static unescapeCode(code: string): string {
    return code.replace(/%([0-9a-z]{2})/g, (_match, charCodeStr) => {
      const charCode = parseInt(charCodeStr as string, 16);
      return String.fromCharCode(charCode);
    });
  }

  static createMention(type: DirectoryEntityType, code: string): string {
    const escapedCode = MentionReplacer.escapeCode(code);
    if (type === DirectoryEntityType.USER) {
      return `@${escapedCode}`;
    }
    return `@${type}/${escapedCode}`;
  }

  async fetchDirectoryEntityInText(text: string): Promise<void> {
    // TODO: Use `String.prototype.matchAll` when it becomes ES2020
    let matched;
    const promises = [];
    // eslint-disable-next-line no-cond-assign
    while ((matched = MentionReplacer.mentionRegExp.exec(text)) !== null) {
      const type = matched[1];
      const escapedCode = matched[2];
      const code = MentionReplacer.unescapeCode(escapedCode);
      // It is needed to skip fetching an organization, a group or a user by code
      // because kintone returns 520 error when `code` exceeds 100 characters.
      if (code.length > 100) {
        continue;
      }

      switch (type) {
        case DirectoryEntityType.ORGANIZATION:
          promises.push(this.findOrganizationWithCache(code));
          break;
        case DirectoryEntityType.GROUP:
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
      type: string,
      escapedCode: string,
    ): string => {
      const code = MentionReplacer.unescapeCode(escapedCode);
      let entity;
      switch (type) {
        case DirectoryEntityType.ORGANIZATION:
          entity = this.getOrganizationFromCache(code);
          break;
        case DirectoryEntityType.GROUP:
          entity = this.getGroupFromCache(code);
          break;
        default:
          entity = this.getUserFromCache(code);
          break;
      }
      if (!entity) return match;

      const attrName = type ? `${type}-mention-id` : "mention-id";
      const href = type
        ? "#"
        : code.includes("@")
          ? `/k/guest/#/people/guest/${escapedCode}`
          : `/k/#/people/user/${escapedCode}`;
      // LRO/RLO may be included in `name`. Therefore, it is surrounded by bdi element.
      return `<a class="${className}" href="${href}" data-${attrName}="${entity.id}" tabindex="-1" style="${style}">@<bdi>${entity.name}</bdi></a>`;
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
