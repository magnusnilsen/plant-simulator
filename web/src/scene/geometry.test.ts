import { describe, expect, it } from "vitest";
import type { Display, Sample } from "../types";
import {
  frameBox,
  hypocotylPath,
  plantPose,
  radiclePath,
  rootHairSegments,
  scaleBarMm,
  taperProfile,
  uptakeIntensity,
} from "./geometry";

const radish: Display = {
  seed_length_mm: 3,
  sowing_depth_mm: 12,
  cotyledon_mm: 12,
  root_span_mm: 40,
  hypocotyl_span_mm: 24,
  coat: "#7a4a32",
  embryo: "#e9dcae",
  stem: "#b4586c",
  accent: "#f08a7e",
};

function sample(overrides: Partial<Sample>): Sample {
  return {
    time_h: 0,
    germination_fraction: 0,
    median_progress: 0,
    moisture: 0.08,
    phase: "imbibition",
    root_mm: 0,
    hypocotyl_mm: 0,
    respiration_index: 0,
    ...overrides,
  };
}

describe("plantPose", () => {
  it("keeps a dry seed buried, unswollen, with nothing growing", () => {
    const pose = plantPose(radish, sample({}));
    expect(pose.seedY).toBeLessThan(0);
    expect(pose.swell).toBeCloseTo(0.88);
    expect(pose.radicleLength).toBe(0);
    expect(pose.hypocotylLength).toBe(0);
    expect(pose.cotyledonsOut).toBe(false);
  });

  it("swells the seed as it takes up water", () => {
    const wet = plantPose(radish, sample({ moisture: 0.6 }));
    expect(wet.swell).toBeGreaterThan(1);
  });

  it("only opens and greens the cotyledons once the shoot clears the surface", () => {
    const buried = plantPose(radish, sample({ median_progress: 1, hypocotyl_mm: 6, root_mm: 10 }));
    expect(buried.clearance).toBeLessThan(0);
    expect(buried.cotyledonOpen).toBe(0);
    expect(buried.greening).toBe(0);
    expect(buried.hookOpen).toBe(0);

    const above = plantPose(radish, sample({ median_progress: 1, hypocotyl_mm: 24, root_mm: 30 }));
    expect(above.clearance).toBeGreaterThan(0.1);
    expect(above.cotyledonOpen).toBeGreaterThan(0.2);
    expect(above.greening).toBeGreaterThan(0.2);
    expect(above.cotyledonSize).toBeGreaterThan(buried.cotyledonSize);
  });

  it("never draws a root through the bottom of the soil block", () => {
    const pose = plantPose(radish, sample({ median_progress: 1, root_mm: 400 }));
    expect(pose.seedY - pose.radicleLength).toBeGreaterThan(-2.4);
  });
});

describe("paths", () => {
  it("turns the radicle downward", () => {
    const points = radiclePath(0.08, 0.6);
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    expect(last[1]).toBeLessThan(points[0][1] - 0.4);
    expect(last[1] - prev[1]).toBeLessThan(0);
  });

  it("hooks the shoot over while buried and straightens it in the light", () => {
    const hooked = hypocotylPath([0, 0, 0], 0.4, 0);
    expect(hooked.tangent[1]).toBeLessThan(0);
    const straight = hypocotylPath([0, 0, 0], 0.4, 1);
    expect(straight.tangent).toEqual([0, 1, 0]);
    expect(straight.tip[1]).toBeCloseTo(0.4);
  });

  it("tapers to a rounded tip", () => {
    expect(taperProfile(0, 0.01)).toBeCloseTo(0.01);
    expect(taperProfile(0.5, 0.01)).toBeLessThan(0.01);
    expect(taperProfile(1, 0.01)).toBeLessThan(0.001);
  });

  it("grows root hairs only once the root is long enough", () => {
    expect(rootHairSegments(radiclePath(0.08, 0.08), 0.01).length).toBe(0);
    const hairs = rootHairSegments(radiclePath(0.08, 0.8), 0.01);
    expect(hairs.length).toBeGreaterThan(60);
    expect(hairs.length % 6).toBe(0);
  });
});

describe("frameBox", () => {
  const box = { width: 5, bottom: -2.4, top: 1.7 };
  const viewport = { width: 1400, height: 900 };

  it("backs the camera off when panels take up the screen", () => {
    const open = frameBox(box, viewport, { top: 0, right: 0, bottom: 0, left: 0 }, 30);
    const crowded = frameBox(box, viewport, { top: 60, right: 340, bottom: 180, left: 270 }, 30);
    expect(crowded.distance).toBeGreaterThan(open.distance);
  });

  it("shifts the target so the box sits in the free area", () => {
    const framed = frameBox(box, viewport, { top: 60, right: 340, bottom: 180, left: 270 }, 30);
    expect(framed.targetX).toBeGreaterThan(0);
    expect(framed.targetY).toBeLessThan((box.top + box.bottom) / 2);
  });
});

describe("helpers", () => {
  it("picks a readable scale bar", () => {
    expect(scaleBarMm(1 / 40)).toBe(10);
    expect(scaleBarMm(1 / 12)).toBe(5);
  });

  it("shows water flow only while water content is rising", () => {
    expect(uptakeIntensity(0.3, 0.3, 1)).toBe(0);
    expect(uptakeIntensity(0.3, 0.4, 1)).toBeCloseTo(0.6);
    expect(uptakeIntensity(0.4, 0.3, 1)).toBe(0);
  });
});
