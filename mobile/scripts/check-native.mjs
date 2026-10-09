import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const xml = readFileSync(
  new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url),
  "utf8",
);
for (const permission of [
  "CAMERA",
  "RECORD_AUDIO",
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION",
]) {
  const tags =
    xml.match(
      new RegExp(
        `<uses-permission[^>]*android:name="android.permission.${permission}"[^>]*>`,
        "g",
      ),
    ) || [];
  assert(
    tags.some((tag) => !tag.includes('tools:node="remove"')),
    `${permission} must be enabled in the generated manifest`,
  );
  assert(
    !tags.some((tag) => tag.includes('tools:node="remove"')),
    `${permission} is blocked by a config plugin`,
  );
}
assert(
  xml.includes('android:allowBackup="false"'),
  "Automatic app backup must be disabled",
);
assert(
  !xml.includes("android.permission.ACCESS_BACKGROUND_LOCATION"),
  "Background location must not be requested",
);
console.log(
  "Native manifest checks passed: camera, microphone, foreground location, local-only backup policy.",
);
