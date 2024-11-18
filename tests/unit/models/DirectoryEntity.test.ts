import {
  DirectoryEntityType,
  toDirectoryEntityType,
} from "@/models/DirectoryEntity.ts";

describe(toDirectoryEntityType, () => {
  it.each([
    { value: "user", expected: DirectoryEntityType.enum.User },
    { value: "USER", expected: DirectoryEntityType.enum.User },
    { value: "org", expected: DirectoryEntityType.enum.Organization },
    { value: "ORG", expected: DirectoryEntityType.enum.Organization },
    { value: "organization", expected: DirectoryEntityType.enum.Organization },
    { value: "ORGANIZATION", expected: DirectoryEntityType.enum.Organization },
    { value: "group", expected: DirectoryEntityType.enum.Group },
    { value: "GROUP", expected: DirectoryEntityType.enum.Group },
  ])("returns $expected when the value is $value", ({ value, expected }) => {
    expect(toDirectoryEntityType(value)).toBe(expected);
  });
});
