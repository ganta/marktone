import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  injectPageBridge,
  isRevampedUI,
  isRevampedUIRequestEventName,
  isRevampedUIResponseEventName,
  setCKEditorData,
  setCKEditorDataEventName,
} from "@/apis/kintone/api.ts";

type KintoneApi = typeof import("@/apis/kintone/api.ts");

const getURLMock = vi.fn();

let api: KintoneApi;

beforeEach(async () => {
  // The module holds state (bridge load promise, per-hash cache), so each
  // test needs a freshly evaluated instance instead of a reset hook.
  vi.resetModules();
  api = await import("@/apis/kintone/api.ts");

  getURLMock.mockReturnValue("chrome://test_url");
  Object.assign(globalThis, {
    chrome: { runtime: { getURL: getURLMock } },
  });
  window.location.hash = "";
});

afterEach(() => {
  vi.useRealTimers();
});

function flushTasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// jsdom never fires load events for script elements, so the appendChild spy
// stands in for the browser's loader.
function autoLoadInjectedScripts(): ReturnType<typeof vi.spyOn> {
  return vi
    .spyOn(document.body, "appendChild")
    .mockImplementation(<T extends Node>(node: T): T => {
      queueMicrotask(() => {
        node.dispatchEvent(new Event("load"));
      });
      return node;
    });
}

function captureInjectedScripts(): { scripts: HTMLScriptElement[] } {
  const captured: { scripts: HTMLScriptElement[] } = { scripts: [] };
  vi.spyOn(document.body, "appendChild").mockImplementation(
    <T extends Node>(node: T): T => {
      captured.scripts.push(node as unknown as HTMLScriptElement);
      return node;
    },
  );
  return captured;
}

describe(injectPageBridge, () => {
  it("should inject the page bridge script element and resolve after it loads", async () => {
    // setup
    const captured = captureInjectedScripts();
    let resolved = false;

    // exercise
    const promise = api.injectPageBridge().then(() => {
      resolved = true;
    });

    // verify: pending until the script's load event fires
    expect(getURLMock).toHaveBeenCalledWith("js/marktonePageBridge.js");
    expect(captured.scripts[0]).toBeInstanceOf(HTMLScriptElement);
    expect(captured.scripts[0].src).toBe("chrome://test_url");
    await flushTasks();
    expect(resolved).toBe(false);

    captured.scripts[0].dispatchEvent(new Event("load"));
    await promise;
    expect(resolved).toBe(true);
  });

  it("should inject the script only once and share the promise", async () => {
    // setup
    const appendChildSpy = autoLoadInjectedScripts();

    // exercise
    const firstPromise = api.injectPageBridge();
    const secondPromise = api.injectPageBridge();

    // verify
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    expect(secondPromise).toBe(firstPromise);
    await firstPromise;
  });

  it("should reject when the script fails to load and retry on the next call", async () => {
    // setup
    const captured = captureInjectedScripts();

    // exercise
    const promise = api.injectPageBridge();
    captured.scripts[0].dispatchEvent(new Event("error"));

    // verify
    await expect(promise).rejects.toThrow();
    api.injectPageBridge();
    expect(captured.scripts).toHaveLength(2);
  });
});

