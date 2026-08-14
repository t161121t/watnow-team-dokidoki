// @vitest-environment node

import { describe, expect, it } from "vitest";
import { getProductionEnvErrors } from "./production-env.mjs";

describe("getProductionEnvErrors", () => {
  it.each(["http://localhost:54321", "http://127.0.0.1:54321", "http://[::1]:54321"])(
    "rejects a local Supabase URL in production: %s",
    (supabaseUrl) => {
      expect(
        getProductionEnvErrors({
          VITE_SUPABASE_URL: supabaseUrl,
          VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
        }),
      ).toContain("VITE_SUPABASE_URL must not point to a local host in a production build.");
    },
  );

  it("allows a hosted Supabase URL", () => {
    expect(
      getProductionEnvErrors({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      }),
    ).toEqual([]);
  });

  it("requires both client values before deployment", () => {
    expect(getProductionEnvErrors({}, { requireValues: true })).toEqual([
      "VITE_SUPABASE_URL is required for deployment.",
      "VITE_SUPABASE_PUBLISHABLE_KEY is required for deployment.",
    ]);
  });

  it("rejects a secret key in client configuration", () => {
    expect(
      getProductionEnvErrors({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test",
      }),
    ).toContain("VITE_SUPABASE_PUBLISHABLE_KEY must not contain a secret key.");
  });
});
