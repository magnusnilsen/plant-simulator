import { fireEvent, render, screen } from "@testing-library/react";
import { Tooltip } from "radix-ui";
import { beforeEach, describe, expect, it } from "vitest";
import { formatHours, modelForPhase, sampleAt, shiftedPsiB50, soilWords } from "./format";
import { Timeline } from "./panels/Timeline";
import { useStore } from "./store";
import type { Run, Sample } from "./types";

describe("format", () => {
  it("maps water potential onto garden language", () => {
    expect(soilWords(0)).toBe("freshly watered");
    expect(soilWords(-0.1)).toBe("starting to dry");
    expect(soilWords(-0.5)).toBe("dry soil");
    expect(soilWords(-1.5)).toBe("near wilting");
  });

  it("interpolates between samples and keeps the phase discrete", () => {
    const samples: Sample[] = [sample(0, "imbibition", 0), sample(10, "activation", 4)];
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

  it("formats elapsed time as days and hours", () => {
    expect(formatHours(0)).toBe("d0 00h");
    expect(formatHours(50)).toBe("d2 02h");
  });

  it("raises the water threshold only above the optimum temperature", () => {
    const g = { psi_b50_mpa: -0.85, to_c: 24, k_t_mpa_per_c: 0.08 };
    expect(shiftedPsiB50(g, 20)).toBeCloseTo(-0.85);
    expect(shiftedPsiB50(g, 29)).toBeCloseTo(-0.45);
  });
});

describe("store", () => {
  beforeEach(() => {
    useStore.setState({ visible: ["arabidopsis", "lettuce", "radish"], focusId: "radish", timeH: 0 });
  });

  it("never hides the last specimen", () => {
    const { toggleSpecies } = useStore.getState();
    toggleSpecies("arabidopsis");
    toggleSpecies("lettuce");
    toggleSpecies("radish");
    expect(useStore.getState().visible).toEqual(["radish"]);
  });

  it("moves focus when the focused specimen is hidden", () => {
    useStore.getState().toggleSpecies("radish");
    expect(useStore.getState().focusId).toBe("arabidopsis");
  });

  it("keeps the clock when the environment changes", () => {
    useStore.getState().setTime(40);
    useStore.getState().setTemperature(30);
    expect(useStore.getState().timeH).toBe(40);
  });
});

describe("Timeline", () => {
  beforeEach(() => {
    useStore.setState({ focusId: "radish", timeH: 24, playing: false, metric: "germination" });
  });

  it("plots each run and lets the reader switch metric", () => {
    render(
      <Tooltip.Provider>
        <Timeline runs={[fixture]} />
      </Tooltip.Provider>,
    );
    expect(screen.getByRole("slider", { name: /time since sowing/i })).toBeTruthy();
    expect(screen.getByText("Radish")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Root" }));
    expect(useStore.getState().metric).toBe("root");
  });
});

function sample(time: number, phase: Sample["phase"], root: number): Sample {
  return {
    time_h: time,
    germination_fraction: time / 48,
    median_progress: time / 48,
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
  t50_h: 24,
  final_fraction: 0.99,
  narrative: { plain: "plain", physics: "physics", limit: "limit" },
  display: {
    seed_length_mm: 3,
    sowing_depth_mm: 12,
    cotyledon_mm: 12,
    root_span_mm: 40,
    hypocotyl_span_mm: 24,
    coat: "#7a4a32",
    embryo: "#e9dcae",
    stem: "#b4586c",
    accent: "#f08a7e",
  },
  samples: [sample(0, "imbibition", 0), sample(48, "seedling", 10)],
};
