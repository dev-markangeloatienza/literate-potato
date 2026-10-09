import { describe, it, expect } from "vitest";
import {
  artifact,
  findSpeechModel,
  speechModels,
  transcriptionLanguage,
} from "./speech-models";
describe("speech model choices", () => {
  it("defaults unknown preferences to multilingual tiny", () => {
    expect(findSpeechModel(null).id).toBe("tiny");
    expect(findSpeechModel("unknown").id).toBe("tiny");
  });
  it("pins distinct model files, sizes and SHA-256 values", () => {
    expect(new Set(speechModels.map((m) => m.file)).size).toBe(3);
    for (const model of speechModels) {
      const a = artifact(model);
      expect(a.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(a.url).toContain(`/resolve/${a.revision}/${a.file}`);
      expect(a.bytes).toBeGreaterThan(70_000_000);
    }
  });
  it("respects Filipino and auto-detect only for multilingual models", () => {
    expect(transcriptionLanguage(findSpeechModel("tiny"), "tl")).toBe("tl");
    expect(transcriptionLanguage(findSpeechModel("base"), "auto")).toBe("auto");
    expect(transcriptionLanguage(findSpeechModel("tiny.en"), "tl")).toBe("en");
  });
});
