import { z } from "zod";

export const DirectoryEntityType = z.enum(["User", "Organization", "Group"]);
export type DirectoryEntityType = z.infer<typeof DirectoryEntityType>;

const directoryEntitySchema = z.object({
  type: DirectoryEntityType,
  id: z.string(),
  code: z.string(),
  name: z.string(),
  avatar: z.string(),
});

export type DirectoryEntity = z.infer<typeof directoryEntitySchema>;

export function toDirectoryEntityType(value: string): DirectoryEntityType {
  switch (value.toLowerCase()) {
    case "org":
    case "organization":
      return DirectoryEntityType.enum.Organization;
    case "group":
      return DirectoryEntityType.enum.Group;
    default:
      return DirectoryEntityType.enum.User;
  }
}