describe(isRevampedUI, () => {
  function respondToRequest(
    response: (requestId: string) => {
      requestId: string;
      available: boolean;
      isRevampedUI: boolean;
    },
  ): void {
    document.addEventListener(
      isRevampedUIRequestEventName,
      (event) => {
        const requestId = (event as CustomEvent<string>).detail;
        document.dispatchEvent(
          new CustomEvent(isRevampedUIResponseEventName, {
            detail: JSON.stringify(response(requestId)),
          }),
        );
      },
      { once: true },
    );
  }

  function countRequests(): { count: number } {
    const counter = { count: 0 };
    const listener = (): void => {
      counter.count += 1;
    };
    document.addEventListener(isRevampedUIRequestEventName, listener);
    return counter;
  }

  it("should resolve with the API result when the response is available", async () => {
    // setup
    autoLoadInjectedScripts();
    respondToRequest((requestId) => ({
      requestId,
      available: true,
      isRevampedUI: false,
    }));

    // exercise & verify
    await expect(api.isRevampedUI()).resolves.toBe(false);
  });

  it("should resolve with false when the API is unavailable", async () => {
    // setup
    autoLoadInjectedScripts();
    respondToRequest((requestId) => ({
      requestId,
      available: false,
      isRevampedUI: true,
    }));

    // exercise & verify
    await expect(api.isRevampedUI()).resolves.toBe(false);
  });

  it("should ignore responses for other requests", async () => {
    // setup
    vi.useFakeTimers();
    autoLoadInjectedScripts();
    respondToRequest(() => ({
      requestId: "other_request_id",
      available: true,
      isRevampedUI: true,
    }));

    // exercise
    const promise = api.isRevampedUI();
    await vi.advanceTimersByTimeAsync(1000);

    // verify: falls back to false because no matching response arrived
    await expect(promise).resolves.toBe(false);
  });

  it("should resolve with false when the response times out", async () => {
    // setup
    vi.useFakeTimers();
    autoLoadInjectedScripts();

    // exercise
    const promise = api.isRevampedUI();
    await vi.advanceTimersByTimeAsync(1000);

    // verify
    await expect(promise).resolves.toBe(false);
  });

  it("should resolve with false when the bridge script fails to load", async () => {
    // setup
    const captured = captureInjectedScripts();

    // exercise
    const promise = api.isRevampedUI();
    captured.scripts[0].dispatchEvent(new Event("error"));

    // verify
    await expect(promise).resolves.toBe(false);
  });

  it("should not dispatch the request until the bridge script has loaded", async () => {
    // setup
    const captured = captureInjectedScripts();
    const requests = countRequests();

    // exercise
    const promise = api.isRevampedUI();
    await flushTasks();

    // verify: no request while the bridge is still loading
    expect(requests.count).toBe(0);

    respondToRequest((requestId) => ({
      requestId,
      available: true,
      isRevampedUI: true,
    }));
    captured.scripts[0].dispatchEvent(new Event("load"));
    await expect(promise).resolves.toBe(true);
    expect(requests.count).toBe(1);
  });

  it("should ignore a malformed response and resolve with a later valid one", async () => {
    // setup
    autoLoadInjectedScripts();
    document.addEventListener(
      isRevampedUIRequestEventName,
      (event) => {
        const requestId = (event as CustomEvent<string>).detail;
        document.dispatchEvent(
          new CustomEvent(isRevampedUIResponseEventName, {
            detail: "not-json",
          }),
        );
        document.dispatchEvent(
          new CustomEvent(isRevampedUIResponseEventName, {
            detail: JSON.stringify({
              requestId,
              available: true,
              isRevampedUI: true,
            }),
          }),
        );
      },
      { once: true },
    );

    // exercise & verify
    await expect(api.isRevampedUI()).resolves.toBe(true);
  });

  it("should share one request among concurrent calls on the same screen", async () => {
    // setup
    autoLoadInjectedScripts();
    const requests = countRequests();
    respondToRequest((requestId) => ({
      requestId,
      available: true,
      isRevampedUI: true,
    }));

    // exercise
    const results = await Promise.all([api.isRevampedUI(), api.isRevampedUI()]);

    // verify
    expect(results).toEqual([true, true]);
    expect(requests.count).toBe(1);
  });

  it("should reuse the cached answer for the same hash", async () => {
    // setup
    autoLoadInjectedScripts();
    const requests = countRequests();
    respondToRequest((requestId) => ({
      requestId,
      available: true,
      isRevampedUI: true,
    }));
    await api.isRevampedUI();

    // exercise & verify
    await expect(api.isRevampedUI()).resolves.toBe(true);
    expect(requests.count).toBe(1);
  });

  it("should request again after the hash changes", async () => {
    // setup
    autoLoadInjectedScripts();
    const requests = countRequests();
    respondToRequest((requestId) => ({
      requestId,
      available: true,
      isRevampedUI: true,
    }));
    await api.isRevampedUI();

    // exercise
    window.location.hash = "#/other-screen";
    respondToRequest((requestId) => ({
      requestId,
      available: true,
      isRevampedUI: false,
    }));

    // verify
    await expect(api.isRevampedUI()).resolves.toBe(false);
    expect(requests.count).toBe(2);
  });

  it("should request again on the same hash after a timeout", async () => {
    // setup
    vi.useFakeTimers();
    autoLoadInjectedScripts();
    const requests = countRequests();
    const timedOut = api.isRevampedUI();
    await vi.advanceTimersByTimeAsync(1000);
    await expect(timedOut).resolves.toBe(false);

    // exercise
    respondToRequest((requestId) => ({
      requestId,
      available: true,
      isRevampedUI: true,
    }));

    // verify: the timeout was evicted from the cache, so a fresh request goes out
    await expect(api.isRevampedUI()).resolves.toBe(true);
    expect(requests.count).toBe(2);
  });
});

describe(setCKEditorData, () => {
  it("should dispatch a bubbling event with the HTML on the editable element", () => {
    // setup
    const editable = document.createElement("div");
    document.body.appendChild(editable);
    const listener = vi.fn();
    document.addEventListener(setCKEditorDataEventName, listener, {
      once: true,
    });

    // exercise
    api.setCKEditorData(editable, "<p>test</p>");

    // verify
    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent<string>;
    expect(event.target).toBe(editable);
    expect(event.detail).toBe("<p>test</p>");
    expect(event.bubbles).toBe(true);

    // teardown
    editable.remove();
  });
});
