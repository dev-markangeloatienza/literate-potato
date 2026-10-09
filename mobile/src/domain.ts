export const statuses = ["Open", "In Progress", "Resolved"] as const;
export type Status = (typeof statuses)[number];
export const incidentTypes = [
  "Unspecified",
  "Flooding",
  "Damaged building",
  "Blocked road",
  "Landslide",
  "Other",
] as const;
export const priorities = [
  "Unassessed",
  "Routine",
  "Urgent",
  "Immediate",
] as const;
export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  captured_at: string;
};
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
  incident_type?: (typeof incidentTypes)[number];
  priority?: (typeof priorities)[number];
  affected_people?: string;
  hazards?: string;
  needs?: string;
  coordinates?: Coordinates;
};
export type Draft = Report & {
  audio?: string;
  extraction_review?: import("./extraction-domain").ExtractionReview;
};
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
  if (r.incident_type !== undefined && !incidentTypes.includes(r.incident_type))
    throw new Error("Choose a valid incident type.");
  if (r.priority !== undefined && !priorities.includes(r.priority))
    throw new Error("Choose a valid priority.");
  if (
    [r.affected_people, r.hazards, r.needs].some(
      (v) => v !== undefined && (typeof v !== "string" || v.length > 5000),
    )
  )
    throw new Error(
      "Incident fields must be text of at most 5,000 characters.",
    );
  if (r.coordinates) {
    const c = r.coordinates;
    if (
      !Number.isFinite(c.latitude) ||
      Math.abs(c.latitude) > 90 ||
      !Number.isFinite(c.longitude) ||
      Math.abs(c.longitude) > 180 ||
      (c.accuracy !== null &&
        (!Number.isFinite(c.accuracy) || c.accuracy < 0)) ||
      !Number.isFinite(Date.parse(c.captured_at))
    )
      throw new Error("Invalid GPS location. Capture it again or remove it.");
  }
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
      ...(r.incident_type ||
      r.priority ||
      r.affected_people?.trim() ||
      r.hazards?.trim() ||
      r.coordinates
        ? [
            {
              id: `${i}-incident`,
              section: "issues_by_location" as const,
              text: [
                r.incident_type && `Incident: ${r.incident_type}`,
                r.priority && `Responder priority: ${r.priority}`,
                r.affected_people?.trim() &&
                  `Affected people: ${r.affected_people}`,
                r.hazards?.trim() && `Observed hazards: ${r.hazards}`,
                r.coordinates &&
                  `GPS: ${r.coordinates.latitude}, ${r.coordinates.longitude} · Accuracy: ${r.coordinates.accuracy === null ? "unknown" : `${r.coordinates.accuracy} m`} · Captured: ${r.coordinates.captured_at}`,
              ]
                .filter(Boolean)
                .join("\n"),
              location: r.location,
              source_report_ids: [r.id],
            },
          ]
        : []),
      ...(r.needs?.trim()
        ? [
            {
              id: `${i}-needs`,
              section: "work_list" as const,
              text: `Requested resources: ${r.needs}`,
              location: r.location,
              source_report_ids: [r.id],
            },
          ]
        : []),
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
    `FieldBrief · Compiled incident handover\n${s.created_at}\n\n` +
    s.items
      .map(
        (i) =>
          `${i.section === "work_list" ? "Needs / recorded follow-up" : "Incident observation"} · ${i.location}\n${i.text}\nSource: ${i.source_report_ids.join(", ")}`,
      )
      .join("\n\n")
  );
}
