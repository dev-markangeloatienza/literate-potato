# Architecture context

Native modular app in mobile/, Expo 57 + React Native 0.86 + TypeScript. Expo Router screens in src/app; domain.ts holds pure report validation/compiled handover contracts; storage.ts owns parameterized SQLite access and app-owned media; speech.ts owns prepare/readiness/run/cancel/resource cleanup.

Android-only project-owned Expo module modules/field-recorder uses AudioRecord (16 kHz mono PCM16), WAV headers, 60-second cap, fsync, audio focus and lifecycle stop. Expo image picker/manipulator manages camera/gallery and bounded JPEGs/thumbnails. Native file paths stay within app storage. SQLite stores reports/settings/drafts/snapshots; heavy inference runs through native whisper.rn and releases handles after each job. SHA-256 is streamed in 256 KB file chunks using native MessageDigest on the module work queue, keeping hashing off the JS/UI thread.

One explicit network flow downloads the public pinned English GGML speech model; all transcription/report input stays local. No backend, analytics, cloud fallback, login or runtime MCP dependency. Snapshot compilation preserves exact saved text/status/source IDs. Source deletion leaves snapshots intact.

Capture drafts are serialized to SQLite; new-report and each report-edit draft use separate keys. Report save and removal of only its matching recovery draft are atomic. Photo existence is checked before database commit. Orphan photo/audio collection runs before rendering routes on cold launch and preserves every persisted draft reference. Completed audio is removed after save/discard; unfinished recording recovery is not promised.

Native projects are generated and ignored; configure with app.json/custom modules, not handwritten native project edits. Local arm64 rehearsal APK uses generated debug signing; store distribution needs production credentials. iOS UI support is incidental; iOS WAV recording is not implemented or verified.
