import { createSupabaseCommand } from "./supabase-command.mjs";

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
  return createSupabaseCommand(supabaseTypeArguments, platform, commandProcessor);
}
