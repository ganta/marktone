import { beforeEach, describe, expect, it, vi } from "vitest";
import { isRevampedUI, setCKEditorData } from "@/apis/kintone/api";
import type KintoneClient from "@/app/kintone/kintone-client";
import type MentionReplacer from "@/app/markdown/replacer/mention-replacer";
import {
  createRevampedMarktoneHandler,
  type RevampedMarktoneHandler,
} from "@/app/revamped-marktone-handler";

interface CapturedMarktoneProps {
  setOriginalEditorContent: (html: string) => void;
}

const marktoneProps = vi.hoisted(() => ({
  current: undefined as
    | { setOriginalEditorContent: (html: string) => void }
    | undefined,
}));

vi.mock("@/components/Marktone", () => ({
  default: (props: CapturedMarktoneProps) => {
    marktoneProps.current = props;
    return <div data-testid="marktone-mock" />;
  },
}));

vi.mock("@/apis/kintone/api", () => ({
  isRevampedUI: vi.fn(),
  setCKEditorData: vi.fn(),
}));

const HIDDEN_CLASS = "marktone-original-editor-hidden";

function createEditorField(content = ""): HTMLElement {
  const editorField = document.createElement("div");
  editorField.classList.add("ck", "ck-content", "ck-editor__editable");
  editorField.setAttribute("role", "textbox");
  editorField.setAttribute("contenteditable", "true");
  editorField.textContent = content;
  return editorField;
}

function createCommentEditor(editorFieldContent = ""): {
  container: HTMLElement;
  ckEditorRoot: HTMLElement;
  editorField: HTMLElement;
} {
  const container = document.createElement("div");

  const ckEditorRoot = document.createElement("div");
  ckEditorRoot.classList.add("ck", "ck-editor");

  const editorField = createEditorField(editorFieldContent);

  ckEditorRoot.appendChild(editorField);
  container.appendChild(ckEditorRoot);
  document.body.appendChild(container);

  return { container, ckEditorRoot, editorField };
}

