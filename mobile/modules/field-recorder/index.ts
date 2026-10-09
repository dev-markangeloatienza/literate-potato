import { requireOptionalNativeModule } from "expo-modules-core";
export const recorder = requireOptionalNativeModule<{
  start(path: string): Promise<void>;
  stop(): Promise<string>;
  isRecording(): boolean;
  sha256File(path: string): Promise<string>;
}>("FieldRecorder");
