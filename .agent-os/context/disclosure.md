# Shipped model and tooling disclosure

## Speech

- Model: OpenAI Whisper tiny.en, English, GGML `ggml-tiny.en.bin`, unquantized artifact, 77,704,715 bytes.
- Host: ggerganov/whisper.cpp on Hugging Face, pinned repository revision `5359861c739e955e79d9a303bcbc70fb988958b1`.
- Download: https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-tiny.en.bin
- SHA-256: `921e4cf8686fdd993dcd081a5da5b6c365bfde1162e72b08d75ac75289920b1f`, confirmed against host LFS metadata on 2026-10-10 (Asia/Manila).
- Whisper / whisper.cpp / whisper.rn licenses: MIT. Native binding whisper.rn 0.7.4 ships whisper.cpp version 1.9.3. CPU selected explicitly; GPU/NPU/CoreML acceleration is not claimed.
- Download is the only required network action. Inference receives an app-owned local WAV file and local model file. No cloud fallback.

## Application

Expo 57.0.27, React Native 0.86.3, React 19.2.3, TypeScript 6.0.3. Exact direct/transitive versions are in mobile/package-lock.json. Expo Router, SQLite, Expo image picker/manipulator, audio permissions, file system, crypto, clipboard, font/assets and safe-area support. Ionicons via @expo/vector-icons. Android MessageDigest supplies streaming native SHA-256 verification. Buffer supplies the native speech binding's JS buffer dependency.

Android WAV capture is a project-owned Expo module using AudioRecord; no speech platform service or server is used. Photos are evidence only. Compiled handovers are deterministic and are not AI inference.

Development/testing: OpenAI Codex, create-expo-app, npm, Android SDK/ADB/Gradle/JDK 17, ESLint, Prettier, Vitest, Node SQLite for storage tests, Git. No cloud report/API provider, analytics SDK or secrets bundled.

Bundled runtime check: `mobile/assets/speech-check.wav`, JFK public speech excerpt distributed with whisper.cpp's samples (11 seconds, 16 kHz PCM WAV), source https://github.com/ggml-org/whisper.cpp/blob/master/samples/jfk.wav. Explicitly labeled test content; not used as a report or represented as worker microphone input.

Samsung A55 SM-A556E, Android 16/API 36, MemTotal 7,606,432 kB, approximately 63 GB available /data storage at initial inspection. Installed standalone Android app launched successfully. Microphone manifest conflict was caught during physical testing and corrected. Offline bundled speech check measured 1.1 seconds total; a live recording run measured 1.2 seconds. Microphone transcript accuracy remains unconfirmed. iOS recording is not implemented in this Android-first core.