async function reconcile(handler: RevampedMarktoneHandler): Promise<void> {
  handler.reconcile();
  // mount() is fire-and-forget inside reconcile(), so it cannot be awaited
  // directly; flush the task queue instead.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe(createRevampedMarktoneHandler, () => {
  const isRevampedUIMock = vi.mocked(isRevampedUI);
  const setCKEditorDataMock = vi.mocked(setCKEditorData);

  beforeEach(() => {
    document.body.innerHTML = "";
    marktoneProps.current = undefined;
    isRevampedUIMock.mockReset();
    isRevampedUIMock.mockResolvedValue(true);
  });

  const newHandler = (): RevampedMarktoneHandler =>
    createRevampedMarktoneHandler({} as KintoneClient, {} as MentionReplacer);

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

  it("should mount after the editor content is cleared", async () => {
    // setup
    const { container, editorField } = createCommentEditor("prefilled reply");
    const handler = newHandler();
    await reconcile(handler);
    expect(container.querySelector(".marktone-container")).toBeNull();

    // exercise
    editorField.textContent = "";
    await reconcile(handler);

    // verify
    expect(container.querySelector(".marktone-container")).not.toBeNull();
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

  it("should retry mounting after isRevampedUI resolved false", async () => {
    // setup
    isRevampedUIMock.mockResolvedValueOnce(false);
    const { container } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);
    expect(container.querySelector(".marktone-container")).toBeNull();

    // exercise
    await reconcile(handler);

    // verify
    expect(container.querySelector(".marktone-container")).not.toBeNull();
  });

  it("should abort mounting when the container is detached while isRevampedUI is in flight", async () => {
    // setup
    const { container } = createCommentEditor();
    isRevampedUIMock.mockImplementation(async () => {
      container.remove();
      return true;
    });
    const handler = newHandler();

    // exercise
    await reconcile(handler);

    // verify
    expect(document.body.querySelector(".marktone-container")).toBeNull();
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

  it("should hide the original editor while mounted", async () => {
    // setup
    const { ckEditorRoot } = createCommentEditor();
    const handler = newHandler();

    // exercise
    await reconcile(handler);

    // verify
    expect(ckEditorRoot.classList.contains(HIDDEN_CLASS)).toBe(true);
  });

  it("should re-hide the original editor when kintone recreates the CKEditor root", async () => {
    // setup
    const { container, ckEditorRoot } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);

    // exercise
    ckEditorRoot.remove();
    const newCkEditorRoot = document.createElement("div");
    newCkEditorRoot.classList.add("ck", "ck-editor");
    newCkEditorRoot.appendChild(createEditorField());
    container.appendChild(newCkEditorRoot);
    await reconcile(handler);

    // verify
    expect(newCkEditorRoot.classList.contains(HIDDEN_CLASS)).toBe(true);
  });

  it("should suppress the initial empty write", async () => {
    // setup
    createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);

    // exercise
    marktoneProps.current?.setOriginalEditorContent("");

    // verify
    expect(setCKEditorDataMock).not.toHaveBeenCalled();
  });

  it("should pass an empty write through after a non-empty write as a clear", async () => {
    // setup
    const { editorField } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);

    // exercise
    marktoneProps.current?.setOriginalEditorContent("<p>a</p>");
    marktoneProps.current?.setOriginalEditorContent("");

    // verify
    expect(setCKEditorDataMock).toHaveBeenNthCalledWith(
      1,
      editorField,
      "<p>a</p>",
    );
    expect(setCKEditorDataMock).toHaveBeenNthCalledWith(2, editorField, "");
  });

  it("should re-sync the last written HTML when kintone replaces the editable element", async () => {
    // setup
    const { ckEditorRoot, editorField } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);
    marktoneProps.current?.setOriginalEditorContent("<p>hello</p>");
    setCKEditorDataMock.mockClear();

    // exercise
    editorField.remove();
    const newEditorField = createEditorField();
    ckEditorRoot.appendChild(newEditorField);
    await reconcile(handler);

    // verify
    expect(setCKEditorDataMock).toHaveBeenCalledWith(
      newEditorField,
      "<p>hello</p>",
    );
  });

  it("should not re-sync when nothing has been written", async () => {
    // setup
    const { ckEditorRoot, editorField } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);

    // exercise
    editorField.remove();
    ckEditorRoot.appendChild(createEditorField());
    await reconcile(handler);

    // verify
    expect(setCKEditorDataMock).not.toHaveBeenCalled();
  });

  it("should keep the mount while the editable is only transiently missing", async () => {
    // setup
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000);
    const { container, ckEditorRoot } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);

    // exercise: the editable disappears, then returns before the threshold
    ckEditorRoot.remove();
    await reconcile(handler);
    expect(container.querySelector(".marktone-container")).not.toBeNull();
    container.appendChild(ckEditorRoot);
    nowSpy.mockReturnValue(4_000);
    await reconcile(handler);

    // verify: the missing timer was reset by the editable's return
    expect(container.querySelector(".marktone-container")).not.toBeNull();
  });

  it("should unmount and reveal the original editor when the editable stays missing", async () => {
    // setup
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000);
    const { container, ckEditorRoot, editorField } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);
    expect(ckEditorRoot.classList.contains(HIDDEN_CLASS)).toBe(true);

    // exercise
    editorField.remove();
    await reconcile(handler);
    nowSpy.mockReturnValue(3_000);
    await reconcile(handler);

    // verify
    expect(container.querySelector(".marktone-container")).toBeNull();
    expect(ckEditorRoot.classList.contains(HIDDEN_CLASS)).toBe(false);
  });

  it("should coalesce scheduled reconciliations into one run", async () => {
    // setup: reconcile is closure-held and cannot be spied on directly, so
    // runs are counted via their single document-wide query instead
    const handler = newHandler();
    const querySelectorAllSpy = vi.spyOn(document, "querySelectorAll");

    // exercise
    handler.scheduleReconcile();
    handler.scheduleReconcile();
    handler.scheduleReconcile();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // verify
    expect(querySelectorAllSpy).toHaveBeenCalledTimes(1);
  });
});
