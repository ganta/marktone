/** Invoked with the form container when a comment form opens or closes. */
export interface CommentFormCallbacks {
  onOpen: (container: HTMLElement) => void;
  onClose: (container: HTMLElement) => void;
}

/**
 * Kintone-UI-specific DOM handling, so Marktone works on both the legacy and
 * the revamped UI.
 *
 * `setEditorContent` exists instead of a plain `innerHTML` write because the
 * revamped UI is CKEditor 5, which submits content from its own model, not the
 * DOM; an `innerHTML` write there is silently dropped on submit.
 */
export interface UIAdapter {
  observeCommentForms(callbacks: CommentFormCallbacks): void;
  /** The rich-text input within the container, or null if not ready yet. */
  getEditorField(container: HTMLElement): HTMLElement | null;
  /** Reflect the rendered HTML so it is submitted with the comment. */
  setEditorContent(editorField: HTMLElement, html: string): void;
}

// Must match the event name handled by public/js/marktoneCKEditorBridge.js.
const CKEDITOR_SET_DATA_EVENT = "marktoneSetCKEditorData";

/**
 * UI adapter for the legacy (`ocean-ui-*`) kintone UI.
 */
class LegacyUIAdapter implements UIAdapter {
  private static readonly COMMENT_FORM_CLASS = "ocean-ui-comments-commentform";
  private static readonly COMMENT_FORM_ELEMENT_SELECTOR =
    "form.ocean-ui-comments-commentform-form";
  private static readonly EDITOR_FIELD_SELECTOR =
    'div.ocean-ui-editor-field[role="textbox"]';

  observeCommentForms(callbacks: CommentFormCallbacks): void {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (!LegacyUIAdapter.isExpandedStatusChanged(record)) continue;

        const target = record.target as HTMLElement;
        const form = target.querySelector<HTMLElement>(
          LegacyUIAdapter.COMMENT_FORM_ELEMENT_SELECTOR,
        );
        if (form === null) continue;

        if (target.getAttribute("aria-expanded") === "true") {
          callbacks.onOpen(form);
        } else {
          callbacks.onClose(form);
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeOldValue: true,
      attributeFilter: ["aria-expanded"],
    });
  }

  getEditorField(container: HTMLElement): HTMLElement | null {
    return container.querySelector<HTMLElement>(
      LegacyUIAdapter.EDITOR_FIELD_SELECTOR,
    );
  }

  setEditorContent(editorField: HTMLElement, html: string): void {
    editorField.innerHTML = html;
  }

  private static isExpandedStatusChanged(record: MutationRecord): boolean {
    const target = record.target as HTMLElement;

    if (!target.classList.contains(LegacyUIAdapter.COMMENT_FORM_CLASS))
      return false;

    const oldValue = record.oldValue;
    if (oldValue === null) return false;

    return oldValue !== target.getAttribute("aria-expanded");
  }
}

/**
 * UI adapter for the revamped (CKEditor 5) kintone UI.
 */
class RevampedUIAdapter implements UIAdapter {
  private static readonly COMMENT_EDITOR_SELECTOR =
    '[data-testid="comment-editor"]';
  private static readonly EDITOR_FIELD_SELECTOR =
    'div.ck-editor__editable[role="textbox"]';

  // Backs up the MutationObserver: reacting to mutations alone let missed or
  // out-of-order batches leave Marktone unmounted.
  private static readonly RECONCILE_INTERVAL_MS = 500;

  observeCommentForms(callbacks: CommentFormCallbacks): void {
    // Not driven by individual mutations: kintone re-renders this editor freely,
    // and the batching/ordering of those mutations caused mount-then-unmount
    // races. Instead, reconcile to the target state (ready editors have Marktone,
    // gone editors are closed) on every mutation and on an interval, so the
    // result does not depend on mutation timing. onOpen/onClose must be idempotent.
    const opened = new Set<HTMLElement>();

    const reconcile = (): void => {
      for (const editor of document.querySelectorAll<HTMLElement>(
        RevampedUIAdapter.COMMENT_EDITOR_SELECTOR,
      )) {
        // Not the bare node: mounting before CKEditor creates its editable lets
        // kintone's React wipe the injection during initialization.
        if (
          editor.querySelector(RevampedUIAdapter.EDITOR_FIELD_SELECTOR) === null
        ) {
          continue;
        }
        opened.add(editor);
        callbacks.onOpen(editor);
      }

      for (const editor of opened) {
        // Still in the document means React moved it, not that it was closed.
        if (editor.isConnected) continue;
        opened.delete(editor);
        callbacks.onClose(editor);
      }
    };

    reconcile();
    new MutationObserver(reconcile).observe(document.body, {
      childList: true,
      subtree: true,
    });
    setInterval(reconcile, RevampedUIAdapter.RECONCILE_INTERVAL_MS);
  }

  getEditorField(container: HTMLElement): HTMLElement | null {
    return container.querySelector<HTMLElement>(
      RevampedUIAdapter.EDITOR_FIELD_SELECTOR,
    );
  }

  setEditorContent(editorField: HTMLElement, html: string): void {
    // The content script (isolated world) can't reach `ckeditorInstance`, so
    // hand the HTML to the page-context bridge via an event on the editable.
    editorField.dispatchEvent(
      new CustomEvent(CKEDITOR_SET_DATA_EVENT, {
        detail: html,
        bubbles: true,
      }),
    );
  }
}

/**
 * The adapters for every supported kintone UI.
 *
 * Not chosen up front via `kintone.isRevampedUI()`: that isn't reliably
 * available at content-script start (kintone loads async) and returned false
 * intermittently, so Marktone failed to mount. Both adapters observe at once and
 * each detects its own form by DOM; a page renders only one kind, so only one
 * fires.
 */
export function createUIAdapters(): UIAdapter[] {
  return [new LegacyUIAdapter(), new RevampedUIAdapter()];
}
