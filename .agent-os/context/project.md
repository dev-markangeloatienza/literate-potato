# Project context

FieldBrief Mobile: offline-first construction reporting for one worker/supervisor, one device, no login/sync. Scope from PRD.md: P0 capture/photo/WAV/local speech, SQLite report management/draft recovery, deterministic source-linked handovers. P1 native LLM and P2 generative/cloud features deferred until phone gates pass.

2026-10-10: Created native Expo app under mobile/. Android presentation target Samsung A55 SM-A556E, Android 16/API 36, MemTotal 7,606,432 kB, /data ~63 GB free. USB serial RRCX704Y83A authorized after reconnect. Owner: Codex; branch feature/fieldbrief-mobile. No remote configured; no publication requested.

Implementation includes native Android WAV recorder, pinned/hash-verified Whisper tiny.en CPU integration, local SQLite/file storage, camera/gallery, history/search/status/edit/delete, isolated recovered drafts, immutable compiled snapshots/copy/share and Local AI setup. Bundled speech check is explicitly labeled test content.

Validation: 13 domain/storage tests passing; typecheck/lint passing; expo-doctor 21/21 and generated/packaged native permissions verified. Standalone arm64 release APK installed. User captured/saved a photo-backed report; one saved report remained after offline cold restart. Bundled 11-second speech check returned correct real native transcription in airplane mode/Wi-Fi off: 35.6s baseline, 1.1s after moving SHA-256 to native streaming. A live microphone run measured 1.2 seconds total; transcript accuracy is unconfirmed and the unfinished user draft remains preserved. Cold deep-link Home navigation fix installed and verified. Saved handover reopened offline and its source link opened the persisted photo report.

See device-validation.md, disclosure.md and development-log.md for evidence and remaining rehearsal gates. Shared CLI rules at the supplied .agent-os/AGENTS.md path do not exist; root shared adapter AGENTS.md and local canonical instructions/skills were read.
