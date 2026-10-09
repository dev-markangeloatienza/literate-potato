# Product Requirements Document: FieldBrief Mobile

Revision: 2026-10-09. This document defines the planned native mobile rebuild. The existing web app is a working reference, not proof that native requirements are implemented or verified.

## 1. Product and Outcome

FieldBrief is an offline-first construction reporting app: take a site photo, record an observation, transcribe it on the phone, review an editable report, and save it locally. Workers can assemble a source-linked handover without connectivity. Local report extraction and optional generative briefing enrich the workflow without blocking capture.

Target user: a worker or supervisor on a small construction team in basements, rural sites or unfinished buildings with poor reception. MVP is single user, single device, no login.

Primary benefits: usable reports while disconnected, audio/photos/local inference inputs stay on-device, and local inference needs no per-call cloud API payment. Do not claim faster-than-cloud performance without a measured comparison.

Core design test: with cloud services unavailable and models prepared, the installed app still captures, transcribes, saves, edits, searches and reopens reports. Offline transcription must run now, not queue audio for later upload.

## 2. Hackathon Requirements and Evidence

Theme: **Local AI**. These are the supplied requirements; scoring weights have not been confirmed.

| Requirement | Product obligation | Submission evidence |
| --- | --- | --- |
| Substantially built during the hackathon | Record event dates, existing web baseline and work completed during the event; distinguish reused components | Dated development log, commits when a repository exists, and progress recordings |
| Meaningful AI inference runs locally | Actual speech-to-text runs on the user's phone; reviewed report extraction is the next priority | Physical-device airplane-mode demonstration, model/runtime identification and network verification |
| Working, demonstrable product | Complete capture-to-saved-report journey, including reopen after restart | Installable build, demo script, saved reports and permission/failure checks |
| Core AI does not depend entirely on cloud | Local transcription has no cloud fallback; report capture and compiled handover remain usable without servers | Cold app restart with prepared models and cloud/proxy unavailable |
| Disclose all models, APIs, frameworks and major tools | Maintain a submission disclosure reflecting what actually ships | Exact model artifacts, quantization, versions, licenses, downloads, optional cloud provider/model and development tools |
| Explain why local is better | Show offline availability and privacy; explain lack of cloud per-call charges | Disconnect before capture; demonstrate that audio/photos and local inference inputs are not uploaded |

Photo capture and deterministic compiled briefing are useful features, but are **not AI inference**. Do not present them as satisfying the Local AI requirement alone.

## 3. What the Web Version Teaches Us

Existing reference: React/TypeScript/Vite PWA, IndexedDB, local photo storage, editable voice/typed notes, status/search/history, reviewed issue/follow_up fields, source-linked handover snapshots, cancellation, optional consented cloud handover and seed reports. Whisper tiny.en q8 runs through Transformers.js/WASM. Qwen3 0.6B q8 runs through browser WebGPU or WASM, with approximately 620 MB of model assets.

| Observed web issue or strength | Mobile requirement/improvement |
| --- | --- |
| User observed 109 generated tokens in roughly two minutes | Benchmark real phone inference before committing to a model or promising demo speed |
| Final automated cold-worker one-report briefing took 24.2 seconds | Treat as one web scenario, not a phone benchmark or a before/after comparison; test first/repeat runs and multiple reports |
| Model can repeat notes, copy factual prompt examples, omit fields or return malformed structures | Use format examples without unrelated factual content, strict source validation, content-based evaluation and mandatory review |
| Long UUIDs, repeated metadata and duplicate notes waste model work | Use short source references, restore IDs/locations in application code, prefer reviewed fields, bound input/output |
| Slow/stalled generation needs progress, cancellation and timeout | Keep UI responsive; show backend and elapsed progress; cancellation releases native resources; retain input for retry |
| Browser cache/storage writes needed OPFS and a large test quota | Use native model files with version/hash validation and storage checks; do not copy browser cache implementation |
| Instant compiled briefing is useful immediately | Keep it as the default immediate handover, distinctly labeled as compiled rather than AI-generated |
| Original notes and reviewed fields stay separate | Preserve the transcript/note; suggestions are drafts, applied only after review |
| Source links and immutable saved snapshots work offline | Reuse these domain rules and deleted-source behavior |
| Phone camera/microphone and real site accents remain unverified | Test physical capture and recording early; include interruptions, permissions, noise and vocabulary |

Web build/typecheck/lint, 12 unit tests and three targeted browser tests passed during the latest optimization. Real Qwen extraction/briefing ran after offline worker restarts with zero remote requests. These checks do not establish native behavior or broad model accuracy.

## 4. Scope and Build Priorities

### P0: Required demonstrable mobile core

