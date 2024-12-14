import { getCybozuData } from "@/apis/cybozu/getCybozuData.ts";

export async function getDisplayLocale(): Promise<string> {
  const cybozuData = await getCybozuData();
  return cybozuData.DISPLAY_LOCALE;
}
