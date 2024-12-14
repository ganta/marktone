import { getCybozuData } from "@/apis/cybozu/getCybozuData.ts";
import { getRequestToken } from "@/apis/cybozu/getRequestToken.ts";
import { expect } from "vitest";

vi.mock("@/apis/cybozu/getCybozuData.ts");

describe(getRequestToken, () => {
  it("should return the request token", async () => {
    // setup
    const cybozuData = {
      DISPLAY_LOCALE: "ja",
      LOGIN_USER: { code: "test_user" },
      REQUEST_TOKEN: "test_token",
    };
    vi.mocked(getCybozuData).mockResolvedValue(cybozuData);

    // exercise & verify
    await expect(getRequestToken()).resolves.toBe("test_token");
  });
});
