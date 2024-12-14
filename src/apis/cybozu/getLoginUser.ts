import { getCybozuData } from "@/apis/cybozu/getCybozuData.ts";
import type { LoginUser } from "@/models/LoginUser.ts";

export async function getLoginUser(): Promise<LoginUser> {
  const cybozuData = await getCybozuData();
  return cybozuData.LOGIN_USER;
}
