export type Phase = "imbibition" | "activation" | "emergence" | "seedling" | "blocked";

export type Sample = {
  time_h: number;
  germination_fraction: number;
  median_progress: number;
  moisture: number;
  phase: Phase;
  root_mm: number;
  hypocotyl_mm: number;
  respiration_index: number;
};

export type Display = {
  root_span_mm: number;
  hypocotyl_span_mm: number;
  coat: string;
  embryo: string;
  accent: string;
};

export type Narrative = {
  plain: string;
  physics: string;
  limit: string;
};

export type Run = {
  species_id: string;
  common_name: string;
  scientific_name: string;
  t50_h: number | null;
  final_fraction: number;
  narrative: Narrative;
  display: Display;
  samples: Sample[];
};

export type SimulationResult = {
  type?: string;
  request_id?: string;
  temperature_c: number;
  water_potential_mpa: number;
  duration_h: number;
  comparison: string | null;
  runs: Run[];
};

export type ModelCard = {
  id: string;
  name: string;
  year: number;
  developed_from: string;
  equation: string;
  equation_note: string;
  plain: string;
  physics: string;
  assumptions: string[];
  limitations: string[];
};

export type PhaseCopy = {
  id: Phase;
  title: string;
  plain: string;
  physics: string;
};

export type Provenance = {
  parameter: string;
  confidence: "high" | "medium" | "low" | "illustrative";
  source: string;
  year: number | null;
  note: string;
};

export type SpeciesDetail = {
  id: string;
  common_name: string;
  scientific_name: string;
  family: string;
  summary: string;
  reserves: string;
  dormancy_note: string;
  germination: Record<string, number>;
  provenance: Provenance[];
  references: { id: string; citation: string; year: number }[];
};

export type Encyclopedia = {
  models: ModelCard[];
  phases: PhaseCopy[];
  water_scale: { psi_mpa: number; label: string; garden: string }[];
};
