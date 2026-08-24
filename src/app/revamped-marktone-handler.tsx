import { createRoot, type Root } from "react-dom/client";
import { isRevampedUI, setCKEditorData } from "@/apis/kintone/api";
import Marktone, { type ReplyMention } from "@/components/Marktone";
import {
  extractRevampedReplyMentions,
  isEmptyExceptReplyMentions,
  mergeReplyMentions,
  replyMentionsSignature,
} from "@/utils/extractRevampedReplyMentions";
import { toRevampedMentionHTML } from "@/utils/toRevampedMentionHTML";
import type KintoneClient from "./kintone/kintone-client";
import type MentionReplacer from "./markdown/replacer/mention-replacer";

// CKEditor 5's own classes, not kintone's: kintone's class names are
// build-time hashed and its `data-testid` attributes may be removed, so
// neither is a dependable hook.
const EDITOR_FIELD_SELECTOR = 'div.ck-editor__editable[role="textbox"]';
const CKEDITOR_ROOT_SELECTOR = "div.ck.ck-editor";

const ORIGINAL_EDITOR_HIDDEN_CLASS = "marktone-original-editor-hidden";

// Backs up the MutationObserver: reacting to mutations alone can miss
// batched or out-of-order changes and leave Marktone unmounted.
const RECONCILE_INTERVAL_MILLISECONDS = 500;

// Not unmounted on the first pass without an editable: kintone recreates the
// editable during re-renders, and unmounting inside such a transient gap
// would discard in-progress text. The 500ms interval guarantees passes, so a
// wall-clock threshold is timing-independent, unlike a pass counter.
const EDITOR_FIELD_MISSING_UNMOUNT_MILLISECONDS = 2000;

interface MarktoneMount {
  marktoneContainer: HTMLElement;
  root: Root;
  lastWrittenHTML: string;
  lastSyncedEditorField: HTMLElement | null;
  editorFieldMissingSince: number | null;
  replyMentions: ReplyMention[];
  replyMentionsSignature: string;
  renderKey: number;
  userEdited: boolean;
  hidden: boolean;
}

export interface RevampedMarktoneHandler {
  handle: () => void;
  reconcile: () => void;
  scheduleReconcile: () => void;
}

/**
 * Attaches Marktone to the comment forms of kintone's revamped UI, which are
 * built on CKEditor 5 instead of the legacy `ocean-ui-*` editor.
 */
