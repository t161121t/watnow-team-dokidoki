import { spawnSync } from "node:child_process";
import { createSupabaseCommand, createSupabaseEnvironment } from "./supabase-command.mjs";

const commandArgs = process.argv.slice(2);

if (commandArgs.length === 0) {
  console.error("A Supabase CLI command is required");
  process.exitCode = 1;
} else {
  const { command, args } = createSupabaseCommand(commandArgs);
  const result = spawnSync(command, args, {
    env: createSupabaseEnvironment(),
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
