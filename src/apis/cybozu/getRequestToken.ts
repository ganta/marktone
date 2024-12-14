import { getCybozuData } from "@/apis/cybozu/getCybozuData.ts";

export async function getRequestToken(): Promise<string> {
  const cybozuData = await getCybozuData();
  return cybozuData.REQUEST_TOKEN;
}
