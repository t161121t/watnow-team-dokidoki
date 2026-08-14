export const supabaseTypeArguments = [
  "gen",
  "types",
  "--lang",
  "typescript",
  "--local",
  "--schema",
  "public",
];

export function createSupabaseTypeCommand(
  platform = process.platform,
  commandProcessor = process.env.ComSpec ?? process.env.COMSPEC,
) {
  if (platform === "win32") {
    return {
      command: commandProcessor ?? "cmd.exe",
      args: ["/d", "/s", "/c", "supabase.cmd", ...supabaseTypeArguments],
    };
  }

  return {
    command: "supabase",
    args: supabaseTypeArguments,
  };
}
