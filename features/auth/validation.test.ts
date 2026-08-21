import assert from "node:assert/strict";
import test from "node:test";

import { loginSchema } from "./validation";

test("loginSchema accepts a valid email and password", () => {
  const result = loginSchema.safeParse({
    email: "player@example.com",
    password: "secret123",
  });

  assert.equal(result.success, true);
});

test("loginSchema rejects an invalid email and a short password", () => {
  const result = loginSchema.safeParse({
    email: "not-an-email",
    password: "short",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.flatten().fieldErrors, {
      email: ["メールアドレスの形式で入力してください"],
      password: ["パスワードは8文字以上で入力してください"],
    });
  }
});
