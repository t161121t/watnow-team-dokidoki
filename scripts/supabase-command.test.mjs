// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  createSupabaseCommand,
  createSupabaseEnvironment,
  defaultSupabaseImageRegistry,
} from "./supabase-command.mjs";

describe("createSupabaseCommand", () => {
  it("runs the Supabase executable directly outside Windows", () => {
    expect(createSupabaseCommand(["start"], "darwin")).toEqual({
      command: "supabase",
      args: ["start"],
    });
  });

  it("runs supabase.cmd through the Windows command processor", () => {
    expect(createSupabaseCommand(["start"], "win32", "C:\\Windows\\System32\\cmd.exe")).toEqual({
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "supabase.cmd", "start"],
    });
  });
});

describe("createSupabaseEnvironment", () => {
  it("uses GHCR when no registry is configured", () => {
    expect(createSupabaseEnvironment({ PATH: "/usr/bin" })).toEqual({
      PATH: "/usr/bin",
      SUPABASE_INTERNAL_IMAGE_REGISTRY: defaultSupabaseImageRegistry,
    });
  });

  it("preserves an explicitly configured registry", () => {
    expect(
      createSupabaseEnvironment({ SUPABASE_INTERNAL_IMAGE_REGISTRY: "mirror.example.com" }),
    ).toEqual({
      SUPABASE_INTERNAL_IMAGE_REGISTRY: "mirror.example.com",
    });
  });
});