- Installable native app on one named presentation device/platform.
- Fast camera capture or gallery selection; one local photo per report.
- Clear tap-to-start/tap-to-stop recording, timer and 60-second maximum.
- Real on-device English transcription with editable results, retry and typing fallback.
- Offline report save/open/edit/delete/search/status filter.
- Local model preparation and readiness verification; offline cold restart.
- Instant compiled handover from selected reports, saved with source links.
- Permission, storage, interruption and failure states.
- Model/tool disclosure and event-period development evidence.

### P1: Next priority after P0 works on the phone

- Local extraction of location, issue, recorded follow-up and explicitly evidenced status.
- Review/edit/apply suggestions; original note preserved.
- Separate editable issue and follow_up fields even when extraction is unavailable.
- Benchmark and evaluate a compact native LLM before expanding its use.

### P2: Add only after device performance and quality gates pass

- Source-linked local generative briefing for up to eight reports/6,000 text characters.
- Optional consent-based cloud handover through the existing stateless proxy.
- Secondary platform/device support.

If the LLM is too slow or inaccurate, retain local speech inference and compiled handover; do not replace local inference with a silent cloud call. Defer generative briefing before sacrificing the capture workflow.

### Non-goals

Accounts, team sync, cloud report backup, background uploads, multiple photos, GPS/maps/floor plans, assignments/deadlines, push notifications, PDF/Excel export, multilingual transcription, analytics/billing and automatic defect detection are deferred. Photos are visual evidence only; the speech/text models do not interpret them. Vision inference requires a separate model and evaluation, outside this rebuild MVP.

## 5. Core Mobile Workflows

### Capture and save

1. Open the installed app offline and tap New report.
2. Capture a photo or choose one from the gallery; preview, retake or remove it.
3. Enter/select a recent location, or fill it after transcription.
4. Tap Record; show active recording, elapsed time and a large Stop control.
5. Stop and run speech inference locally. Keep the captured photo and draft available.
6. Review/edit the transcript. Typing remains available if inference fails.
7. Optionally request local field suggestions, edit them and explicitly apply them.
8. Review location, issue, follow-up and status; save locally.
9. Reopen the report immediately, then again after closing/relaunching the app.

Camera and voice are independent: photo-only and note-only capture must remain possible. Location is required at save; at least one photo or non-empty note is required. Default status is Open.

### Handover

1. Select reports; show count and modes available.
2. Create instant compiled briefing from exact saved observations/reviewed issues, recorded follow-ups, statuses and locations.
3. Save an immutable snapshot with source links; copy or use native text sharing at explicit user request.
4. If P2 local AI is available, offer a separate AI briefing action and require source review.
5. Cloud handover, if included, is separately labeled and requires online availability and confirmation of selected text before sending. Never send photos/audio in MVP.

## 6. Functional Requirements

### Camera and recording

- Prioritize the camera and recording controls on the capture screen; use accessible labels and touch targets of at least 44 logical units.
- Copy selected/captured media to app-owned storage; do not depend on temporary camera/gallery paths after saving.
- Compress/downsample photos to a documented size policy while keeping visible defect detail; generate thumbnails for history.
- Handle camera/microphone denial with an explanation and an alternative input path; offer settings navigation where appropriate.
- Record locally; never depend on a network-backed platform speech service for the core transcription path.
- On app backgrounding, calls or audio interruptions, stop safely and preserve a completed recording/draft when possible. Explain if an incomplete recording cannot be recovered.
- Keep audio in app-owned temporary storage until save/discard so retry survives navigation or backgrounding. Delete it after save/discard by default; no permanent audio archive in MVP.

### Local AI lifecycle

- Use native inference off the UI thread. UI gestures, recording controls and cancellation must remain responsive.
- Speech and LLM modules expose prepare/readiness/run/cancel/dispose through small typed interfaces, separate from UI and persistence.
- Bundle a small model or visibly download larger assets once. Show size, progress, storage requirements, retry and cancellation.
- Store exact artifact version/hash, validate completed downloads and check files on startup. A saved ready flag alone is insufficient.
- Inference after preparation uses local files only. Missing/corrupt assets cause a local error and preparation/manual fallback, not an upload.
- Release model handles and temporary files appropriately. Serialize heavy speech/LLM work initially to avoid competing for memory.
- Show actual execution backend when available; do not assume GPU/NPU acceleration or improved speed.
- Use bounded inputs, short outputs and compact source references. Keep thinking/reasoning output disabled when the model supports it.
- Use configurable timeouts informed by benchmarks; never leave generation indefinitely active. Results from cancelled operations or changed notes must not be applied.

### Extraction and briefing correctness

