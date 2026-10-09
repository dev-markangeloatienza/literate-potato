# FieldBrief Mobile

Offline construction reports for Android. Native Expo / React Native app with SQLite persistence, app-owned photos, WAV capture and local Whisper transcription. Presentation target: Samsung Galaxy A55 SM-A556E, Android 16/API 36; actual offline device checks are recorded in the rehearsal checklist.

## Run

Use Node 24+, JDK 17 and an Android SDK. This app needs a native build; Expo Go cannot load Whisper or the WAV recorder.

```powershell
cd D:/local-ai-report/mobile
$env:NPM_CONFIG_USERCONFIG = "$PWD/npm-user.config"
npm ci
npm run android
```

For an offline standalone APK:

```powershell
./scripts/build-android.ps1
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

The local release profile uses Expo's generated development signing key and is intended for device rehearsal. Configure a private production signing key / EAS credentials before store distribution. EAS profiles are included; no remote build or publication was requested or performed.

## Included

- Camera or gallery, one JPEG photo per report (maximum 1600-pixel longest edge, quality 0.8; 240-pixel thumbnail).
- Android PCM WAV recording: mono, 16 kHz, 16-bit, maximum 60 seconds. Audio focus interruptions stop safely; completed recordings are retained for retry.
- Visible speech-model preparation, pinned download, SHA-256 verification on startup/readiness and before inference, local CPU execution, progress, cancellation, 90-second transcription timeout, manual fallback.
- Original observation and separate reviewed issue / recorded follow-up, location, three statuses.
- SQLite reports and isolated recoverable capture/edit drafts, local search and status filters, confirmed deletion.
- Exact compiled handovers, immutable saved snapshots, source links with deleted-source handling, explicit copy/share.
- No accounts, synchronization, cloud calls, analytics or photo interpretation. Android automatic app backup disabled.

P1 local LLM extraction and P2 AI/cloud briefings remain deferred until device speech and performance gates pass, as required by the PRD. No simulated AI results or sample reports are substituted for real inference.

## Verify

```powershell
npm run typecheck
npm run lint
npm test
npx expo-doctor
node scripts/check-native.mjs # after native project generation
```

The domain and storage tests use real in-memory SQLite through Node's SQLite adapter with mocked native file APIs. They establish domain/SQL behavior; they do not establish Android filesystem durability or camera/microphone operation.

See [device rehearsal checklist](../.agent-os/context/device-validation.md), [disclosure](../.agent-os/context/disclosure.md) and [development evidence](../.agent-os/context/development-log.md). App data has no backup; uninstalling or clearing app storage removes it.
