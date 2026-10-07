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

export const PHASE_COLOURS: Record<Sample["phase"], string> = {
  blocked: "#6c746e",
  imbibition: "#7cc7ff",
  activation: "#f2b866",
  emergence: "#f0a46a",
  seedling: "#8fd16a",
};

export const PHASE_LABELS: Record<Sample["phase"], string> = {
  blocked: "Stalled",
  imbibition: "Taking up water",
  activation: "Waking up",
  emergence: "Root out",
  seedling: "Seedling",
};

export function formatHours(hours: number): string {
  const day = Math.floor(hours / 24);
  const rest = hours - day * 24;
  return `d${day} ${rest.toFixed(0).padStart(2, "0")}h`;
}

/** Median seed's base water potential once the heat shift above the optimum is applied. */
export function shiftedPsiB50(germination: Record<string, number>, temperatureC: number): number {
  const { psi_b50_mpa: psi, to_c: to, k_t_mpa_per_c: kT } = germination;
  return psi + kT * Math.max(0, temperatureC - to);
}

const PARAMETER_LABELS: Record<string, string> = {
  "germination.tb_c": "Base temperature",
  "germination.to_c": "Optimum",
  "germination.tc_c": "Ceiling",
  "germination.theta_htt_mpa_c_h": "Hydrothermal dose θ",
  "germination.psi_b50_mpa": "Median base water potential",
  "germination.sigma_psi_b_mpa": "Spread of that threshold",
  "germination.k_t_mpa_per_c": "Heat slope of the threshold",
};

export function labelFor(parameter: string): string {
  return PARAMETER_LABELS[parameter] ?? parameter;
}

export function formatParam(parameter: string, germination: Record<string, number>): string {
  const key = parameter.split(".")[1];
  const value = germination[key];
  if (value === undefined) return "";
  if (parameter.endsWith("_c")) return `${value.toFixed(0)}°C`;
  if (parameter.includes("theta")) return `${value.toFixed(0)} MPa·°C·h`;
  if (parameter.includes("k_t")) return `${value.toFixed(3)} MPa/°C`;
  if (parameter.includes("sigma") || parameter.includes("psi")) return `${value.toFixed(3)} MPa`;
  return String(value);
}
