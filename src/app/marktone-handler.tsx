import { createRoot, type Root } from "react-dom/client";
import Marktone, { type ReplyMention } from "@/components/Marktone";
import { extractReplyMentions } from "@/utils/extractReplyMentions";
import type KintoneClient from "./kintone/kintone-client";
import { createUIAdapters, type UIAdapter } from "./kintone/ui-adapter";
import MentionReplacer from "./markdown/replacer/mention-replacer";

interface MarktoneMount {
  marktoneContainer: HTMLElement;
  root: Root;
  keepAlive: MutationObserver;
}

class MarktoneHandler {
  private readonly kintoneClient: KintoneClient;
  private readonly mentionReplacer: MentionReplacer;
  private readonly uiAdapters: UIAdapter[];
  // Keyed by container so a repeatedly-reported form is not mounted twice.
  private readonly mounts = new Map<HTMLElement, MarktoneMount>();

  constructor(kintoneClient: KintoneClient) {
    this.kintoneClient = kintoneClient;
    this.mentionReplacer = new MentionReplacer(kintoneClient);
    this.uiAdapters = createUIAdapters();
  }

  handle(): void {
    // Each mount uses the adapter that detected it, rather than a single adapter
    // picked from an unreliable early UI check (see createUIAdapters).
    for (const adapter of this.uiAdapters) {
      adapter.observeCommentForms({
        onOpen: (container) => {
          void this.renderMarktone(adapter, container);
        },
        onClose: (container) => {
          this.unmountMarktone(container);
        },
      });
    }
  }

  private async renderMarktone(
    adapter: UIAdapter,
    container: HTMLElement,
  ): Promise<void> {
    // Already mounted: only re-attach, don't create a second root.
    if (this.mounts.has(container)) {
      this.ensureAttached(container);
      return;
    }

    const originalTextbox = adapter.getEditorField(container);
    let replyMentions: ReplyMention[] = [];
    try {
      replyMentions = originalTextbox
        ? await this.extractReplyMentions(originalTextbox)
        : [];
    } catch {
      // Don't mount on a failed lookup; a later reconcile pass will retry.
      return;
    }

    // A concurrent invocation may have mounted during the await above.
    if (this.mounts.has(container)) {
      this.ensureAttached(container);
      return;
    }

    const marktoneContainer = document.createElement("div");
    marktoneContainer.classList.add("marktone-container");
    container.prepend(marktoneContainer);

    const root = createRoot(marktoneContainer);

    // kintone's React drops our container on re-render since it isn't in its
    // virtual DOM. Re-prepend the same node (keeping the root) instead of
    // remounting, which would discard the user's in-progress text.
    const keepAlive = new MutationObserver(() => {
      if (
        container.isConnected &&
        marktoneContainer.parentElement !== container
      ) {
        container.prepend(marktoneContainer);
      }
    });
    keepAlive.observe(container, { childList: true });

    this.mounts.set(container, { marktoneContainer, root, keepAlive });

    root.render(
      <Marktone
        originalFormEl={container}
        replayMentions={replyMentions}
        kintoneClient={this.kintoneClient}
        mentionReplacer={this.mentionReplacer}
        uiAdapter={adapter}
      />,
    );
  }

  // Re-attaches the Marktone container if kintone detached it while the form
  // itself is still on the page.
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

  private unmountMarktone(container: HTMLElement): void {
    const mount = this.mounts.get(container);
    if (mount === undefined) return;
    this.mounts.delete(container);

    const { marktoneContainer, root, keepAlive } = mount;
    keepAlive.disconnect();

    // kintone may have already detached this subtree. Unmounting a root whose
    // DOM is gone makes React throw removing absent nodes, so re-attach first.
    if (!marktoneContainer.isConnected) {
      document.body.appendChild(marktoneContainer);
    }
    root.unmount();
    marktoneContainer.remove();
  }

  private async extractReplyMentions(
    element: HTMLElement,
  ): Promise<ReplyMention[]> {
    const idAndTypes = extractReplyMentions(element);
    // Skip the request when empty, so mounting doesn't wait on the network and
    // the original editor doesn't flash before Marktone replaces it.
    if (idAndTypes.length === 0) return [];

    const entities =
      await this.kintoneClient.listDirectoryEntityByIdAndType(idAndTypes);

    return entities.map<ReplyMention>((entity) => {
      return { type: entity.type, code: entity.code };
    });
  }
}

export default MarktoneHandler;
