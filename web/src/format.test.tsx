import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Stage } from "./Stage";
import { modelForPhase, sampleAt, soilWords } from "./format";
import type { Run, Sample } from "./types";

describe("format", () => {
  it("maps water potential onto garden language", () => {
    expect(soilWords(0)).toBe("freshly watered");
    expect(soilWords(-0.1)).toBe("starting to dry");
    expect(soilWords(-0.5)).toBe("dry soil");
    expect(soilWords(-1.5)).toBe("near wilting");
  });

  it("interpolates between samples and keeps the phase discrete", () => {
    const samples: Sample[] = [
      sample(0, "imbibition", 0),
      sample(10, "activation", 4),
    ];
    const mid = sampleAt(samples, 5);
    expect(mid.root_mm).toBeCloseTo(2);
    expect(mid.phase).toBe("imbibition");
    expect(sampleAt(samples, 40).phase).toBe("activation");
  });

  it("picks the model that explains the current phase", () => {
    expect(modelForPhase("imbibition")).toBe("imbibition");
    expect(modelForPhase("activation")).toBe("hydrothermal");
    expect(modelForPhase("seedling")).toBe("seedling");
  });
});

describe("Stage", () => {
  it("draws a cross-section the reader can scrub", () => {
    render(<Stage runs={[fixture]} timeH={12} durationH={48} onScrub={() => {}} />);
    expect(
      screen.getByRole("img", { name: /cross-section of the seed/i }),
    ).toBeTruthy();
    expect(screen.getByText("Radish")).toBeTruthy();
  });
});

function sample(time: number, phase: Sample["phase"], root: number): Sample {
  return {
    time_h: time,
    germination_fraction: time / 20,
    median_progress: time / 20,
    moisture: 0.4,
    phase,
    root_mm: root,
    hypocotyl_mm: root / 2,
    respiration_index: 0.5,
  };
}

const fixture: Run = {
  species_id: "radish",
  common_name: "Radish",
  scientific_name: "Raphanus sativus",
  t50_h: 48,
  final_fraction: 0.99,
  narrative: { plain: "plain", physics: "physics", limit: "limit" },
  display: {
    root_span_mm: 40,
    hypocotyl_span_mm: 24,
    coat: "#7a4036",
    embryo: "#e4d2a8",
    accent: "#d7a15a",
  },
  samples: [sample(0, "imbibition", 0), sample(48, "seedling", 10)],
};