- Extracted location, issue, follow_up and status evidence must be supported by the note; prefer exact continuous quotes for extraction.
- Unclear or negated status must not overwrite the worker's status.
- Do not invent repairs, people, deadlines, urgency or safety advice. Resolved work must remain distinguishable from outstanding work.
- Applying suggestions is explicit; keep original note intact. Worker edits to reviewed fields are permitted and saved.
- Validate generated schema and every source reference before saving. Restore full IDs and locations from selected reports, not model-generated guesses.
- Source validity alone does not prove factual correctness. Test actual observation content and require review.
- Compiled briefing uses exact saved text and recorded follow-ups, with statuses and sources; no AI rewriting.
- Clearly label generation_mode as compiled, local or cloud. Empty/malformed/unusable results never silently become successful AI snapshots.

### Persistence and failure isolation

- Store reports, settings and snapshots in SQLite; photo/model/audio assets use app-owned file storage.
- Confirm save only after durable writes complete. Failed saves preserve the draft and show retry.
- Coordinate file and database writes so errors do not create reports pointing at missing photos; clean up orphan files safely.
- Persist capture draft text and completed media for recovery. Prompt before explicit discard; never promise recovery of an interrupted unfinished recording.
- Search location/note/issue/follow_up locally; filter status; newest-first history with thumbnails. Keep at least 200 reports responsive.
- Delete requires confirmation; previously saved snapshots survive, showing deleted sources as unavailable.
- No server-side report persistence or automatic cloud synchronization. Explain that app data is not backed up and uninstall/data clearing can remove it.

## 7. Screens

| Screen | Primary task and required states |
| --- | --- |
| History | Search/filter/open reports; prominent New report and Handover; empty/read failure states |
| Capture / report detail | Camera preview, record/stop/timer, transcript, location, issue/follow-up, status, save; permissions, loading, retry, unsaved/recovered draft and delete confirmation |
| Local AI setup | Model names/sizes, download/readiness/repair, available storage, local execution disclosure and failure fallback |
| Handover selection | Selected count, immediate compiled action, optional local AI/cloud actions, saved snapshots; no selection, limits, cancellation/errors |
| Briefing detail | Mode label, timestamp, sections, source links, deleted-source state, copy/share text and draft-review notice for generated content |

Recording controls remain visible above the keyboard when practical. Support safe areas, small phones, screen-reader labels, visible focus where relevant, readable contrast and larger text without clipping.

## 8. Data Contracts

Report: id, location, note, optional issue, optional follow_up, optional local photo reference, status (Open/In Progress/Resolved), transcription_source (typed/voice/voice_edited), created_at, updated_at.

Summary: id, created_at, source_report_ids, items, generation_status=success, generation_mode (compiled/local/cloud).

Summary item: id, section (issues_by_location/repeated_observations/work_list), text, optional location, source_report_ids (at least one valid source).

Model settings: artifact identifier/version/hash/path, verified readiness, runtime/backend preference and benchmark records. Recent locations and recoverable capture drafts are stored locally. Never store API secrets in the mobile client.

Reuse TypeScript domain contracts and pure validation/compilation logic from the web version where practical; adapt photo references from browser Blobs to native file paths. Browser storage adapters, UI, Web Workers, service workers and OPFS are replaced, not reused as native infrastructure. Web-to-mobile data migration is deferred unless explicitly needed.

## 9. Proposed Implementation Direction

- Expo + React Native + TypeScript, with a native development/release build for custom inference modules.
- Expo camera/media/audio/file modules and SQLite; finalize compatible versions during the device spike.
- Evaluate whisper.rn/whisper.cpp with a native tiny English artifact first. Existing browser ONNX weights are not assumed interchangeable with native runtime formats.
- Evaluate llama.rn/llama.cpp with a compact quantized GGUF model for extraction; Qwen3 0.6B is a candidate, not a guaranteed mobile selection. Select artifact/quantization through device measurements and quality checks.
- Do not implement both native inference and a browser inference fallback for MVP.
- Choose one physical presentation device/platform first. Android-first is a provisional delivery choice from the Windows workspace; confirm the actual phone before platform setup. iOS requires its appropriate build/signing path.
- Retain the existing Express proxy only if optional cloud handover is included; keys remain server-side and selected text requires consent.

This direction is planned, not an assertion that the native libraries/models have been integrated or benchmarked.

## 10. Performance and Quality Gates

Targets below are proposed demo targets, **not measured mobile results**. Record device model, RAM, OS, build type, runtime/model/quantization, backend, download/load duration, first/repeat inference time and failures.

| Gate | Target / decision |
| --- | --- |
| Capture responsiveness | Camera and recording controls respond without inference blocking the UI |
| Local speech | A 10-second English observation transcribes within 15 seconds after preparation |
| Local extraction | Short-note suggestions within 20 seconds; otherwise change model/runtime or defer assisted extraction |
| Instant briefing | Two-report compiled snapshot within one second on the presentation device |
| Optional AI briefing | Two-report generation within 30 seconds with valid sources and useful, grounded text; otherwise defer from live demo |
| Cancellation | Visible cancellation within one second; no stale result saved/applied; verify subsequent inference works |
| Persistence | Report and photo survive app termination/relaunch in airplane mode |
| Quality | Small held-out set includes distinct locations, construction vocabulary, noise/accent samples, explicit/negated status, missing follow-up, resolved work and repeated issues; no invented fields in the scripted demo cases |

