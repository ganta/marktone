export enum DirectoryEntityType {
  USER = "user",
  ORGANIZATION = "org",
  GROUP = "group",
}

// biome-ignore lint/complexity/noStaticOnlyClass: TODO: Refactor this class to be non-class.
export class DirectoryEntityTypeUtil {
  static valueOf(value: string): DirectoryEntityType {
    switch (value) {
      case "org":
      case "ORG":
      case "organization":
      case "ORGANIZATION":
        return DirectoryEntityType.ORGANIZATION;
      case "group":
      case "GROUP":
        return DirectoryEntityType.GROUP;
      default:
        return DirectoryEntityType.USER;
    }
  }
}

export interface DirectoryEntity {
  type: DirectoryEntityType;
  id: string;
  code: string;
  name: string;
  avatar: string;
}
