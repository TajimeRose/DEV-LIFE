import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { TimelineEvent } from "./timeline.ts";
import {
  groupTimelineEventsByDate,
  isVisibleRepositoryActivity,
  timelineViewState,
} from "./timeline-view.ts";

test("timeline loading, error, empty, and populated views are controlled", () => {
  assert.equal(timelineViewState(true, "", 0), "loading");
  assert.equal(timelineViewState(false, "failed", 0), "error");
  assert.equal(timelineViewState(false, "", 0), "empty");
  assert.equal(timelineViewState(false, "", 1), "timeline");
});

test("repository synchronization events stay out of the user-facing timeline", () => {
  const commit = event("commit", "2026-07-18T10:00:00+07:00");
  const syncTypes: TimelineEvent["type"][] = ["sync_started", "sync_succeeded", "sync_failed"];
  const syncEvents = syncTypes.map(type => ({
    ...event(type, "2026-07-18T11:00:00+07:00"),
    type,
  }));

  assert.deepEqual(
    [commit, ...syncEvents].filter(isVisibleRepositoryActivity).map(item => item.id),
    ["commit"],
  );
});

test("timeline mobile layout prevents horizontal page overflow", async () => {
  const css = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.timeline-event-body\s*\{/);
  assert.match(css, /\.repository-history-panel\s*\{[^}]*overflow:\s*hidden;/);
});

test("long modal content scrolls inside the dialog", async () => {
  const css = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.ui-modal\s*\{[^}]*max-height:[^;}]+;[^}]*display:\s*flex;/);
  assert.match(css, /\.ui-modal-body\s*\{[^}]*overflow-y:\s*auto;/);
  assert.match(css, /\.ui-modal-layer\s*\{[^}]*overscroll-behavior:\s*contain[;}]/);
});

function event(id: string, occurredAt: string): TimelineEvent {
  return {
    id,
    type: "commit_pushed",
    occurredAt,
    title: id,
    description: null,
    actor: null,
    status: "connected",
    pullRequestId: null,
    pullRequestNumber: null,
    sourceBranch: null,
    targetBranch: null,
    commitSha: id,
    commitShortSha: id,
    githubUrl: null,
    errorMessage: null,
    additions: 0,
    deletions: 0,
    filesChanged: 0,
  };
}

test("timeline events are grouped by date with newest events first", () => {
  const groups = groupTimelineEventsByDate([
    event("older", "2026-07-17T08:00:00+07:00"),
    event("newer", "2026-07-18T10:00:00+07:00"),
    event("newest", "2026-07-18T12:00:00+07:00"),
  ], "en-US");

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].events.map(item => item.id), ["newest", "newer"]);
  assert.deepEqual(groups[1].events.map(item => item.id), ["older"]);
});
