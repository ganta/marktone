import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type KintoneClient from "@/app/kintone/kintone-client";
import type MentionReplacer from "@/app/markdown/replacer/mention-replacer";
import Marktone, { type ReplyMention } from "@/components/Marktone";
import { DirectoryEntityType } from "@/models/DirectoryEntity";

vi.mock("@/apis/cybozu/api", () => ({
  getLoginUser: () => ({ code: "me", id: "1", name: "Me" }),
}));

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  },
);

describe(Marktone, () => {
  const setOriginalEditorContent = vi.fn();

  beforeEach(() => {
    setOriginalEditorContent.mockClear();
  });

  const mentionReplacer = {
    fetchDirectoryEntityInText: vi.fn().mockResolvedValue(undefined),
    replaceMention: (text: string) => text,
  } as unknown as MentionReplacer;

  const renderMarktone = (replayMentions: ReplyMention[] = []) =>
    render(
      <Marktone
        setOriginalEditorContent={setOriginalEditorContent}
        replayMentions={replayMentions}
        kintoneClient={{} as KintoneClient}
        mentionReplacer={mentionReplacer}
      />,
    );

  it("should write the reply mentions back without any input", async () => {
    // setup & exercise
    renderMarktone([
      { type: DirectoryEntityType.enum.Group, code: "Administrators" },
    ]);

    // verify
    await waitFor(() => {
      expect(setOriginalEditorContent).toHaveBeenCalledWith(
        expect.stringContaining("@group/Administrators"),
      );
    });
  });

  it("should write an empty string back when the reply mentions are deleted", async () => {
    // setup
    const { getByRole } = renderMarktone([
      { type: DirectoryEntityType.enum.User, code: "cybozu" },
    ]);
    const textArea = getByRole("textbox");
    await waitFor(() => {
      expect(textArea).toHaveValue("@cybozu ");
    });
    setOriginalEditorContent.mockClear();

    // exercise
    await userEvent.clear(textArea);

    // verify
    await waitFor(() => {
      expect(setOriginalEditorContent).toHaveBeenLastCalledWith("");
    });
  });

  it("should leave out the login user", async () => {
    // setup & exercise
    const { getByRole } = renderMarktone([
      { type: DirectoryEntityType.enum.User, code: "me" },
    ]);

    // verify
    expect(getByRole("textbox")).toHaveValue("");
  });
});
