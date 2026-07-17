import { z } from "zod";

const tokenPayload = z.object({
  userId: z.uuid(),
  token: z.string().min(1).max(1000),
  expiresAt: z.number().int().positive(),
});

export type GitHubTokenPayload = z.infer<typeof tokenPayload>;

function encryptionKey(keyHex: string) {
  if (!/^[a-fA-F0-9]{64}$/.test(keyHex)) {
    throw new Error("GitHub token encryption is not configured");
  }
  return crypto.subtle.importKey("raw", Buffer.from(keyHex, "hex"), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealGitHubToken(payload: GitHubTokenPayload, keyHex: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(keyHex);
  const plaintext = new TextEncoder().encode(JSON.stringify(tokenPayload.parse(payload)));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return `v1.${Buffer.from(iv).toString("base64url")}.${Buffer.from(encrypted).toString("base64url")}`;
}

export async function openGitHubToken(value: string, keyHex: string) {
  const [version, ivValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !encryptedValue) return null;
  try {
    const key = await encryptionKey(keyHex);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: Buffer.from(ivValue, "base64url") },
      key,
      Buffer.from(encryptedValue, "base64url"),
    );
    const payload = tokenPayload.parse(JSON.parse(new TextDecoder().decode(plaintext)) as unknown);
    return payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
