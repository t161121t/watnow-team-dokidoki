const localHostnames = new Set(["localhost", "0.0.0.0", "::1"]);

function isLocalHostname(hostname) {
  const normalizedHostname = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

  return (
    localHostnames.has(normalizedHostname) ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.startsWith("127.")
  );
}

export function getProductionEnvErrors(env, { requireValues = false } = {}) {
  const errors = [];
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl) {
    if (requireValues) {
      errors.push("VITE_SUPABASE_URL is required for deployment.");
    }
  } else {
    try {
      const hostname = new URL(supabaseUrl).hostname;

      if (isLocalHostname(hostname)) {
        errors.push("VITE_SUPABASE_URL must not point to a local host in a production build.");
      }
    } catch {
      errors.push("VITE_SUPABASE_URL must be a valid URL.");
    }
  }

  if (requireValues && !publishableKey) {
    errors.push("VITE_SUPABASE_PUBLISHABLE_KEY is required for deployment.");
  }

  if (publishableKey?.startsWith("sb_secret_")) {
    errors.push("VITE_SUPABASE_PUBLISHABLE_KEY must not contain a secret key.");
  }

  return errors;
}
