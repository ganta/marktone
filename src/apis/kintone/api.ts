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

let pageBridgeInjected = false;

export function injectPageBridge(): void {
  if (pageBridgeInjected) return;
  pageBridgeInjected = true;

  const scriptEl = document.createElement("script");
  scriptEl.src = chrome.runtime.getURL("js/marktonePageBridge.js");
  document.body.appendChild(scriptEl);
}

export function resetPageBridgeInjectionForTesting(): void {
  pageBridgeInjected = false;
}

interface IsRevampedUIResponse {
  requestId: string;
  available: boolean;
  isRevampedUI: boolean;
}

export async function isRevampedUI(): Promise<boolean> {
  return new Promise((resolve) => {
    const requestId = crypto.randomUUID();

    const timeoutTimer = setTimeout(() => {
      document.removeEventListener(isRevampedUIResponseEventName, handler);
      // Fail open: callers ask only after matching the revamped UI DOM
      // signature, so an unanswered request should not block mounting.
      resolve(true);
    }, responseTimeoutMilliseconds);

    function handler(event: CustomEvent<string>): void {
      const response = JSON.parse(event.detail) as IsRevampedUIResponse;
      if (response.requestId !== requestId) return;

      clearTimeout(timeoutTimer);
      document.removeEventListener(isRevampedUIResponseEventName, handler);
      // Fail open when the API is unavailable, for the same reason as the
      // timeout above.
      resolve(response.available ? response.isRevampedUI : true);
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
