export const statuses = ["Open", "In Progress", "Resolved"] as const;
export type Status = (typeof statuses)[number];
export type Report = {
  id: string;
  location: string;
  note: string;
  issue: string;
  follow_up: string;
  photo?: string;
  thumbnail?: string;
  status: Status;
  transcription_source: "typed" | "voice" | "voice_edited";
  created_at: string;
  updated_at: string;
};
export type Draft = Report & { audio?: string };
export type SummaryItem = {
  id: string;
  section: "issues_by_location" | "work_list";
  text: string;
  location: string;
  source_report_ids: string[];
};
export type Summary = {
  id: string;
  created_at: string;
  source_report_ids: string[];
  items: SummaryItem[];
  generation_status: "success";
  generation_mode: "compiled";
};
export function validateReport(r: Report) {
  if (!r.location.trim()) throw new Error("Add a location before saving.");
  if (!r.note.trim() && !r.photo)
    throw new Error("Add a photo or an observation before saving.");
  if (!statuses.includes(r.status)) throw new Error("Choose a valid status.");
  if (
    r.note.length > 20000 ||
    r.location.length > 200 ||
    r.issue.length > 5000 ||
    r.follow_up.length > 5000
  )
    throw new Error("This report is too long. Shorten the text before saving.");
}
export function compile(reports: Report[], id: string, now: string): Summary {
  if (!reports.length) throw new Error("Select at least one report.");
  if (new Set(reports.map((r) => r.id)).size !== reports.length)
    throw new Error("Duplicate sources.");
  return {
    id,
    created_at: now,
    source_report_ids: reports.map((r) => r.id),
    generation_status: "success",
    generation_mode: "compiled",
    items: reports.flatMap((r, i) => [
      {
        id: `${i}-observation`,
        section: "issues_by_location" as const,
        text: `[${r.status}] ${r.issue.trim() ? r.issue : r.note.trim() ? r.note : "Photo evidence — open source report to view."}`,
        location: r.location,
        source_report_ids: [r.id],
      },
      ...(r.follow_up.trim()
        ? [
            {
              id: `${i}-followup`,
              section: "work_list" as const,
              text: `[${r.status}] ${r.follow_up}`,
              location: r.location,
              source_report_ids: [r.id],
            },
          ]
        : []),
    ]),
  };
}
export function summaryText(s: Summary) {
  return (
    `FieldBrief · Compiled handover\n${s.created_at}\n\n` +
    s.items
      .map(
        (i) =>
          `${i.section === "work_list" ? "Recorded follow-up" : "Observation"} · ${i.location}\n${i.text}\nSource: ${i.source_report_ids.join(", ")}`,
      )
      .join("\n\n")
  );
}
