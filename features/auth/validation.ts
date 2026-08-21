import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ error: "メールアドレスの形式で入力してください" }),
  password: z
    .string()
    .min(8, { error: "パスワードは8文字以上で入力してください" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
