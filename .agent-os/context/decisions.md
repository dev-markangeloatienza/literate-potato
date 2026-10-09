# Decisions

2026-10-10 — Android-first native Expo build targeting user's Samsung A55. Native inference needs a custom build rather than Expo Go or a browser fallback. No existing app code was present to reuse.

2026-10-10 — Use Whisper tiny.en unquantized GGML, whisper.rn 0.7.4, CPU explicitly. Download 77.7 MB once with fixed repository revision and SHA-256. Device accuracy/performance remains a measurement gate; no NPU speed claim. Optional LLM extraction/generation remains deferred as allowed by PRD priority.

2026-10-10 — Record mono 16 kHz PCM WAV with a small Android Expo module rather than compressed Expo audio capture. Native Whisper file ingestion expects WAV/PCM; direct recording enables faithful local retry without cloud speech or a separate decoder. Expo audio supplies permission handling. Consequence: iOS capture needs a corresponding native implementation before claiming secondary-platform support.

2026-10-10 — Preserve report and draft ownership separately in SQLite. New report draft and per-report edit drafts cannot clear/overwrite one another. Cold-start orphan collection only touches designated app-owned media directories and retains all saved reports/draft assets.

2026-10-10 — Include a labeled bundled JFK speech-check WAV from whisper.cpp samples for real runtime verification. It is test content, never seeded as a report or substituted for live microphone inference. Metrics distinguish bundled check from recording.

2026-10-10 — Move full model-file SHA-256 verification from pure JavaScript to streaming native MessageDigest, preserving the fixed hash check before each run. Same 11-second offline A55 sample improved from 35.6 seconds total to 1.1 seconds including verification/load/inference. One device/sample result; no cloud comparison or broad accent/accuracy claim.

2026-10-10 — Root navigation declares index as the initial route for deep links; Local AI also provides an explicit Back to reports action. A cold setup deep link otherwise left the user without a Home/back stack.

2026-10-10 ? User authorized disaster-response pivot and switchable models. Keep existing Android storage/capture architecture and optional JSON fields for backwards compatibility. Offer multilingual tiny/base alongside the English artifact, fixed hashes checked against Hugging Face revision metadata. Default to multilingual tiny; explicit download and language setting, no translation or cloud fallback. Preserve original transcript; incident priority is responder-entered, not AI-assigned. Native LLM/vision/sync are later slices rather than claims about this build.
