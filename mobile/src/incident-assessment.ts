import type { Report } from "./domain";

// Assess only explicit positive clauses; unknown details retain neutral defaults.
export function assessIncident(note: string) {
  const clauses = note
    .split(/[.!?;]|\bbut\b|\bpero\b/iu)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s &&
        !/\b(no|not|never|without|hindi|wala|walang|resolved|no longer|drill|exercise|possible|possibly|maybe|suspected)\b/iu.test(
          s.replace(/\bnot breathing\b/giu, "unconscious"),
        ),
    );
  const positive = clauses
    .join(". ")
    .replace(/\bnon[- ]urgent\b/giu, "routine");
  const types: [NonNullable<Report["incident_type"]>, RegExp][] = [
    ["Earthquake", /\b(earthquake|lindol)\b/iu],
    ["Landslide", /\b(landslide|pagguho ng lupa)\b/iu],
    ["Flooding", /\b(flood(?:ing|water|ed)?|baha|pagbaha)\b/iu],
    [
      "Damaged building",
      /\b((?:damaged|collapsed|unsafe) building|gumuhong gusali)\b/iu,
    ],
    ["Blocked road", /\b(blocked road|road blocked|baradong kalsada)\b/iu],
  ];
  const matched = types.filter(([, pattern]) => pattern.test(positive));
  const hazards = clauses.flatMap((clause) =>
    matched.flatMap(([, pattern]) => {
      const match = clause.match(pattern);
      return match ? [match[0]] : [];
    }),
  );
  let priority: NonNullable<Report["priority"]> = "Unassessed";
  if (
    /\b(immediate|life threatening|trapped|unconscious|severe bleeding|not breathing|nakulong)\b/iu.test(
      positive,
    )
  )
    priority = "Immediate";
  else if (
    /\b(urgent|urgently|injured|rising floodwater|evacuat(?:e|ed|ion)|rescue|nasugatan)\b/iu.test(
      positive,
    ) ||
    (hazards.length > 0 &&
      /\b(affected|displaced|apektado|needs?|kailangan)\b/iu.test(positive))
  )
    priority = "Urgent";
  else if (/\b(routine|non[- ]urgent)\b/iu.test(positive)) priority = "Routine";
  return {
    incident_type: matched[0]?.[0] || "Unspecified",
    priority,
    hazards: [...new Set(hazards)],
  };
}
