import { beforeEach, describe, expect, it, vi } from "vitest";
import { isRevampedUI, setCKEditorData } from "@/apis/kintone/api";
import type KintoneClient from "@/app/kintone/kintone-client";
import type MentionReplacer from "@/app/markdown/replacer/mention-replacer";
import {
  createRevampedMarktoneHandler,
  type RevampedMarktoneHandler,
} from "@/app/revamped-marktone-handler";
import type { ReplyMention } from "@/components/Marktone";
import { DirectoryEntityType } from "@/models/DirectoryEntity";

interface CapturedMarktoneProps {
  setOriginalEditorContent: (html: string) => void;
  replayMentions: ReplyMention[];
}

const marktoneProps = vi.hoisted(() => ({
  current: undefined as CapturedMarktoneProps | undefined,
  all: [] as CapturedMarktoneProps[],
  renderCount: 0,
}));

vi.mock("@/components/Marktone", () => ({
  default: (props: CapturedMarktoneProps) => {
    marktoneProps.current = props;
    marktoneProps.all.push(props);
    marktoneProps.renderCount += 1;
    return <textarea className="rta__textarea" data-testid="marktone-mock" />;
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

function appendMentionWidget(
  editorField: HTMLElement,
  idAttributeName: string,
  id: string,
  code: string,
): void {
  const widget = document.createElement("span");
  widget.classList.add("editor-mention-wrapper", "ck-widget");

  const mention = document.createElement("button");
  mention.type = "button";
  mention.classList.add("editor-mention");
  mention.setAttribute(idAttributeName, id);
  mention.dataset.mentionCode = code;
  mention.textContent = `@${code}`;

  widget.appendChild(mention);
  editorField.appendChild(widget);
  editorField.appendChild(document.createTextNode("⁠ "));
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
    marktoneProps.all = [];
    marktoneProps.renderCount = 0;
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

  it("should mount with the prefilled reply mentions", async () => {
    // setup
    const { container, editorField } = createCommentEditor();
    appendMentionWidget(editorField, "data-mention-id", "1", "cybozu");
    appendMentionWidget(editorField, "data-org-mention-id", "2", "test_org");
    appendMentionWidget(
      editorField,
      "data-group-mention-id",
      "3",
      "Administrators",
    );
    const handler = newHandler();

    // exercise
    await reconcile(handler);

    // verify
    expect(container.querySelector(".marktone-container")).not.toBeNull();
    expect(marktoneProps.current?.replayMentions).toEqual([
      { type: DirectoryEntityType.enum.User, code: "cybozu" },
      { type: DirectoryEntityType.enum.Organization, code: "test_org" },
      { type: DirectoryEntityType.enum.Group, code: "Administrators" },
    ]);
  });

  it("should not mount when the editor holds a mention alongside other content", async () => {
    // setup
    const { container, editorField } = createCommentEditor();
    appendMentionWidget(editorField, "data-mention-id", "1", "cybozu");
    editorField.appendChild(document.createElement("img"));
    const handler = newHandler();

    // exercise
    await reconcile(handler);

    // verify
    expect(container.querySelector(".marktone-container")).toBeNull();
  });

  it("should take in a prefill that lands after the mount", async () => {
    // setup
    const { editorField } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);
    expect(marktoneProps.current?.replayMentions).toEqual([]);

    // exercise
    appendMentionWidget(editorField, "data-mention-id", "1", "cybozu");
    await reconcile(handler);

    // verify
    expect(marktoneProps.current?.replayMentions).toEqual([
      { type: DirectoryEntityType.enum.User, code: "cybozu" },
    ]);
  });

  it("should not re-render for an unchanged prefill", async () => {
    // setup
    const { editorField } = createCommentEditor();
    appendMentionWidget(editorField, "data-mention-id", "1", "cybozu");
    const handler = newHandler();
    await reconcile(handler);
    const renderCountAfterMount = marktoneProps.renderCount;

    // exercise
    await reconcile(handler);
    await reconcile(handler);

    // verify
    expect(marktoneProps.renderCount).toBe(renderCountAfterMount);
  });

  it("should ignore mentions written back by Marktone itself", async () => {
    // setup: an upcast Marktone mention carries no code
    const { editorField } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);
    const renderCountAfterMount = marktoneProps.renderCount;

    // exercise
    appendMentionWidget(editorField, "data-mention-id", "1", "");
    await reconcile(handler);

    // verify
    expect(marktoneProps.current?.replayMentions).toEqual([]);
    expect(marktoneProps.renderCount).toBe(renderCountAfterMount);
  });

  it("should accumulate a prefill that arrives in more than one batch", async () => {
    // setup
    const { editorField } = createCommentEditor();
    appendMentionWidget(editorField, "data-mention-id", "1", "cybozu");
    const handler = newHandler();
    await reconcile(handler);

    // exercise
    appendMentionWidget(
      editorField,
      "data-group-mention-id",
      "2",
      "Administrators",
    );
    await reconcile(handler);

    // verify
    expect(marktoneProps.current?.replayMentions).toEqual([
      { type: DirectoryEntityType.enum.User, code: "cybozu" },
      { type: DirectoryEntityType.enum.Group, code: "Administrators" },
    ]);
  });

  it("should keep the accumulated mentions when Marktone's write-back replaces them", async () => {
    // setup
    const { editorField } = createCommentEditor();
    appendMentionWidget(editorField, "data-mention-id", "1", "cybozu");
    const handler = newHandler();
    await reconcile(handler);

    // exercise: the write-back leaves only upcast mentions, which carry no code
    editorField.replaceChildren();
    appendMentionWidget(editorField, "data-mention-id", "1", "");
    appendMentionWidget(
      editorField,
      "data-group-mention-id",
      "2",
      "Administrators",
    );
    await reconcile(handler);

    // verify
    expect(marktoneProps.current?.replayMentions).toEqual([
      { type: DirectoryEntityType.enum.User, code: "cybozu" },
      { type: DirectoryEntityType.enum.Group, code: "Administrators" },
    ]);
  });

  it("should reset the reply mentions while the form is hidden", async () => {
    // setup
    const { container, editorField } = createCommentEditor();
    appendMentionWidget(editorField, "data-mention-id", "1", "cybozu");
    appendMentionWidget(
      editorField,
      "data-group-mention-id",
      "2",
      "Administrators",
    );
    const handler = newHandler();
    await reconcile(handler);
    expect(marktoneProps.current?.replayMentions).toHaveLength(2);

    // exercise: cancelling hides the form instead of removing it
    container.style.display = "none";
    editorField.replaceChildren();
    await reconcile(handler);

    // verify
    expect(marktoneProps.current?.replayMentions).toEqual([]);
  });

  it("should take in only the new prefill after the form is reopened", async () => {
    // setup
    const { container, editorField } = createCommentEditor();
    appendMentionWidget(editorField, "data-mention-id", "1", "cybozu");
    appendMentionWidget(
      editorField,
      "data-group-mention-id",
      "2",
      "Administrators",
    );
    const handler = newHandler();
    await reconcile(handler);
    container.style.display = "none";
    editorField.replaceChildren();
    await reconcile(handler);

    // exercise
    container.style.display = "";
    appendMentionWidget(editorField, "data-mention-id", "1", "cybozu");
    await reconcile(handler);

    // verify
    expect(marktoneProps.current?.replayMentions).toEqual([
      { type: DirectoryEntityType.enum.User, code: "cybozu" },
    ]);
  });

  it("should not take in a prefill after the user has typed", async () => {
    // setup
    const { editorField } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);
    document
      .querySelector("textarea")
      ?.dispatchEvent(new Event("input", { bubbles: true }));

    // exercise
    appendMentionWidget(editorField, "data-mention-id", "1", "cybozu");
    await reconcile(handler);

    // verify
    expect(marktoneProps.current?.replayMentions).toEqual([]);
  });

  it("should keep the reply mentions of simultaneous reply forms apart", async () => {
    // setup
    const first = createCommentEditor();
    appendMentionWidget(first.editorField, "data-mention-id", "1", "cybozu");
    const second = createCommentEditor();
    appendMentionWidget(second.editorField, "data-mention-id", "2", "guest");
    const handler = newHandler();

    // exercise: two passes, so React flushes both roots
    await reconcile(handler);
    await reconcile(handler);

    // verify
    expect(marktoneProps.all.map((props) => props.replayMentions)).toEqual([
      [{ type: DirectoryEntityType.enum.User, code: "cybozu" }],
      [{ type: DirectoryEntityType.enum.User, code: "guest" }],
    ]);
    expect(first.container.querySelector(".marktone-container")).not.toBeNull();
    expect(
      second.container.querySelector(".marktone-container"),
    ).not.toBeNull();
  });

  it("should focus the textarea when a hidden form becomes visible again", async () => {
    // setup
    const { container } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);
    container.style.display = "none";
    await reconcile(handler);
    (document.activeElement as HTMLElement | null)?.blur();

    // exercise
    container.style.display = "";
    await reconcile(handler);

    // verify
    expect(document.activeElement).toBe(
      container.querySelector("textarea.rta__textarea"),
    );
  });

  it("should focus the textarea when the form that reopens holds the focus", async () => {
    // setup: kintone keeps the focus on the collapsed placeholder it removes
    const { container } = createCommentEditor();
    const placeholder = document.createElement("textarea");
    container.parentElement?.appendChild(placeholder);
    const handler = newHandler();
    await reconcile(handler);
    container.style.display = "none";
    await reconcile(handler);
    placeholder.focus();

    // exercise
    container.style.display = "";
    await reconcile(handler);

    // verify
    expect(document.activeElement).toBe(
      container.querySelector("textarea.rta__textarea"),
    );
  });

  it("should focus the textarea when the button that reopened the form holds the focus", async () => {
    // setup
    const { container } = createCommentEditor();
    const reply = document.createElement("button");
    document.body.appendChild(reply);
    const handler = newHandler();
    await reconcile(handler);
    container.style.display = "none";
    await reconcile(handler);
    reply.focus();

    // exercise
    container.style.display = "";
    await reconcile(handler);

    // verify
    expect(document.activeElement).toBe(
      container.querySelector("textarea.rta__textarea"),
    );
  });

  it("should not take the focus when an unrelated element holds it", async () => {
    // setup
    const { container } = createCommentEditor();
    const commentForm = document.createElement("div");
    document.body.appendChild(commentForm);
    commentForm.appendChild(container);
    const other = document.createElement("input");
    document.body.appendChild(other);
    const handler = newHandler();
    await reconcile(handler);
    container.style.display = "none";
    await reconcile(handler);
    other.focus();

    // exercise
    container.style.display = "";
    await reconcile(handler);

    // verify
    expect(document.activeElement).toBe(other);
  });

  it("should not mount when the editor is inside a form", async () => {
    // setup
    const { container } = createCommentEditor();
    const form = document.createElement("form");
    document.body.appendChild(form);
    form.appendChild(container);
    const handler = newHandler();

    // exercise
    await reconcile(handler);

    // verify
    expect(container.querySelector(".marktone-container")).toBeNull();
  });

  it("should unmount when kintone moves the editor into a form", async () => {
    // setup
    const { container, ckEditorRoot } = createCommentEditor();
    const handler = newHandler();
    await reconcile(handler);
    expect(container.querySelector(".marktone-container")).not.toBeNull();

    // exercise
    const form = document.createElement("form");
    document.body.appendChild(form);
    form.appendChild(container);
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