Benchmark cold app/model starts separately from warmed repeat runs. Include multi-report generation and at least one lower-capability device if available before broader performance claims. Keep prompts' examples separate from held-out test facts. A deterministic compiled output is not a model benchmark.

## 11. Acceptance Criteria

- [ ] Install a native build on the named presentation phone; verify offline cold startup.
- [ ] Capture and save a photo-backed report in airplane mode; reopen it with identical fields/photo after force-close.
- [ ] Record and receive real local transcription with no remote requests after model preparation.
- [ ] Retry failed transcription from retained audio; manual typing works with missing models/denied microphone.
- [ ] Camera denial permits gallery or note-only capture; a report with neither photo nor note cannot save.
- [ ] Completed capture drafts recover after relaunch; interruptions do not corrupt existing reports.
- [ ] Storage/download/save failures show clear errors and preserve recoverable input.
- [ ] Search, status filter, edit and confirmed delete work offline.
- [ ] Compiled handover works with no model loaded, uses exact saved text/status and has valid source links.
- [ ] Saved snapshots reopen offline; deleted sources show unavailable without deleting the snapshot.
- [ ] Local suggestions, if shipped, preserve the note, reject unsupported fields and require explicit review/apply.
- [ ] Generated briefings, if shipped, pass schema/source AND content checks; inspect omitted tasks/status and copied examples.
- [ ] Cancel/retry and repeated model load/unload do not save stale results or exhaust device resources.
- [ ] Cloud action, if shipped, requires selected-text consent, sends no photos/audio and fails without affecting local reports.
- [ ] No raw recordings, photos or model input/output leak into analytics/crash logs.
- [ ] Actual mobile timings, model/backend and unresolved limitations are documented.
- [ ] Model/tool disclosure and dated hackathon development evidence are complete.

## 12. Fast Implementation Sequence

1. **Device/runtime spike first:** identify phone/platform, install a minimal native build, run a real 10-second local transcription offline and record latency. Try a short extraction only after speech works. Resolve native build/model issues before polishing screens.
2. **Capture vertical slice:** camera/gallery, local photo ownership, recording, editable note, SQLite save and offline reopen; draft recovery and permission paths.
3. **Reliable speech flow:** prepare/readiness, retry retained audio, cancellation, interruptions, error/manual fallback and resource cleanup.
4. **History and immediate handover:** reuse domain rules, search/status/edit/delete, compiled briefing, snapshots/source links and copy/share.
5. **Reviewed local extraction:** native model benchmark, field validation/review/apply, stale-result checks and quality cases.
6. **Optional generation:** only after speed/quality gates; compact source references, bounded input/output and human review. Cloud enrichment comes last.
7. **Physical-device rehearsal:** production-like installed build, airplane mode, app restart, storage/permission failures, seed reports and disclosure.

Do not promise a fixed 10-hour schedule before native inference works. Each slice ends with relevant type/build checks and actual device behavior. Reuse working pure functions and tests instead of rebuilding validation rules. Seed data is explicit, labeled sample content, never substituted for live inference.

## 13. Demo and Submission

Prepare/verify assets before presenting. Disconnect, photograph a site-like defect, speak an observation, show local transcription, review optional extracted fields, save and reopen after restart. Select reports and show immediate source-linked compiled handover. Show generative briefing only when its phone benchmark and quality gate pass. Cloud enrichment is optional and comes after the offline story.

Disclose actual model names/artifacts/quantization/licenses; inference frameworks and native bindings; React Native/Expo/SQLite and major libraries; download sources and any external APIs; configured cloud provider/model if used; development/testing tools including Codex. Include exact versions/build information and event-period work evidence. The existing workspace has no Git repository, so historical event timing cannot be established from commits here.

## 14. Decisions Still Needed

1. Exact presentation phone, platform, OS, RAM and available storage.
2. Hackathon dates/deadline and which web components predate the event.
3. Speech artifact/runtime performance and accent/vocabulary accuracy on that phone.
4. Native LLM artifact/quantization choice after measurement; whether extraction and generative briefing earn inclusion.
5. Bundled versus one-time downloaded model assets, based on actual sizes and distribution constraints.
6. Whether optional cloud handover is worth including within the remaining time.

Defaults: English, one photo, recording max 60 seconds, audio deleted after save/discard, no login/sync/vision, P0 first. Do not block the capture build on optional cloud or generative briefing decisions.
