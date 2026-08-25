import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Verify GitHub webhook HMAC SHA256 signature
 */
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return true; // allow testing without secret if not configured
  try {
    const hmac = crypto.createHmac("sha256", secret);
    const digest = `sha256=${hmac.update(payload).digest("hex")}`;
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const event = request.headers.get("x-github-event") || "unknown";
    const deliveryId = request.headers.get("x-github-delivery") || crypto.randomUUID();
    const signature = request.headers.get("x-hub-signature-256");
    const secret = process.env.GITHUB_WEBHOOK_SECRET || "";

    if (secret && !verifySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const repoGithubId = payload.repository?.id ? Number(payload.repository.id) : null;

    const supabase = await createClient();

    // 1. หา repository ในระบบที่ตรงกับ github repo id
    let repositoryId: string | null = null;
    let projectId: string | null = null;

    if (repoGithubId) {
      const { data: repo } = await supabase
        .from("project_repositories")
        .select("id, project_id")
        .eq("github_repository_id", repoGithubId)
        .maybeSingle();

      if (repo) {
        repositoryId = repo.id;
        projectId = repo.project_id;
      }
    }

    // 2. บันทึก Webhook delivery record
    const { error: logError } = await supabase
      .from("github_webhook_deliveries")
      .insert({
        id: crypto.randomUUID(),
        delivery_id: deliveryId,
        github_event: event,
        repository_github_id: repoGithubId,
        repository_id: repositoryId,
        received_at: new Date().toISOString(),
        status: "received",
      });

    if (logError) {
      console.error("Failed to log webhook delivery:", logError);
    }

    // 3. จัดการ Event สำคัญ (push, pull_request, etc.)
    if (projectId && repositoryId) {
      const occurredAt = new Date().toISOString();

      if (event === "push") {
        const commits = payload.commits || [];
        const branchName = payload.ref ? payload.ref.replace("refs/heads/", "") : "unknown";

        for (const c of commits) {
          await supabase.from("project_activity_logs").insert({
            id: crypto.randomUUID(),
            project_id: projectId,
            repository_id: repositoryId,
            action_type: "commit_pushed",
            title: `Commit pushed: ${c.message?.split("\n")[0] || ""}`,
            description: c.message || null,
            commit_sha: c.id,
            actor_github_login: c.author?.username || payload.sender?.login,
            occurred_at: c.timestamp || occurredAt,
          });
        }
      } else if (event === "pull_request") {
        const pr = payload.pull_request;
        const action = payload.action;

        if (pr) {
          await supabase.from("project_activity_logs").insert({
            id: crypto.randomUUID(),
            project_id: projectId,
            repository_id: repositoryId,
            action_type: `pull_request_${action}`,
            title: `PR #${pr.number} ${action}: ${pr.title}`,
            description: pr.body || null,
            pull_request_number: pr.number,
            actor_github_login: pr.user?.login || payload.sender?.login,
            occurred_at: pr.updated_at || occurredAt,
          });
        }
      }

      // อัปเดตสถานะ webhook delivery เป็น processed
      await supabase
        .from("github_webhook_deliveries")
        .update({
          status: "processed",
          processed_at: new Date().toISOString(),
        })
        .eq("delivery_id", deliveryId);
    }

    return NextResponse.json({ success: true, event, deliveryId });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook handling failed" },
      { status: 500 }
    );
  }
}
