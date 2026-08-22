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

export const signupSchema = loginSchema.extend({
  nickname: z
    .string()
    .trim()
    .min(1, { error: "ニックネームを入力してください" })
    .max(20, { error: "ニックネームは20文字以内で入力してください" }),
});

export type SignupInput = z.infer<typeof signupSchema>;