export function createRevampedMarktoneHandler(
  kintoneClient: KintoneClient,
  mentionReplacer: MentionReplacer,
): RevampedMarktoneHandler {
  const mounts = new Map<HTMLElement, MarktoneMount>();
  const mountsInProgress = new Set<HTMLElement>();
  let reconcileScheduled = false;

  function handle(): void {
    // Not driven by individual mutation records: kintone's React re-renders
    // the editor freely, and depending on mutation timing caused
    // mount-then-unmount races. Instead, converge to the target state (ready
    // editors have Marktone, removed editors are unmounted) on every mutation
    // batch and on an interval, so the result is timing-independent.
    reconcile();
    new MutationObserver(scheduleReconcile).observe(document.body, {
      childList: true,
      subtree: true,
    });
    setInterval(scheduleReconcile, RECONCILE_INTERVAL_MILLISECONDS);
  }

  function scheduleReconcile(): void {
    // Coalesced instead of run per callback: each reconcile scans the whole
    // document, and mutation bursts plus the interval would otherwise repeat
    // that scan several times per tick for the same DOM state.
    if (reconcileScheduled) return;
    reconcileScheduled = true;
    queueMicrotask(() => {
      reconcileScheduled = false;
      reconcile();
    });
  }

  function reconcile(): void {
    for (const editorField of document.querySelectorAll<HTMLElement>(
      EDITOR_FIELD_SELECTOR,
    )) {
      const container = findContainer(editorField);
      if (container === null) continue;

      if (mounts.has(container)) {
        ensureAttached(container, editorField);
        continue;
      }
      if (mountsInProgress.has(container)) continue;

      if (isUnsupportedEditor(editorField)) continue;

      // An editor currently holding content is not an empty comment form
      // (e.g. editing a thread body). Skipped per pass, not rejected
      // permanently: the same container may hold an empty comment form
      // later, e.g. after a prefilled reply is cleared.
      if (!isEmptyExceptReplyMentions(editorField)) continue;

      void mount(container, extractRevampedReplyMentions(editorField));
    }

    const now = Date.now();
    for (const [container, currentMount] of mounts) {
      if (!container.isConnected) {
        unmount(container);
        continue;
      }

      const editorField = container.querySelector<HTMLElement>(
        EDITOR_FIELD_SELECTOR,
      );
      if (editorField !== null) {
        currentMount.editorFieldMissingSince = null;
        continue;
      }
      currentMount.editorFieldMissingSince ??= now;
      if (
        now - currentMount.editorFieldMissingSince >=
        EDITOR_FIELD_MISSING_UNMOUNT_MILLISECONDS
      ) {
        unmount(container);
      }
    }
  }

  async function mount(
    container: HTMLElement,
    replyMentions: ReplyMention[],
  ): Promise<void> {
    mountsInProgress.add(container);

    try {
      // Not recorded on false: the answer is per-screen and the API module
      // caches it per hash, so re-asking on later passes is cheap and picks
      // up screen changes.
      if (!(await isRevampedUI())) return;

      // kintone may tear the form down while isRevampedUI() is in flight;
      // rendering into a detached container would create a React root no
      // reconcile pass can reach.
      if (!container.isConnected) return;

      const marktoneContainer = document.createElement("div");
      marktoneContainer.classList.add("marktone-container");
      container.prepend(marktoneContainer);

      // Hidden right away, not on the next reconcile pass, so the original
      // editor and Marktone never show up side by side.
      container
        .querySelector<HTMLElement>(EDITOR_FIELD_SELECTOR)
        ?.closest<HTMLElement>(CKEDITOR_ROOT_SELECTOR)
        ?.classList.add(ORIGINAL_EDITOR_HIDDEN_CLASS);

      const newMount: MarktoneMount = {
        marktoneContainer,
        root: createRoot(marktoneContainer),
        lastWrittenHTML: "",
        lastSyncedEditorField: null,
        editorFieldMissingSince: null,
        replyMentions: [],
        replyMentionsSignature: "",
        renderKey: 0,
        userEdited: false,
        hidden: false,
      };
      mounts.set(container, newMount);

      // Bound on the container rather than the textarea, which React has not
      // committed yet. Comparing the textarea's value against the injected
      // text is no substitute: the prefill and a file drop both change it
      // without a user event.
      for (const type of ["input", "paste", "drop"]) {
        marktoneContainer.addEventListener(type, () => {
          newMount.userEdited = true;
        });
      }

      render(newMount, container, replyMentions);
    } finally {
      mountsInProgress.delete(container);
    }
  }

  function render(
    currentMount: MarktoneMount,
    container: HTMLElement,
    replyMentions: ReplyMention[],
  ): void {
    currentMount.replyMentions = replyMentions;
    currentMount.replyMentionsSignature = replyMentionsSignature(replyMentions);
    currentMount.renderKey += 1;

    currentMount.root.render(
      <Marktone
        // Keyed on a counter, not on the mentions: the component must be
        // recreated on every call — its mention effect runs once on mount, so
        // a prop change alone would not pick one up — including a reset back
        // to no mentions, where the mentions would not have changed.
        key={currentMount.renderKey}
        setOriginalEditorContent={(html): void => {
          // Marktone's write-back effect fires on first render with "";
          // writing it through would wipe a prefill that landed after this
          // mount read the editor. After the first non-empty write, "" is a
          // legitimate clear. Suppressed here, not in the component: the
          // legacy handler depends on the current write-back timing.
          if (html === "" && currentMount.lastWrittenHTML === "") return;
          currentMount.lastWrittenHTML = html;

          // Queried per write, not captured: kintone may replace the
          // editable element between renders.
          const editorField = container.querySelector<HTMLElement>(
            EDITOR_FIELD_SELECTOR,
          );
          if (editorField === null) {
            currentMount.lastSyncedEditorField = null;
            return;
          }
          setCKEditorData(editorField, toRevampedMentionHTML(html));
          currentMount.lastSyncedEditorField = editorField;
        }}
        replayMentions={replyMentions}
        kintoneClient={kintoneClient}
        mentionReplacer={mentionReplacer}
      />,
    );
  }

  function ensureAttached(
    container: HTMLElement,
    editorField: HTMLElement,
  ): void {
    const currentMount = mounts.get(container);
    if (currentMount === undefined) return;

    // Re-checked, not only checked before mounting: hash navigation does not
    // reload the page, so kintone can reuse this container for an editor
    // Marktone does not support.
    if (isUnsupportedEditor(editorField)) {
      unmount(container);
      return;
    }

    // kintone's React drops the injected container on re-render since it is
    // not in its virtual DOM. Re-prepend the same node (keeping the React
    // root) instead of remounting, which would discard in-progress text.
    if (
      container.isConnected &&
      currentMount.marktoneContainer.parentElement !== container
    ) {
      container.prepend(currentMount.marktoneContainer);
    }

    // Re-added every pass: kintone recreates the CKEditor root without the
    // class.
    editorField
      .closest<HTMLElement>(CKEDITOR_ROOT_SELECTOR)
      ?.classList.add(ORIGINAL_EDITOR_HIDDEN_CLASS);

    // Cancelling a reply form hides it instead of removing it, so the mount
    // survives and would carry its accumulated mentions into the next reply
    // from the same comment. Reset while hidden rather than unmounting: the
    // container is the one kintone reuses when the form reopens.
    if (!container.checkVisibility()) {
      resetReplyMentions(currentMount, container, editorField);
      currentMount.hidden = true;
      return;
    }

    if (currentMount.hidden) {
      currentMount.hidden = false;
      // Focused from here, not from the component: a reopened form reuses the
      // same nodes, so React never remounts and the mount-time focus of the
      // textarea never runs again.
      if (isFocusClaimable(container)) {
        currentMount.marktoneContainer
          .querySelector<HTMLTextAreaElement>("textarea.rta__textarea")
          ?.focus();
      }
    }

    // Gated on the user not having edited rather than on an empty
    // lastWrittenHTML, which stops being empty as soon as the first batch of a
    // prefill is taken in and would drop every later batch.
    if (!currentMount.userEdited) {
      const replyMentions = mergeReplyMentions(
        currentMount.replyMentions,
        extractRevampedReplyMentions(editorField),
      );
      const signature = replyMentionsSignature(replyMentions);
      if (signature !== currentMount.replyMentionsSignature) {
        render(currentMount, container, replyMentions);
        return;
      }
    }

    // Re-synced by identity, not content: a recreated editable starts empty
    // while Marktone still holds the user's text. Marked synced without an
    // ack — the bridge no-ops if ckeditorInstance is not attached yet — but
    // the selector requires role="textbox", which CKEditor sets at attach
    // time, so a matched node has an instance in practice.
    if (
      currentMount.lastWrittenHTML !== "" &&
      currentMount.lastSyncedEditorField !== editorField
    ) {
      setCKEditorData(
        editorField,
        toRevampedMentionHTML(currentMount.lastWrittenHTML),
      );
      currentMount.lastSyncedEditorField = editorField;
    }
  }

  function resetReplyMentions(
    currentMount: MarktoneMount,
    container: HTMLElement,
    editorField: HTMLElement,
  ): void {
    if (
      currentMount.replyMentionsSignature === "" &&
      !currentMount.userEdited &&
      currentMount.lastWrittenHTML === ""
    ) {
      return;
    }

    // Cleared as well as reset: Marktone's own mentions are written back as
    // kintone's widgets, complete with codes, so leaving them behind would
    // make the next reply from this form read them as its prefill.
    setCKEditorData(editorField, "");

    currentMount.userEdited = false;
    currentMount.lastWrittenHTML = "";
    currentMount.lastSyncedEditorField = null;
    render(currentMount, container, []);
  }

  function unmount(container: HTMLElement): void {
    const currentMount = mounts.get(container);
    if (currentMount === undefined) return;
    mounts.delete(container);

    const { marktoneContainer, root } = currentMount;

    container
      .querySelector<HTMLElement>(CKEDITOR_ROOT_SELECTOR)
      ?.classList.remove(ORIGINAL_EDITOR_HIDDEN_CLASS);

    // kintone may have already detached the subtree. Unmounting a root whose
    // DOM is gone makes React throw while removing absent nodes, so re-attach
    // it first.
    if (!marktoneContainer.isConnected) {
      document.body.appendChild(marktoneContainer);
    }
    root.unmount();
    marktoneContainer.remove();
  }

  return { handle, reconcile, scheduleReconcile };
}

// Not gated on the focus being nowhere: reopening a form leaves it on the
// collapsed placeholder beside the editor, or on the Reply button that
// revealed the form. Only a field the user can type into is theirs to keep.
function isFocusClaimable(container: HTMLElement): boolean {
  const focused = document.activeElement;
  if (focused === null || focused === document.body) return true;
  if (container.parentElement?.contains(focused) === true) return true;
  return !isTextEntry(focused);
}

function isTextEntry(element: Element): boolean {
  return (
    element.matches("input, textarea, select") ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}

// Told apart by the form rather than by a class name or the hash: kintone's
// class names are build-time hashed, and the comment and reply editors are
// the only ones it puts outside a form.
function isUnsupportedEditor(editorField: HTMLElement): boolean {
  return editorField.closest("form") !== null;
}

function findContainer(editorField: HTMLElement): HTMLElement | null {
  return (
    editorField.closest<HTMLElement>(CKEDITOR_ROOT_SELECTOR)?.parentElement ??
    null
  );
}
