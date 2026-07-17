import { NextResponse } from "next/server";
import { safeAuthRedirect } from "@/lib/auth/redirect";
import { storeGitHubToken } from "@/lib/github/token-vault";
import { createClient } from "@/lib/supabase/server";

function redirectWithStatus(origin: string, path: string, status: string) {
  const target = new URL(path, origin);
  target.searchParams.set("github", status);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeAuthRedirect(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  if (!code) return redirectWithStatus(url.origin, next, "error");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return redirectWithStatus(url.origin, next, "error");

  const providerToken = data.session.provider_token;
  if (providerToken) {
    try {
      const { error: cleanSessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (cleanSessionError) throw cleanSessionError;
    } catch {
      await supabase.auth.signOut();
      return redirectWithStatus(url.origin, next, "error");
    }
    try {
      await storeGitHubToken(data.user.id, providerToken);
    } catch {
      return redirectWithStatus(url.origin, next, "configuration_required");
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
