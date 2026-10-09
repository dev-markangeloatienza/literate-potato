import { describe, expect, it } from "vitest";
import type { Draft } from "./domain";
import { autoFillIncidentFields, editIncidentDraft } from "./incident-autofill";
const draft = {
  id: "draft",
  location: "Site",
  note: "12 families affected, need water.",
  issue: "",
  follow_up: "",
  status: "Open",
  transcription_source: "typed",
  created_at: "now",
  updated_at: "now",
} satisfies Draft;
const suggestions = {
  affected_people: ["12 families"],
  hazards: [],
  needs: ["water"],
};
describe("automatic incident fields", () => {
  it("fills fields directly without pending acceptance", () => {
    const result = autoFillIncidentFields(draft, suggestions);
    expect(result).toMatchObject({
      affected_people: "12 families",
      hazards: "",
      needs: "water",
      extraction_auto: { transcript: draft.note },
    });
    expect(result.extraction_review).toBeUndefined();
  });
  it("refreshes automatic values on retry, including clearing a previous hazard", () => {
    const first = autoFillIncidentFields(draft, {
      ...suggestions,
      hazards: ["floodwater"],
    });
    expect(
      autoFillIncidentFields(first, {
        ...suggestions,
        affected_people: ["15 families"],
      }),
    ).toMatchObject({ affected_people: "15 families", hazards: "" });
  });
  it("preserves existing entries and explicit manual edits including cleared fields", () => {
    expect(
      autoFillIncidentFields(
        { ...draft, needs: "Manual resource" },
        suggestions,
      ).needs,
    ).toBe("Manual resource");
    const first = autoFillIncidentFields(draft, suggestions);
    const edited = editIncidentDraft(first, { needs: "Medical team" }, true);
    expect(autoFillIncidentFields(edited, suggestions).needs).toBe(
      "Medical team",
    );
    const cleared = editIncidentDraft(first, { needs: "" }, true);
    expect(autoFillIncidentFields(cleared, suggestions).needs).toBe("");
  });
  it("invalidates automatic values on observation edits while preserving manual content", () => {
    const first = autoFillIncidentFields(draft, suggestions);
    const manual = editIncidentDraft(first, { needs: "Medical team" }, true);
    const changed = editIncidentDraft(manual, { note: "New observation" });
    expect(changed).toMatchObject({
      affected_people: "",
      needs: "Medical team",
    });
    expect(changed.extraction_auto).toBeUndefined();
  });
  it("converts recovered suggestions only into unprotected fields", () => {
    const review = { transcript: draft.note, suggestions };
    expect(
      autoFillIncidentFields(
        { ...draft, extraction_review: review, hazards: "Manual hazard" },
        review.suggestions,
      ),
    ).toMatchObject({
      affected_people: "12 families",
      needs: "water",
      hazards: "Manual hazard",
    });
  });
  it("retains manual ownership after draft JSON recovery", () => {
    const original = editIncidentDraft(
      autoFillIncidentFields(draft, suggestions),
      { affected_people: "11 families" },
      true,
    );
    const recovered = JSON.parse(JSON.stringify(original)) as Draft;
    expect(autoFillIncidentFields(recovered, suggestions).affected_people).toBe(
      "11 families",
    );
  });
});
