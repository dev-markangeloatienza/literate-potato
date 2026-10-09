import type { Draft } from "./domain";
import { extractionFields, type Suggestions } from "./extraction-domain";
import { assessIncident } from "./incident-assessment";
const autoFields = [...extractionFields, "incident_type", "priority"] as const;
export type AutoField = (typeof autoFields)[number];

export function autoFillIncidentFields(
  current: Draft,
  suggestions: Suggestions,
): Draft {
  const next = { ...current, extraction_review: undefined };
  const assessment = assessIncident(current.note);
  const values: NonNullable<Draft["extraction_auto"]>["values"] = {};
  for (const field of extractionFields) {
    const previous = current.extraction_auto?.values[field];
    const untouchedAuto = previous !== undefined && current[field] === previous;
    if (
      current.extraction_manual?.includes(field) ||
      (current[field]?.trim() && !untouchedAuto)
    )
      continue;
    next[field] = suggestions[field].join("\n");
    values[field] = next[field];
  }
  for (const field of ["incident_type", "priority"] as const) {
    if (current.extraction_manual?.includes(field)) continue;
    if (field === "incident_type")
      next.incident_type = assessment.incident_type;
    else next.priority = assessment.priority;
    values[field] = assessment[field];
  }
  if (
    !current.extraction_manual?.includes("hazards") &&
    (!current.hazards?.trim() ||
      current.hazards === current.extraction_auto?.values.hazards)
  ) {
    next.hazards = [
      ...new Set([...suggestions.hazards, ...assessment.hazards]),
    ].join("\n");
    values.hazards = next.hazards;
  }
  next.extraction_auto = { transcript: current.note, values };
  return next;
}

export function editIncidentDraft(
  current: Draft,
  patch: Partial<Draft>,
  manual = false,
): Draft {
  const next = { ...current, ...patch };
  if (patch.note !== undefined && patch.note !== current.note) {
    for (const field of autoFields) {
      const previous = current.extraction_auto?.values[field];
      if (
        previous !== undefined &&
        current[field] === previous &&
        !current.extraction_manual?.includes(field)
      )
        if (field === "incident_type") next.incident_type = "Unspecified";
        else if (field === "priority") next.priority = "Unassessed";
        else next[field] = "";
    }
    next.extraction_review = undefined;
    next.extraction_auto = undefined;
  }
  if (manual) {
    next.extraction_manual = [
      ...new Set([
        ...(current.extraction_manual || []),
        ...autoFields.filter((field) => Object.hasOwn(patch, field)),
      ]),
    ];
  }
  return next;
}
