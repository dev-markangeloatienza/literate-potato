# Samsung A55 rehearsal

Device supplied by user: Samsung A55, SM-A556E, Android 16/API 36, MemTotal 7,606,432 kB, approximately 63 GB free /data. USB serial RRCX704Y83A authorized. Standalone APK installed and cold launched without Metro.

Observed checks on 2026-10-10: user captured a photo and saved a report; history showed one saved report after force-stop/cold restart. Android packaged CAMERA and RECORD_AUDIO permissions verified via aapt2. Model file passed SHA-256 readiness verification after APK updates and cold startup. With airplane_mode_on=1 and Wi-Fi disabled (verified via ADB), an 11-second bundled JFK speech sample transcribed correctly. Baseline 35.6 seconds with JS hashing; native streaming-hash revision measured 1.1 seconds including verification/load/inference. This establishes one prerecorded sample/device scenario, not site microphone/accent/noise accuracy. A live microphone run measured 1.2 seconds total; transcript accuracy is unconfirmed and the unfinished user draft remains preserved.

Cold deep link initially left Local AI without Home behind it; user reported being unable to go back. Added initialRouteName=index and explicit Back to reports; updated APK installed; cold deep-link Back returned to Field reports. The explicit Back to reports action is also present. The app was force-stopped and reopened at Home, retaining the saved report.

Do not infer untested failure/performance gates from these checks.

1. Install standalone APK; launch without Metro and restart in airplane mode.
2. Type a note at a named location; save, force-stop and reopen. Verify exact fields.
3. Capture a real photo, save and reopen after force-stop. Deny camera permission and use gallery/note-only fallback. Reject empty location and a report with neither photo nor note.
4. Prepare speech while connected. Verify hash/readiness after app restart. Disconnect before recording. Record a 10-second English observation, stop, review real local text and save.
5. Retry retained recording, cancel inference, then run another transcription. Test 60-second stop, backgrounding, incoming call/audio focus loss and denied microphone.
6. Recover completed audio/text/photo draft after force-stop. Unfinished recordings are not promised recoverable.
7. Search all four text fields, filter three statuses, edit, and confirm delete. Load at least 200 explicit test reports when checking history performance.
8. Compile two reports with distinct locations/statuses and recorded follow-ups. Verify exact text. Reopen saved snapshot offline; edit/delete a source and confirm snapshot unchanged / deleted source unavailable. Explicitly test text copy/share.
9. Simulate missing/corrupt model and insufficient storage. Confirm local errors/manual fallback and retry, no cloud request and no failed-save success message.
10. Check small width, landscape, larger system font, TalkBack labels, and keyboard access to recording/save controls.

Record OS/RAM/build type, runtime/model/artifact/hash/backend, download/load/first/repeat inference times, audio duration, cancellation response and failures. Speech target: 10-second recording within 15 seconds after preparation. This is a target, not an observed result.

Hold-out speech observations should include construction vocabulary, site noise, worker accent, negated status and resolved work. Do not claim LLM extraction/briefing performance: those features are deferred.
