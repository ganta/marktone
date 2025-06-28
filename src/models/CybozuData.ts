import { z } from "zod";
import { LoginUserSchema } from "@/models/LoginUser.ts";

export const CybozuDataSchema = z.object({
  DISPLAY_LOCALE: z.string(),
  LOGIN_USER: LoginUserSchema,
  REQUEST_TOKEN: z.string(),
});
export type CybozuData = z.infer<typeof CybozuDataSchema>;
