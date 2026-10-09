const revision = "5359861c739e955e79d9a303bcbc70fb988958b1";
export const speechModels = [
  {
    id: "tiny",
    name: "Whisper tiny · Multilingual",
    file: "ggml-tiny.bin",
    bytes: 77691713,
    sha256: "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21",
    multilingual: true,
    description:
      "Smallest multilingual option. Try Filipino / Taglish; review every transcript.",
  },
  {
    id: "base",
    name: "Whisper base · Multilingual",
    file: "ggml-base.bin",
    bytes: 147951465,
    sha256: "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe",
    multilingual: true,
    description:
      "Larger multilingual option to compare accuracy. May run slower on this phone.",
  },
  {
    id: "tiny.en",
    name: "Whisper tiny.en · English",
    file: "ggml-tiny.en.bin",
    bytes: 77704715,
    sha256: "921e4cf8686fdd993dcd081a5da5b6c365bfde1162e72b08d75ac75289920b1f",
    multilingual: false,
    description:
      "Existing English model. Does not support Filipino transcription.",
  },
] as const;
export type SpeechModel = (typeof speechModels)[number];
export type SpeechModelId = SpeechModel["id"];
export const speechLanguages = ["auto", "tl", "en"] as const;
export type SpeechLanguage = (typeof speechLanguages)[number];
export function findSpeechModel(id: unknown): SpeechModel {
  return speechModels.find((m) => m.id === id) ?? speechModels[0];
}
export function artifact(model: SpeechModel) {
  return {
    ...model,
    revision,
    url: `https://huggingface.co/ggerganov/whisper.cpp/resolve/${revision}/${model.file}`,
  };
}
export function transcriptionLanguage(
  model: SpeechModel,
  language: SpeechLanguage,
) {
  return model.multilingual ? language : "en";
}
