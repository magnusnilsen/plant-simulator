import type { Sample } from "./types";

export function soilWords(waterPotentialMpa: number): string {
  if (waterPotentialMpa >= -0.03) return "freshly watered";
  if (waterPotentialMpa >= -0.2) return "starting to dry";
  if (waterPotentialMpa >= -0.8) return "dry soil";
  return "near wilting";
}

export function signedMpa(waterPotentialMpa: number): string {
  const rounded = waterPotentialMpa.toFixed(2);
  return `${rounded} MPa`;
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

export function sampleAt(samples: Sample[], timeH: number): Sample {
  if (samples.length === 0) {
    throw new Error("no samples");
  }
  if (timeH <= samples[0].time_h) return samples[0];
  const last = samples[samples.length - 1];
  if (timeH >= last.time_h) return last;
  let hi = 1;
  while (hi < samples.length - 1 && samples[hi].time_h < timeH) hi += 1;
  const left = samples[hi - 1];
  const right = samples[hi];
  const span = right.time_h - left.time_h;
  const u = span === 0 ? 0 : (timeH - left.time_h) / span;
  return {
    time_h: timeH,
    germination_fraction: lerp(left.germination_fraction, right.germination_fraction, u),
    median_progress: lerp(left.median_progress, right.median_progress, u),
    moisture: lerp(left.moisture, right.moisture, u),
    phase: u < 1 ? left.phase : right.phase,
    root_mm: lerp(left.root_mm, right.root_mm, u),
    hypocotyl_mm: lerp(left.hypocotyl_mm, right.hypocotyl_mm, u),
    respiration_index: lerp(left.respiration_index, right.respiration_index, u),
  };
}

export function modelForPhase(phase: Sample["phase"]): string {
  if (phase === "imbibition" || phase === "blocked") return "imbibition";
  if (phase === "seedling") return "seedling";
  return "hydrothermal";
}
