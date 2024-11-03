import {
  DirectoryEntityType,
  toDirectoryEntityType,
} from "@/app/kintone/DirectoryEntity.ts";

describe(toDirectoryEntityType, () => {
  it.each([
    { value: "user", expected: DirectoryEntityType.USER },
    { value: "USER", expected: DirectoryEntityType.USER },
    { value: "org", expected: DirectoryEntityType.ORGANIZATION },
    { value: "ORG", expected: DirectoryEntityType.ORGANIZATION },
    { value: "organization", expected: DirectoryEntityType.ORGANIZATION },
    { value: "ORGANIZATION", expected: DirectoryEntityType.ORGANIZATION },
    { value: "group", expected: DirectoryEntityType.GROUP },
    { value: "GROUP", expected: DirectoryEntityType.GROUP },
  ])("returns $expected when the value is $value", ({ value, expected }) => {
    expect(toDirectoryEntityType(value)).toBe(expected);
  });
});
