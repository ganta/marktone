export const DirectoryEntityType = {
  USER: "user",
  ORGANIZATION: "org",
  GROUP: "group",
};
export type DirectoryEntityType =
  (typeof DirectoryEntityType)[keyof typeof DirectoryEntityType];

export function toDirectoryEntityType(value: string): DirectoryEntityType {
  switch (value.toLowerCase()) {
    case "org":
    case "organization":
      return DirectoryEntityType.ORGANIZATION;
    case "group":
      return DirectoryEntityType.GROUP;
    default:
      return DirectoryEntityType.USER;
  }
}

export interface DirectoryEntity {
  type: DirectoryEntityType;
  id: string;
  code: string;
  name: string;
  avatar: string;
}
