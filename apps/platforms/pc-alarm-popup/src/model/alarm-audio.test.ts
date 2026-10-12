import { describe, expect, test } from "bun:test";

import { DEFAULT_ALARM_AUDIO, resolveAlarmAudioUrl, shouldPlayAlarmAudio, shouldReplayAfterEnd } from "./alarm-audio";

describe("alarm audio", () => {
  test("shouldPlayAlarmAudio respects turnWarningSound and one_level default", () => {
    expect(shouldPlayAlarmAudio(true, "two_level")).toBe(true);
    expect(shouldPlayAlarmAudio(false, "one_level")).toBe(false);
    expect(shouldPlayAlarmAudio(null, "one_level")).toBe(true);
    expect(shouldPlayAlarmAudio(undefined, "one_level")).toBe(true);
    expect(shouldPlayAlarmAudio(null, "two_level")).toBe(false);
  });

  test("resolveAlarmAudioUrl prepends origin for relative paths", () => {
    expect(resolveAlarmAudioUrl("/files/alarm.mp3", "https://host.test")).toBe("https://host.test/files/alarm.mp3");
    expect(resolveAlarmAudioUrl("https://cdn.test/a.mp3", "https://host.test")).toBe("https://cdn.test/a.mp3");
    expect(resolveAlarmAudioUrl("", "https://host.test")).toBe(DEFAULT_ALARM_AUDIO);
  });

  test("shouldReplayAfterEnd handles looped and playNum", () => {
    expect(shouldReplayAfterEnd({ looped: true, playNum: 3 }, 1)).toBe(false);
    expect(shouldReplayAfterEnd({ looped: false, playNum: 3 }, 1)).toBe(true);
    expect(shouldReplayAfterEnd({ looped: false, playNum: 3 }, 3)).toBe(false);
  });
});
