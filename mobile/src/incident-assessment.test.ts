import { expect, it } from "vitest";
import { assessIncident } from "./incident-assessment";
import { autoFillIncidentFields, editIncidentDraft } from "./incident-autofill";
import type { Draft } from "./domain";

it("assesses the current earthquake observation even when the model omits hazards", () => {
  const draft = {
    note: "Currently at the epicenter of the earthquake, 100 families are affected estimated and in need of water, food, clothing.",
  } as Draft;
  const result = autoFillIncidentFields(draft, {
    affected_people: ["100 families"],
    hazards: [],
    needs: ["water, food, clothing"],
  });
  expect(result).toMatchObject({
    incident_type: "Earthquake",
    priority: "Urgent",
    hazards: "earthquake",
  });
  const manual = editIncidentDraft(
    result,
    { incident_type: "Other", priority: "Routine" },
    true,
  );
  expect(
    autoFillIncidentFields(manual, {
      affected_people: [],
      hazards: [],
      needs: [],
    }),
  ).toMatchObject({ incident_type: "Other", priority: "Routine" });
  expect(editIncidentDraft(result, { note: "Details unknown" })).toMatchObject({
    incident_type: "Unspecified",
    priority: "Unassessed",
    hazards: "",
  });
});
it("avoids inventing hazards or urgency from requests and denied events", () => {
  for (const note of [
    "12 families need water.",
    "No earthquake here.",
    "Possible landslide.",
    "Earthquake drill.",
  ]) {
    expect(assessIncident(note)).toMatchObject({
      incident_type: "Unspecified",
      priority: "Unassessed",
      hazards: [],
    });
  }
  expect(assessIncident("People trapped after earthquake.")).toMatchObject({
    incident_type: "Earthquake",
    priority: "Immediate",
  });
  expect(assessIncident("Non-urgent assistance requested.").priority).toBe(
    "Routine",
  );
  expect(assessIncident("Patient not breathing.").priority).toBe("Immediate");
  expect(
    assessIncident("No flooding. Blocked road needs clearing."),
  ).toMatchObject({
    incident_type: "Blocked road",
    priority: "Urgent",
    hazards: ["Blocked road"],
  });
});
