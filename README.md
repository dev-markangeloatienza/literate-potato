# Bantay Field

*(formerly FieldBrief)*

Offline-first, native Android field-reporting app for disaster response. One responder, one device, no login, no server — capture a photo and voice observation, transcribe and extract structured incident data entirely on-device, and compile a source-linked handover, all without connectivity.

Built for the **Local AI** hackathon theme: the speech-to-text and incident-extraction inference run on the phone itself, not in the cloud.

## Download

**[Download the latest build — v1.3.0 (.apk)](https://github.com/dev-markangeloatienza/literate-potato/releases/tag/v1.3.0)**

Android arm64 release build, verified on a Samsung A55 (Android 16). Enable "install unknown apps" for your browser/file manager, then install the downloaded APK.

## Features

- **Photo + voice capture** — one photo per report, tap-to-record voice note up to 60 seconds, independent of each other (photo-only and note-only are both valid).
- **On-device transcription** — Whisper (tiny.en English, or tiny/base multilingual) runs locally via `whisper.cpp`/`whisper.rn`; editable result, typing fallback if inference fails or is unavailable.
- **On-device incident extraction** — a quantized Qwen3 0.6B LLM selects source phrases for affected people, hazards, and needs. Conservative local phrase rules assess incident type and priority. Suggestions auto-fill blank/untouched fields; manual edits always take precedence and survive retries.
- **Foreground GPS tagging** — explicit, user-triggered location capture with accuracy/timestamp, manual fallback, and no background tracking.
- **Offline persistence** — reports, drafts, settings, and handover snapshots are stored locally in SQLite; photos/audio/models live in app-owned file storage. Save, search, status-filter, edit, and delete all work with zero connectivity.
- **Draft recovery** — in-progress captures survive app backgrounding, interruptions, and relaunches.
- **Compiled handover** — select saved reports and instantly generate a deterministic, source-linked incident summary — works even with no AI model loaded.
- **Model integrity** — every downloaded model artifact is verified by streamed native SHA-256 before use; missing/corrupt files fail visibly and never silently fall back to a network call.
- **No cloud dependency for core AI** — one one-time model download; after that, transcription and extraction never leave the device. (An optional, explicitly consented cloud handover path exists in the original PRD scope but is not required and ships last, if at all.)

## Tech stack

| Layer | Choice |
| --- | --- |
| App framework | Expo 57 + React Native 0.86 + TypeScript 6, Expo Router |
| Native audio | Project-owned Expo module (`modules/field-recorder`) — `AudioRecord`, 16 kHz mono PCM16 WAV, 60s cap |
| Speech-to-text | `whisper.rn` → `whisper.cpp`, CPU — Whisper tiny.en + tiny/base multilingual, GGML, pinned SHA-256 |
| Local LLM extraction | `llama.rn` → `llama.cpp`, CPU — Qwen3 0.6B Q4_0 GGUF (~429 MB), pinned SHA-256 |
| Location | `expo-location` — explicit foreground-only, timeout-bounded, manual fallback |
| Storage | SQLite (reports/settings/drafts/snapshots) + app-owned file storage (photos/audio/models) |
| Media | `expo-image-picker` / `expo-image-manipulator` |
| Hashing | Android `MessageDigest`, streamed off the JS thread |
| Tooling | ESLint, Prettier, Vitest, Node SQLite (tests), Android SDK/ADB/Gradle/JDK 17 |

No backend, no analytics, no login, no cloud AI fallback.

## Status

- P0 (installable offline core: capture, local transcription, save/search/edit/delete, compiled handover): **done**, verified on a physical Samsung A55 in airplane mode.
- P1 (local incident-field extraction into editable fields): **done**.
- P2 (generative briefing, optional cloud handover, secondary device/platform): **not started**, deferred until P0/P1 speed and quality gates are confirmed on more devices.

Known limitations: live-microphone accuracy across accents/noise, Taglish/multilingual extraction accuracy, and broader device coverage remain field-testing gaps — see the project's disclosure/validation notes for exact evidence.

## Project layout

```
mobile/
  src/app/        Expo Router screens (index, capture, handover, briefing, setup)
  src/domain.ts    Pure report/summary validation + compiled-handover logic
  src/storage.ts   SQLite + file storage
  src/speech*.ts   Whisper model catalog + transcription lifecycle
  src/extraction*.ts  Qwen3 prompt/schema + extraction lifecycle
  src/incident-*.ts   Autofill merge rules + deterministic type/priority assessment
  modules/field-recorder/  Native Android audio recording + SHA-256 module
```

## Development

```
cd mobile
npm install
npm run lint
npm test
```

A native (non-Expo-Go) build is required to exercise on-device Whisper/Qwen3 inference and the custom recorder module.
