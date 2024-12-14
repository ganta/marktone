import { z } from "zod";

export const LoginUserSchema = z.object({
  code: z.string(),
});
export type LoginUser = z.infer<typeof LoginUserSchema>;
