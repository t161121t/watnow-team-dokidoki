export const defaultSupabaseImageRegistry = "ghcr.io";

export function createSupabaseCommand(
  args,
  platform = process.platform,
  commandProcessor = process.env.ComSpec ?? process.env.COMSPEC,
) {
  if (platform === "win32") {
    return {
      command: commandProcessor ?? "cmd.exe",
      args: ["/d", "/s", "/c", "supabase.cmd", ...args],
    };
  }

  return {
    command: "supabase",
    args,
  };
}

export function createSupabaseEnvironment(environment = process.env) {
  const configuredRegistry = environment.SUPABASE_INTERNAL_IMAGE_REGISTRY?.trim();

  return {
    ...environment,
    SUPABASE_INTERNAL_IMAGE_REGISTRY: configuredRegistry || defaultSupabaseImageRegistry,
  };
}
