import assert from "node:assert/strict";
import test from "node:test";
import type { Tables } from "@/lib/database.types";
import { loadPullRequestDetail } from "./pull-request-detail.ts";

test("Pull Request details load reviews using pull_request_id", async () => {
  const requestedIds: string[] = [];
  const detail = await loadPullRequestDetail("pr-id", {
    findPullRequest: async id => {
      requestedIds.push(`pull-request:${id}`);
      return { id } as Tables<"repository_pull_requests">;
    },
    listReviews: async id => {
      requestedIds.push(`reviews:${id}`);
      return [{ id: "review-id", pull_request_id: id }] as Tables<"repository_pull_request_reviews">[];
    },
  });
  assert.deepEqual(requestedIds.sort(), ["pull-request:pr-id", "reviews:pr-id"]);
  assert.equal(detail?.reviews[0].pull_request_id, "pr-id");
  assert.deepEqual(detail?.relatedCommits, []);
  assert.equal(detail?.diff.available, false);
});
