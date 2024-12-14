import {
  clearCachedCybozuData,
  getCybozuData,
} from "@/apis/cybozu/getCybozuData.ts";

describe(getCybozuData, () => {
  const getURLMock = vi.fn();

  beforeEach(() => {
    // Assign the mock to the global object
    Object.assign(globalThis, {
      chrome: { runtime: { getURL: getURLMock } },
    });

    // Clear the cache
    clearCachedCybozuData();
  });

  it("should resolve with data when CustomEvent is dispatched", async () => {
    // setup
    const mockedData = {
      DISPLAY_LOCALE: "ja",
      LOGIN_USER: { code: "test_user" },
      REQUEST_TOKEN: "test_token",
    };
    const event = new CustomEvent("cybozuDataPass", { detail: mockedData });

    getURLMock.mockImplementation(() => {
      document.dispatchEvent(event);
      return "chrome://test_url";
    });
    const appendChildSpy = vi.spyOn(document.body, "appendChild");

    // exercise
    const firstResult = await getCybozuData();
    const secondResult = await getCybozuData();

    // verify
    expect(firstResult).toEqual(mockedData);
    expect(secondResult).toEqual(mockedData);
    expect(getURLMock).toHaveBeenCalledTimes(1); // The data should be cached
    expect(appendChildSpy).toHaveBeenCalled();
    const scriptEl = appendChildSpy.mock.calls[0][0];
    expect(scriptEl).toBeInstanceOf(HTMLScriptElement);
    expect((scriptEl as HTMLScriptElement).src).toBe("chrome://test_url");
  });

  it("should reject if data reception timeout", async () => {
    // exercise & verify
    await expect(getCybozuData()).rejects.toThrow(
      "Could not receive the Cybozu data within 1000 milliseconds",
    );
  });
});
