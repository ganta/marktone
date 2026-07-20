import { createRoot, type Root } from "react-dom/client";
import { isRevampedUI, setCKEditorData } from "@/apis/kintone/api";
import Marktone from "@/components/Marktone";
import type KintoneClient from "./kintone/kintone-client";
import MentionReplacer from "./markdown/replacer/mention-replacer";

// CKEditor 5's own classes, not kintone's: kintone's class names are
// build-time hashed and its `data-testid` attributes may be removed, so
// neither is a dependable hook.
const EDITOR_FIELD_SELECTOR = 'div.ck-editor__editable[role="textbox"]';
const CKEDITOR_ROOT_SELECTOR = "div.ck.ck-editor";

// Backs up the MutationObserver: reacting to mutations alone can miss
// batched or out-of-order changes and leave Marktone unmounted.
const RECONCILE_INTERVAL_MILLISECONDS = 500;

interface MarktoneMount {
  marktoneContainer: HTMLElement;
  root: Root;
  keepAlive: MutationObserver;
}

/**
 * Attaches Marktone to the comment forms of kintone's revamped UI, which are
 * built on CKEditor 5 instead of the legacy `ocean-ui-*` editor.
 */
class RevampedMarktoneHandler {
  private readonly kintoneClient: KintoneClient;
  private readonly mentionReplacer: MentionReplacer;
  private readonly mounts = new Map<HTMLElement, MarktoneMount>();
  private readonly mountsInProgress = new Set<HTMLElement>();
  private readonly rejectedContainers = new WeakSet<HTMLElement>();

  constructor(kintoneClient: KintoneClient) {
    this.kintoneClient = kintoneClient;
    this.mentionReplacer = new MentionReplacer(kintoneClient);
  }

  handle(): void {
    // Not driven by individual mutation records: kintone's React re-renders
    // the editor freely, and depending on mutation timing caused
    // mount-then-unmount races. Instead, converge to the target state (ready
    // editors have Marktone, removed editors are unmounted) on every mutation
    // batch and on an interval, so the result is timing-independent.
    const reconcile = (): void => this.reconcile();

    reconcile();
    new MutationObserver(reconcile).observe(document.body, {
      childList: true,
      subtree: true,
    });
    setInterval(reconcile, RECONCILE_INTERVAL_MILLISECONDS);
  }

  private reconcile(): void {
    for (const editorField of document.querySelectorAll<HTMLElement>(
      EDITOR_FIELD_SELECTOR,
    )) {
      const container = RevampedMarktoneHandler.findContainer(editorField);
      if (container === null) continue;
      if (this.rejectedContainers.has(container)) continue;

      if (this.mounts.has(container)) {
        this.ensureAttached(container);
        continue;
      }
      if (this.mountsInProgress.has(container)) continue;

      // An editor opened with existing content is not a comment form (e.g.
      // editing a thread body); mounting there would wipe that content with
      // Marktone's initial empty write.
      if ((editorField.textContent ?? "").trim() !== "") {
        this.rejectedContainers.add(container);
        continue;
      }

      void this.mount(container);
    }

    for (const container of this.mounts.keys()) {
      if (!container.isConnected) {
        this.unmount(container);
      }
    }
  }

  private async mount(container: HTMLElement): Promise<void> {
    this.mountsInProgress.add(container);

    try {
      if (!(await isRevampedUI())) {
        this.rejectedContainers.add(container);
        return;
      }

      // A concurrent reconcile pass may have mounted during the await above.
      if (this.mounts.has(container)) return;

      const marktoneContainer = document.createElement("div");
      marktoneContainer.classList.add("marktone-container");
      container.prepend(marktoneContainer);

      // kintone's React drops the injected container on re-render since it is
      // not in its virtual DOM. Re-prepend the same node (keeping the React
      // root) instead of remounting, which would discard in-progress text.
      const keepAlive = new MutationObserver(() => {
        if (
          container.isConnected &&
          marktoneContainer.parentElement !== container
        ) {
          container.prepend(marktoneContainer);
        }
      });
      keepAlive.observe(container, { childList: true });

      const root = createRoot(marktoneContainer);
      this.mounts.set(container, { marktoneContainer, root, keepAlive });

      root.render(
        <Marktone
          setOriginalEditorContent={(html): void => {
            // Queried per write, not captured: kintone may replace the
            // editable element between renders.
            const editorField = container.querySelector<HTMLElement>(
              EDITOR_FIELD_SELECTOR,
            );
            if (editorField) {
              setCKEditorData(editorField, html);
            }
          }}
          replayMentions={[]}
          kintoneClient={this.kintoneClient}
          mentionReplacer={this.mentionReplacer}
        />,
      );
    } finally {
      this.mountsInProgress.delete(container);
    }
  }

  private ensureAttached(container: HTMLElement): void {
    const mount = this.mounts.get(container);
    if (mount === undefined) return;

    if (
      container.isConnected &&
      mount.marktoneContainer.parentElement !== container
    ) {
      container.prepend(mount.marktoneContainer);
    }
  }

  private unmount(container: HTMLElement): void {
    const mount = this.mounts.get(container);
    if (mount === undefined) return;
    this.mounts.delete(container);

    const { marktoneContainer, root, keepAlive } = mount;
    keepAlive.disconnect();

    // kintone may have already detached the subtree. Unmounting a root whose
    // DOM is gone makes React throw while removing absent nodes, so re-attach
    // it first.
    if (!marktoneContainer.isConnected) {
      document.body.appendChild(marktoneContainer);
    }
    root.unmount();
    marktoneContainer.remove();
  }

  private static findContainer(editorField: HTMLElement): HTMLElement | null {
    return (
      editorField.closest<HTMLElement>(CKEDITOR_ROOT_SELECTOR)?.parentElement ??
      null
    );
  }
}

export default RevampedMarktoneHandler;
