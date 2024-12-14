import { LoginUserSchema } from "@/models/LoginUser.ts";
import { z } from "zod";

export const CybozuDataSchema = z.object({
  DISPLAY_LOCALE: z.string(),
  LOGIN_USER: LoginUserSchema,
  REQUEST_TOKEN: z.string(),
});
export type CybozuData = z.infer<typeof CybozuDataSchema>;
