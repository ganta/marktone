import { beforeEach, describe, expect, it, vi } from "vitest";
import { isRevampedUI } from "@/apis/kintone/api";
import type KintoneClient from "@/app/kintone/kintone-client";
import RevampedMarktoneHandler from "@/app/revamped-marktone-handler";

vi.mock("@/components/Marktone", () => ({
  default: () => <div data-testid="marktone-mock" />,
}));

vi.mock("@/apis/kintone/api", () => ({
  isRevampedUI: vi.fn(),
  setCKEditorData: vi.fn(),
}));

vi.mock("@/app/markdown/replacer/mention-replacer", () => ({
  default: vi.fn(),
}));

function createCommentEditor(editorFieldContent = ""): {
  container: HTMLElement;
  editorField: HTMLElement;
} {
  const container = document.createElement("div");

  const ckEditorRoot = document.createElement("div");
  ckEditorRoot.classList.add("ck", "ck-editor");

  const editorField = document.createElement("div");
  editorField.classList.add("ck", "ck-content", "ck-editor__editable");
  editorField.setAttribute("role", "textbox");
  editorField.setAttribute("contenteditable", "true");
  editorField.textContent = editorFieldContent;

  ckEditorRoot.appendChild(editorField);
  container.appendChild(ckEditorRoot);
  document.body.appendChild(container);

  return { container, editorField };
}

async function reconcile(handler: RevampedMarktoneHandler): Promise<void> {
  // biome-ignore lint/suspicious/noExplicitAny: reach the private method to test reconciliation without waiting for observers
  (handler as any).reconcile();
  // mount() is fire-and-forget inside reconcile(), so it cannot be awaited
  // directly; flush the task queue instead.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe(RevampedMarktoneHandler, () => {
  const isRevampedUIMock = vi.mocked(isRevampedUI);

  beforeEach(() => {
    document.body.innerHTML = "";
    isRevampedUIMock.mockReset();
    isRevampedUIMock.mockResolvedValue(true);
  });

  const newHandler = (): RevampedMarktoneHandler =>
    new RevampedMarktoneHandler({} as KintoneClient);

  it("should mount Marktone into the comment editor container", async () => {
    // setup
    const { container } = createCommentEditor();
    const handler = newHandler();

    // exercise
    await reconcile(handler);

    // verify
    const marktoneContainer = container.querySelector(".marktone-container");
    expect(marktoneContainer).not.toBeNull();
    expect(container.firstElementChild).toBe(marktoneContainer);
  });

  it("should not mount when the editor field is missing", async () => {
    // setup
    const container = document.createElement("div");
    const ckEditorRoot = document.createElement("div");
    ckEditorRoot.classList.add("ck", "ck-editor");
    container.appendChild(ckEditorRoot);
    document.body.appendChild(container);
    const handler = newHandler();

    // exercise
    await reconcile(handler);

    // verify
    expect(container.querySelector(".marktone-container")).toBeNull();
  });

  it("should not mount when the editor already has content", async () => {
    // setup
    const { container } = createCommentEditor("existing thread body");
    const handler = newHandler();

    // exercise
    await reconcile(handler);

    // verify
    expect(container.querySelector(".marktone-container")).toBeNull();
  });

  it("should not mount when isRevampedUI resolves false", async () => {
    // setup
    isRevampedUIMock.mockResolvedValue(false);
    const { container } = createCommentEditor();
    const handler = newHandler();

    // exercise
    await reconcile(handler);

    // verify
    expect(container.querySelector(".marktone-container")).toBeNull();
  });

  it("should not mount twice on repeated reconciliations", async () => {
    // setup
    const { container } = createCommentEditor();
    const handler = newHandler();

    // exercise
    await reconcile(handler);
    await reconcile(handler);

    // verify
    expect(container.querySelectorAll(".marktone-container")).toHaveLength(1);
    expect(isRevampedUIMock).toHaveBeenCalledTimes(1);
  });

  it("should unmount when the comment editor is removed from the document", async () => {
    // setup
    const { container } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);
    expect(container.querySelector(".marktone-container")).not.toBeNull();

    // exercise
    container.remove();
    await reconcile(handler);

    // verify
    expect(document.body.querySelector(".marktone-container")).toBeNull();
  });

  it("should re-prepend the Marktone container when kintone drops it", async () => {
    // setup
    const { container } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);
    const marktoneContainer = container.querySelector(".marktone-container");

    // exercise
    marktoneContainer?.remove();
    await reconcile(handler);

    // verify
    expect(container.firstElementChild).toBe(marktoneContainer);
  });
});
