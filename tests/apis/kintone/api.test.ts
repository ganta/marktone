import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  injectPageBridge,
  isRevampedUI,
  isRevampedUIRequestEventName,
  isRevampedUIResponseEventName,
  resetPageBridgeInjectionForTesting,
  setCKEditorData,
  setCKEditorDataEventName,
} from "@/apis/kintone/api.ts";

describe(injectPageBridge, () => {
  const getURLMock = vi.fn();

  beforeEach(() => {
    Object.assign(globalThis, {
      chrome: { runtime: { getURL: getURLMock } },
    });
    resetPageBridgeInjectionForTesting();
  });

  it("should inject the page bridge script element", () => {
    // setup
    getURLMock.mockReturnValue("chrome://test_url");
    const appendChildSpy = vi.spyOn(document.body, "appendChild");

    // exercise
    injectPageBridge();

    // verify
    expect(getURLMock).toHaveBeenCalledWith("js/marktonePageBridge.js");
    const scriptEl = appendChildSpy.mock.calls[0][0];
    expect(scriptEl).toBeInstanceOf(HTMLScriptElement);
    expect((scriptEl as HTMLScriptElement).src).toBe("chrome://test_url");
  });

  it("should inject the script only once", () => {
    // setup
    getURLMock.mockReturnValue("chrome://test_url");
    const appendChildSpy = vi.spyOn(document.body, "appendChild");

    // exercise
    injectPageBridge();
    injectPageBridge();

    // verify
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should resolve with the API result when the response is available", async () => {
    // setup
    respondToRequest((requestId) => ({
      requestId,
      available: true,
      isRevampedUI: false,
    }));

    // exercise & verify
    await expect(isRevampedUI()).resolves.toBe(false);
  });

  it("should resolve with true when the API is unavailable", async () => {
    // setup
    respondToRequest((requestId) => ({
      requestId,
      available: false,
      isRevampedUI: false,
    }));

    // exercise & verify
    await expect(isRevampedUI()).resolves.toBe(true);
  });

  it("should ignore responses for other requests", async () => {
    // setup
    vi.useFakeTimers();
    respondToRequest(() => ({
      requestId: "other_request_id",
      available: true,
      isRevampedUI: false,
    }));

    // exercise
    const promise = isRevampedUI();
    vi.advanceTimersByTime(1000);

    // verify: falls back to true because no matching response arrived
    await expect(promise).resolves.toBe(true);
  });

  it("should resolve with true when the response times out", async () => {
    // setup
    vi.useFakeTimers();

    // exercise
    const promise = isRevampedUI();
    vi.advanceTimersByTime(1000);

    // verify
    await expect(promise).resolves.toBe(true);
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
    setCKEditorData(editable, "<p>test</p>");

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
