# Samsung A55 rehearsal

## Incident extraction 1.2.0 (2026-10-10)

Installed standalone arm64 v1.2.0 (3) on the same Samsung A55. Explicit in-app Qwen3 0.6B Q4_0 download succeeded; native size/SHA-256 verification showed Verified. Preparation persisted across the updated APK's cold setup launch. User's selected Whisper base multilingual remained selected and verified; no speech selection changes made by this task.

With Wi-Fi disabled and mobile data off, `dumpsys connectivity` reported Active default network: none. Real native CPU sentence classification returned the exact labeled typed Taglish fixture in 4.4 seconds: affected-people sentence about 12 families, rising-floodwater hazard sentence and food/rescue-boat request sentence. Negation fixture completed in 3.6 seconds and preserved "No one is injured", "no longer flooded", and the entire mixed boat/water request including its negation. Unknown-details fixture completed in 2.5 seconds with all three arrays empty. Tapped observed Cancel extraction check control; cancelled run yielded no accepted result. Subsequent Taglish retry completed correctly in 3.2 seconds. These are individual typed-fixture measurements, not microphone/noise/accent accuracy or general performance guarantees.

Bundled 11-second English speech fixture still returned the correct transcript through the selected native Whisper base model after extraction tests. No fixture created or changed a report. Wi-Fi restored to original on state; mobile data remained at original off state; airplane state remained off. Home displayed two user reports and unfinished draft after upgrade. Do not compare that count against the historical one-report baseline: user activity happened between sessions.

Final checks: 45 tests pass, typecheck/lint clean, Expo doctor 21/21; generated permissions/backup assertions pass; final standalone Android release build passes. JDK 17 is required here: JDK 25 caused CMake configuration failures; final build used installed `C:/Program Files/Eclipse Adoptium/jdk-17.0.20.101-hotspot`. Native downloader explicitly prepares checksum-verified artifacts; use Windows System32 tar on this host. APK: mobile/FieldBrief-Incident-1.2.0.apk (ignored artifact).

Remaining field evaluation: live English/Taglish audio → transcript → suggestion acceptance/edit/save/reopen, noisy/accented/ambiguous observations and broader categorization quality; long sessions/low-memory/thermal behavior; other devices/iOS; full interruption and storage-failure matrix. Automated tests validate state/data boundaries, not real-world model accuracy.

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

## Disaster slice validation (2026-10-10)

Installed final standalone arm64 v1.1.0 (2); cold launch Status ok, 756 ms initial installation launch. Home displayed existing report count 1 and recovered draft. Native UI inspection via ADB UIAutomator confirmed incident title, manual barangay/landmark, optional GPS rationale/capture, responder priority, people/hazards/needs, follow-up/status/save. No user report/draft was edited or discarded.

Selected English tiny.en in Local AI: existing file remained Verified. Real bundled JFK check returned correct text, 1.2 seconds total, CPU. Force-stop and cold setup launch retained selected English model. Switched to multilingual tiny: Not ready as expected. Attempted explicit download failed with phone DNS unable to resolve huggingface.co. App displayed error and retained English file. Restored English selection so current voice capture remains usable; Home left open. Airplane/Wi-Fi settings were not changed (airplane=0, Wi-Fi=1 when inspected), so this new runtime check is not a new airplane-mode benchmark.

Packaged aapt2 permissions confirm fine/coarse foreground location, camera and microphone, with no background location. Generated manifest assertions passed. Typecheck/lint clean, 25 tests, Expo doctor 21/21; release builds passed including final rebundle after navigation fix.

Outstanding physical gates: connect phone to working internet; select/download multilingual tiny/base and verify hashes; compare live Taglish recordings (names/counts/negations/noise) with auto/tl settings; cold restart and retry/cancel each model; test GPS permission denial, approximate accuracy, no fix/timeout and outdoor fix; enter/reopen incident fields and share handover; airplane-mode full capture journey. Never represent the English sample as Taglish evidence.

2026-10-10 focused extraction phone update: built standalone arm64 release 1.2.1 (4) with JDK 17; native manifest checks and Gradle assembleRelease passed (2m39s). Installed in-place using adb install -r on Samsung A55 RRCX704Y83A (Success), package version verified 1.2.1/code 4; cold MainActivity launch Status ok (821 ms). No uninstall/data-clear/model changes performed. Runtime extraction accuracy with the revised quote schema and saved-data UI inspection were not exercised in this installation task. APK mobile/FieldBrief-Incident-1.2.1.apk is an ignored local artifact.
