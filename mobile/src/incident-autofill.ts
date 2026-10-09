import type { Draft } from "./domain";
import { extractionFields, type Suggestions } from "./extraction-domain";

export function autoFillIncidentFields(
  current: Draft,
  suggestions: Suggestions,
): Draft {
  const next = { ...current, extraction_review: undefined };
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
    for (const field of extractionFields) {
      const previous = current.extraction_auto?.values[field];
      if (
        previous !== undefined &&
        current[field] === previous &&
        !current.extraction_manual?.includes(field)
      )
        next[field] = "";
    }
    next.extraction_review = undefined;
    next.extraction_auto = undefined;
  }
  if (manual) {
    next.extraction_manual = [
      ...new Set([
        ...(current.extraction_manual || []),
        ...extractionFields.filter((field) => Object.hasOwn(patch, field)),
      ]),
    ];
  }
  return next;
}
