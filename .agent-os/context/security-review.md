# Security / privacy review

2026-10-10 scope: Android offline reporting, native media capture, local file/model inference, SQLite, snapshot sharing and build configuration.

Evidence: report SQL uses bound parameters; in-memory SQLite tests include SQL-shaped note text and verify it remains data. Save checks photo existence before atomic report/draft writes. Draft keys cannot overwrite other capture/edit recovery. Native recorder restricts canonical output paths to app files. Orphan collection is limited to app-owned photo/audio folders. Model URL/revision/hash are fixed, validated before inference; no user report text/audio/photo is sent by this code. Copy/share is explicit. No accounts, API keys, analytics or external report service. Native Whisper disables realtime/progress/timestamp text printing in its transcribe configuration. Android automatic backup is disabled.

Physical-device testing caught image-picker microphonePermission=false removing RECORD_AUDIO despite the audio plugin. Corrected config and added generated-manifest assertions for camera/microphone/backup policy before build.

Dependency audit reports 28 transitive findings (10 moderate/18 high), primarily Expo/Metro/build-tool chains, with some advisories offering incompatible SDK downgrades. No blind force-fix was applied. Current registry latest braces 3.0.3 and node-forge 1.4.0 remain within advisory ranges. Router's older CJS decode-uri-component also has a malformed-input denial-of-service advisory; latest 0.5.0 is ESM and was not substituted unverified into the older CJS caller. Dependency remediation remains a production-release gate; this is a local rehearsal build.

Not verified: broad physical permission/interruption/storage-failure matrix, data-uninstall behavior, network packet trace, iOS, lower-capability device and malicious deep-link reproduction. Do not describe this scoped review as a complete production security certification.

2026-10-10 disaster changes reviewed inline: optional incident fields/enums/length/GPS ranges validated before SQLite save; bound SQL unchanged. Coordinates remain in app storage and only leave through explicit copy/share of handover. Foreground location permission only; no background permission or address service. Model catalog contains fixed HTTPS revision/hash/size, distinct app-owned paths, hash verification before inference, no arbitrary URL input and no cloud fallback. Existing dependency audit count unchanged after expo-location (28). Physical GPS and network trace checks still needed.

Disaster device check: generated assertions and packaged aapt2 permissions confirmed no ACCESS_BACKGROUND_LOCATION. Phone-side DNS failure did not trigger fallback or remove existing English model. Native UI inspection retained existing report/draft. New runtime sample was English while connected settings remained unchanged; no network packet trace was performed.
