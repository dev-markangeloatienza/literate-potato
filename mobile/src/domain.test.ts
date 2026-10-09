import { describe, it, expect } from "vitest";
import { compile, Report, summaryText, validateReport } from "./domain";
const report: Report = {
  id: "a",
  location: "Level 2",
  note: "Leak has been repaired.",
  issue: "",
  follow_up: "Inspect seal tomorrow.",
  status: "Resolved",
  transcription_source: "typed",
  created_at: "2026-10-10",
  updated_at: "2026-10-10",
};
describe("offline reports", () => {
  it("preserves incident facts and coordinates in immutable handovers", () => {
    const r: Report = {
      ...report,
      incident_type: "Flooding",
      priority: "Urgent",
      affected_people: "12 families",
      hazards: "Live wires",
      needs: "Drinking water",
      coordinates: {
        latitude: 14.6,
        longitude: 121,
        accuracy: 8,
        captured_at: "2026-10-10T01:00:00Z",
      },
    };
    const s = compile([r], "s", "now");
    r.needs = "Changed";
    r.coordinates!.latitude = 15;
    const text = summaryText(s);
    expect(text).toContain("Responder priority: Urgent");
    expect(text).toContain("Affected people: 12 families");
    expect(text).toContain("Observed hazards: Live wires");
    expect(text).toContain("GPS: 14.6, 121");
    expect(text).toContain("Requested resources: Drinking water");
    expect(s.items.every((item) => item.source_report_ids[0] === r.id)).toBe(
      true,
    );
  });
  it("rejects invalid incident enums, oversized fields and GPS data", () => {
    expect(() =>
      validateReport({ ...report, priority: "Critical" as Report["priority"] }),
    ).toThrow();
    expect(() =>
      validateReport({
        ...report,
        incident_type: "Unknown" as Report["incident_type"],
      }),
    ).toThrow();
    expect(() =>
      validateReport({ ...report, needs: "x".repeat(5001) }),
    ).toThrow();
    expect(() =>
      validateReport({
        ...report,
        coordinates: {
          latitude: 91,
          longitude: 121,
          accuracy: 5,
          captured_at: "now",
        },
      }),
    ).toThrow();
    expect(() =>
      validateReport({
        ...report,
        coordinates: {
          latitude: 14,
          longitude: 121,
          accuracy: null,
          captured_at: "2026-10-10T01:00:00Z",
        },
      }),
    ).not.toThrow();
  });
  it("ignores blank reviewed fields without rewriting the original observation", () => {
    const s = compile(
      [{ ...report, issue: "  ", follow_up: "  " }],
      "s",
      "now",
    );
    expect(s.items).toHaveLength(1);
    expect(s.items[0].text).toBe("[Resolved] Leak has been repaired.");
  });
  it("requires location and actual evidence", () => {
    expect(() => validateReport({ ...report, location: " " })).toThrow();
    expect(() => validateReport({ ...report, note: " " })).toThrow();
    expect(() =>
      validateReport({ ...report, note: "", photo: "file://evidence.jpg" }),
    ).not.toThrow();
  });
  it("does not invent follow-ups or change resolved status", () => {
    const s = compile([{ ...report, follow_up: "" }], "s", "now");
    expect(s.items).toHaveLength(1);
    expect(s.items[0].text).toBe("[Resolved] Leak has been repaired.");
  });
  it("preserves exact text and stable sources in a snapshot", () => {
    const r = { ...report };
    const s = compile([r], "s", "now");
    r.note = "Changed later";
    expect(s.items[0].text).toBe("[Resolved] Leak has been repaired.");
    expect(s.items[1].text).toBe("[Resolved] Inspect seal tomorrow.");
    expect(s.items.every((i) => i.source_report_ids[0] === "a")).toBe(true);
    expect(summaryText(s)).toContain("Source: a");
  });
  it("uses reviewed issue when present", () => {
    expect(
      compile([{ ...report, issue: "Reviewed issue" }], "s", "now").items[0]
        .text,
    ).toBe("[Resolved] Reviewed issue");
  });
  it("rejects empty selection and duplicate sources", () => {
    expect(() => compile([], "s", "now")).toThrow();
    expect(() => compile([report, report], "s", "now")).toThrow();
  });
  it("represents photo-only evidence honestly", () => {
    expect(
      compile([{ ...report, note: "", photo: "file://photo" }], "s", "now")
        .items[0].text,
    ).toContain("Photo evidence");
  });
});
