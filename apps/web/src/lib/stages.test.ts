import { describe, it, expect } from "vitest";
import {
  PIPELINE_STAGES,
  stageLabels,
  stageDotColors,
  stageTopColors,
} from "./stages";

describe("stages", () => {
  it("PIPELINE_STAGES has 4 entries", () => {
    expect(PIPELINE_STAGES).toEqual([
      "requirement",
      "design",
      "development",
      "testing",
    ]);
  });

  it("stageLabels keys match PIPELINE_STAGES + done", () => {
    const expected = [...PIPELINE_STAGES, "done"];
    for (const key of expected) {
      expect(stageLabels).toHaveProperty(key);
    }
  });

  it("stageDotColors has all stage keys", () => {
    const expected = [...PIPELINE_STAGES, "done"];
    for (const key of expected) {
      expect(stageDotColors).toHaveProperty(key);
    }
  });

  it("stageTopColors has all stage keys", () => {
    const expected = [...PIPELINE_STAGES, "done"];
    for (const key of expected) {
      expect(stageTopColors).toHaveProperty(key);
    }
  });
});
