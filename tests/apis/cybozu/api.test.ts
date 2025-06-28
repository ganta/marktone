import { beforeEach, describe } from "vitest";
import {
  clearCybozuData,
  getDisplayLocale,
  getLoginUser,
  getRequestToken,
  initializeCybozuData,
  setCybozuData,
} from "@/apis/cybozu/api.ts";
import {
  CybozuDataInitializationTimeoutError,
  UninitializedCybozuDataError,
} from "@/apis/cybozu/errors.ts";

describe(initializeCybozuData, () => {
  const getURLMock = vi.fn();

  beforeEach(() => {
    // Assign the mock to the global object
    Object.assign(globalThis, {
      chrome: { runtime: { getURL: getURLMock } },
    });

    clearCybozuData();
  });

  it("should resolve with data when CustomEvent is dispatched", async () => {
    // setup
    const mockedData = {
      DISPLAY_LOCALE: "ja",
      LOGIN_USER: { code: "test_user" },
      REQUEST_TOKEN: "test_token",
    };
    const event = new CustomEvent("cybozuDataPass", {
      detail: JSON.stringify(mockedData),
    });

    getURLMock.mockImplementation(() => {
      document.dispatchEvent(event);
      return "chrome://test_url";
    });
    const appendChildSpy = vi.spyOn(document.body, "appendChild");

    // exercise
    const actualCybozuData = await initializeCybozuData();

    // verify
    expect(actualCybozuData).toEqual(mockedData);
    expect(getURLMock).toHaveBeenCalledTimes(1); // The data should be cached
    expect(appendChildSpy).toHaveBeenCalled();
    const scriptEl = appendChildSpy.mock.calls[0][0];
    expect(scriptEl).toBeInstanceOf(HTMLScriptElement);
    expect((scriptEl as HTMLScriptElement).src).toBe("chrome://test_url");
  });

  it("should reject if data reception timeout", async () => {
    // exercise & verify
    await expect(initializeCybozuData()).rejects.toThrow(
      new CybozuDataInitializationTimeoutError(1000),
    );
  });
});

describe(getLoginUser, () => {
  beforeEach(() => {
    clearCybozuData();
  });

  it("should return the login user", async () => {
    // setup
    const loginUser = { code: "test_user" };
    const cybozuData = {
      DISPLAY_LOCALE: "ja",
      LOGIN_USER: loginUser,
      REQUEST_TOKEN: "test_token",
    };
    setCybozuData(cybozuData);

    // exercise & verify
    expect(getLoginUser()).toEqual(loginUser);
  });

  it("should throw an error if the data is not initialized", () => {
    // exercise & verify
    expect(() => getLoginUser()).toThrowError(UninitializedCybozuDataError);
  });
});

describe(getRequestToken, () => {
  beforeEach(() => {
    clearCybozuData();
  });

  it("should return the request token", async () => {
    // setup
    const requestToken = "test_token";
    const cybozuData = {
      DISPLAY_LOCALE: "ja",
      LOGIN_USER: { code: "test_user" },
      REQUEST_TOKEN: requestToken,
    };
    setCybozuData(cybozuData);

    // exercise & verify
    expect(getRequestToken()).toEqual(requestToken);
  });

  it("should throw an error if the data is not initialized", () => {
    // exercise & verify
    expect(() => getRequestToken()).toThrowError(UninitializedCybozuDataError);
  });
});

describe(getDisplayLocale, () => {
  beforeEach(() => {
    clearCybozuData();
  });

  it("should return the display locale", async () => {
    // setup
    const displayLocale = "ja";
    const cybozuData = {
      DISPLAY_LOCALE: displayLocale,
      LOGIN_USER: { code: "test_user" },
      REQUEST_TOKEN: "test_token",
    };
    setCybozuData(cybozuData);

    // exercise & verify
    expect(getDisplayLocale()).toEqual(displayLocale);
  });

  it("should throw an error if the data is not initialized", () => {
    // exercise & verify
    expect(() => getDisplayLocale()).toThrowError(UninitializedCybozuDataError);
  });
});
