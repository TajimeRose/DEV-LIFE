import { githubPrivateReposEnabled } from "@/lib/github/config";
import { listGitHubRepositories } from "@/lib/github/client";
import { githubRateLimiter } from "@/lib/github/rate-limit";
import { handleRepositoriesRequest } from "@/lib/github/repositories-handler";
import { readGitHubToken } from "@/lib/github/token-vault";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRepositoriesRequest(request, {
    authenticate: async () => {
      const { data, error } = await (await createClient()).auth.getClaims();
      if (error || !data?.claims.sub) return null;
      const providers = data.claims.app_metadata?.providers;
      return {
        userId: data.claims.sub,
        githubIdentity: Array.isArray(providers) && providers.includes("github"),
      };
    },
    readToken: readGitHubToken,
    rateLimit: userId => githubRateLimiter.allow(userId),
    privateReposEnabled: githubPrivateReposEnabled(),
    listRepositories: listGitHubRepositories,
  });
}
