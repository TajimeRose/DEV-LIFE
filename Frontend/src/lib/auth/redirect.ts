const ALLOWED_AUTH_REDIRECTS = new Set([
  "/dashboard",
  "/projects",
  "/settings/integrations",
]);

export function safeAuthRedirect(value: string | null | undefined, fallback = "/projects") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes(":")) return fallback;
  return ALLOWED_AUTH_REDIRECTS.has(value) ? value : fallback;
}
