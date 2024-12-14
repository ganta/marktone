import { getCybozuData } from "@/apis/cybozu/getCybozuData.ts";
import { getDisplayLocale } from "@/apis/cybozu/getDisplayLocale.ts";

vi.mock("@/apis/cybozu/getCybozuData.ts");

describe(getDisplayLocale, () => {
  it("should return the display locale", async () => {
    // setup
    const cybozuData = {
      DISPLAY_LOCALE: "ja",
      LOGIN_USER: { code: "test_user" },
      REQUEST_TOKEN: "test_token",
    };
    vi.mocked(getCybozuData).mockResolvedValue(cybozuData);

    // exercise & verify
    await expect(getDisplayLocale()).resolves.toBe("ja");
  });
});
