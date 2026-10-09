# Disaster field assistant: first implementation slice

Authorized 2026-10-10: adapt existing Android app and support model switching.

Capture photo/voice/text, enter barangay/landmark, record incident type, responder-assessed priority, affected people, observed hazards and requested resources. Unknown details remain blank or Unassessed. Existing report status remains separate from priority. All fields survive local save/recovery/edit/reopen and appear in exact source-linked incident handovers. No automatic structural safety judgement.

GPS is explicit foreground-only capture, with coordinates/accuracy/time, optional removal and manual location fallback. Watch is bounded to 20 seconds; no background location, reverse geocoding, online maps or report uploads. Exported handover includes coordinates only if the responder captured them.

Speech choices: Whisper tiny multilingual (~77.7 MB), base multilingual (~148 MB), and existing tiny.en English (~77.7 MB). Each has a separate file and fixed revision/size/SHA-256. Multilingual tiny is the default for a missing preference. Selecting a model does not download it, delete another model or invoke a fallback. Settings persist. Language options auto/tl/en; English-only model forces en while retaining multilingual preference. translate=false preserves transcription language. Bundled English check measures runtime only, not Taglish accuracy.

Acceptance: existing saved data remains accessible; incident fields round-trip; snapshot includes exact fields and source links; model switch selects correct verified file/options; corrupt or missing selected model fails visibly; cancellation/retry retains recording. Physical Taglish/noise accuracy and GPS permission/fix are rehearsal gates.

Subsequent work: native LLM extraction with review, vision photo tags with evaluation, persistent sync queue plus receiving backend/dashboard. These are not shipped in this slice. Airplane-mode demo requires downloading/preparing the desired model first.
