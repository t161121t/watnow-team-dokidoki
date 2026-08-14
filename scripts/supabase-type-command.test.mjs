import { describe, expect, it } from "vitest";
import { createSupabaseTypeCommand, supabaseTypeArguments } from "./supabase-type-command.mjs";

describe("createSupabaseTypeCommand", () => {
  it("runs the Supabase executable directly outside Windows", () => {
    expect(createSupabaseTypeCommand("darwin")).toEqual({
      command: "supabase",
      args: supabaseTypeArguments,
    });
  });

  it("runs supabase.cmd through the Windows command processor", () => {
    expect(createSupabaseTypeCommand("win32", "C:\\Windows\\System32\\cmd.exe")).toEqual({
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "supabase.cmd", ...supabaseTypeArguments],
    });
  });

  it("falls back to cmd.exe when ComSpec is unavailable", () => {
    expect(createSupabaseTypeCommand("win32", undefined).command).toBe("cmd.exe");
  });
});
