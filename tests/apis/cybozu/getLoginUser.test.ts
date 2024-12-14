import { getCybozuData } from "@/apis/cybozu/getCybozuData.ts";
import { getLoginUser } from "@/apis/cybozu/getLoginUser.ts";

vi.mock("@/apis/cybozu/getCybozuData.ts");

describe(getLoginUser, () => {
  it("should return the login user", async () => {
    // setup
    const loginUser = { code: "test_user" };
    const cybozuData = {
      DISPLAY_LOCALE: "ja",
      LOGIN_USER: loginUser,
      REQUEST_TOKEN: "test_token",
    };
    vi.mocked(getCybozuData).mockResolvedValue(cybozuData);

    // exercise & verify
    await expect(getLoginUser()).resolves.toEqual(loginUser);
  });
});
