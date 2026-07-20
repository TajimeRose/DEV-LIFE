import { z } from "zod";

const paginationFields = {
  page: z.coerce.number().int().min(1).max(100).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

const search = z.string().trim().max(100).default("");
const date = z.iso.datetime({ offset: true });

const commitQuerySchema = z.object({
  ...paginationFields,
  search,
  author: z.string().trim().max(100).default(""),
  from: date.optional(),
  to: date.optional(),
}).strict().refine(value => !value.from || !value.to || Date.parse(value.from) <= Date.parse(value.to));

const pullRequestQuerySchema = z.object({
  ...paginationFields,
  search,
  state: z.enum(["all", "open", "closed", "merged"]).default("all"),
}).strict();

export type CommitListQuery = z.infer<typeof commitQuerySchema>;
export type PullRequestListQuery = z.infer<typeof pullRequestQuerySchema>;

function queryInput(url: URL) {
  return Object.fromEntries(url.searchParams);
}

export function parseCommitListQuery(url: URL) {
  return commitQuerySchema.safeParse(queryInput(url));
}

export function parsePullRequestListQuery(url: URL) {
  return pullRequestQuerySchema.safeParse(queryInput(url));
}

// PostgREST reserves punctuation in `or` expressions. Quote and escape every
// user-controlled pattern before combining filters.
export function postgrestContainsPattern(input: string) {
  const escaped = input.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&").replace(/"/g, '\\"');
  return `"%${escaped}%"`;
}

export function paginationData(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
}
