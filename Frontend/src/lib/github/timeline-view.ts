import { sortTimelineEvents, type TimelineEvent } from "./timeline.ts";

export type TimelineView = "loading" | "error" | "empty" | "timeline";

export function timelineViewState(loading: boolean, error: string, eventCount: number): TimelineView {
  if (loading) return "loading";
  if (error) return "error";
  return eventCount > 0 ? "timeline" : "empty";
}

export type TimelineDateGroup = {
  key: string;
  label: string;
  events: TimelineEvent[];
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function groupTimelineEventsByDate(
  events: TimelineEvent[],
  locale = "th-TH",
): TimelineDateGroup[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const groups = new Map<string, TimelineDateGroup>();

  for (const event of sortTimelineEvents(events)) {
    const date = new Date(event.occurredAt);
    const key = localDateKey(date);
    const current = groups.get(key);
    if (current) {
      current.events.push(event);
    } else {
      groups.set(key, { key, label: formatter.format(date), events: [event] });
    }
  }

  return [...groups.values()];
}
