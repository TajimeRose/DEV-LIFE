export type TimelineView = "loading" | "error" | "empty" | "timeline";

export function timelineViewState(loading: boolean, error: string, eventCount: number): TimelineView {
  if (loading) return "loading";
  if (error) return "error";
  return eventCount > 0 ? "timeline" : "empty";
}
