import "server-only";

import { cookies } from "next/headers";
import { openGitHubToken, sealGitHubToken } from "./token-crypto";

export const GITHUB_TOKEN_COOKIE = "devlife-github-session";
const TOKEN_LIFETIME_SECONDS = 60 * 60 * 8;

function tokenKey() {
  return process.env.GITHUB_TOKEN_ENCRYPTION_KEY ?? "";
}

export async function storeGitHubToken(userId: string, token: string) {
  const value = await sealGitHubToken({
    userId,
    token,
    expiresAt: Date.now() + TOKEN_LIFETIME_SECONDS * 1000,
  }, tokenKey());
  (await cookies()).set(GITHUB_TOKEN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_LIFETIME_SECONDS,
  });
}

export async function readGitHubToken(userId: string) {
  const store = await cookies();
  const value = store.get(GITHUB_TOKEN_COOKIE)?.value;
  if (!value) return null;
  const payload = await openGitHubToken(value, tokenKey());
  if (!payload || payload.userId !== userId) return null;
  return payload.token;
}

export async function clearGitHubToken() {
  (await cookies()).delete(GITHUB_TOKEN_COOKIE);
}
