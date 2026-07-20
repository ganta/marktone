import { injectScript } from "@/apis/inject-script.ts";

declare global {
  // noinspection JSUnusedGlobalSymbols
  interface DocumentEventMap {
    marktoneIsRevampedUIResponse: CustomEvent<string>;
  }
}

export const isRevampedUIRequestEventName = "marktoneIsRevampedUIRequest";
export const isRevampedUIResponseEventName = "marktoneIsRevampedUIResponse";
export const setCKEditorDataEventName = "marktoneSetCKEditorData";

const responseTimeoutMilliseconds = 1000;

let pageBridgeReady: Promise<void> | undefined;

export function injectPageBridge(): Promise<void> {
  pageBridgeReady ??= injectScript("js/marktonePageBridge.js").catch(
    (error: unknown) => {
      // Caching the rejection would fail every later call; evicting lets the
      // next caller retry the injection.
      pageBridgeReady = undefined;
      throw error;
    },
  );
  return pageBridgeReady;
}

interface IsRevampedUIResponse {
  requestId: string;
  available: boolean;
  isRevampedUI: boolean;
}

// Keyed by hash, not cached per page load: the answer is per-screen and
// in-app hash navigation does not reload the page. The in-flight promise is
// stored so concurrent callers on one screen share a single round trip.
let cachedIsRevampedUI: { hash: string; promise: Promise<boolean> } | undefined;

export function isRevampedUI(): Promise<boolean> {
  const hash = window.location.hash;
  if (cachedIsRevampedUI?.hash !== hash) {
    cachedIsRevampedUI = { hash, promise: resolveIsRevampedUI(hash) };
  }
  return cachedIsRevampedUI.promise;
}

function evictIsRevampedUICache(hash: string): void {
  if (cachedIsRevampedUI?.hash === hash) {
    cachedIsRevampedUI = undefined;
  }
}

async function resolveIsRevampedUI(hash: string): Promise<boolean> {
  try {
    await injectPageBridge();
  } catch {
    evictIsRevampedUICache(hash);
    return false;
  }

  return new Promise((resolve) => {
    const requestId = crypto.randomUUID();

    const timeoutTimer = setTimeout(() => {
      document.removeEventListener(isRevampedUIResponseEventName, handler);
      // Fail closed: wrongly mounting hides an editor and can overwrite its
      // content, while wrongly not mounting only loses the Markdown editor.
      // Evicted from the cache because a timeout after the awaited bridge
      // load is an anomaly, not an answer; caching it would reject the
      // screen until the next hash navigation.
      evictIsRevampedUICache(hash);
      resolve(false);
    }, responseTimeoutMilliseconds);

    function handler(event: CustomEvent<string>): void {
      let response: IsRevampedUIResponse;
      try {
        response = JSON.parse(event.detail) as IsRevampedUIResponse;
      } catch {
        // An unparsable detail cannot be matched to a request; keep waiting
        // for a valid response — the timeout still bounds the wait.
        return;
      }
      if (response.requestId !== requestId) return;

      clearTimeout(timeoutTimer);
      document.removeEventListener(isRevampedUIResponseEventName, handler);
      // Fail closed when the API is unavailable, for the same reason as the
      // timeout above.
      resolve(response.available ? response.isRevampedUI : false);
    }

    document.addEventListener(isRevampedUIResponseEventName, handler);

    document.dispatchEvent(
      new CustomEvent(isRevampedUIRequestEventName, { detail: requestId }),
    );
  });
}

export function setCKEditorData(editable: HTMLElement, html: string): void {
  editable.dispatchEvent(
    new CustomEvent(setCKEditorDataEventName, {
      detail: html,
      bubbles: true,
    }),
  );
}
