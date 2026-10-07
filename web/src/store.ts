import { create } from "zustand";

export const DURATION_H = 168;

export const SPECIES = [
  { id: "arabidopsis", name: "Thale cress", latin: "Arabidopsis thaliana" },
  { id: "lettuce", name: "Lettuce", latin: "Lactuca sativa" },
  { id: "radish", name: "Garden radish", latin: "Raphanus sativus" },
] as const;

export const SPECIES_IDS: string[] = SPECIES.map((species) => species.id);

export type ViewKey = "section" | "soil" | "water" | "labels" | "xray" | "scale" | "orbit";
export type Metric = "germination" | "moisture" | "root" | "respiration";
export type CameraPreset = "overview" | "section" | "seed";
export type InspectorTab = "now" | "model" | "numbers";
export type Explain = "plain" | "physics";

export type Preset = { id: string; label: string; temperature: number; dryness: number };

export const PRESETS: Preset[] = [
  { id: "spring", label: "Cold spring bed", temperature: 8, dryness: 0.03 },
  { id: "sill", label: "Windowsill", temperature: 20, dryness: 0.01 },
  { id: "heat", label: "Heatwave", temperature: 31, dryness: 0.03 },
  { id: "dry", label: "Dry spell", temperature: 18, dryness: 0.6 },
];

type State = {
  visible: string[];
  focusId: string;
  temperature: number;
  dryness: number;
  timeH: number;
  playing: boolean;
  speed: number;
  metric: Metric;
  explain: Explain;
  tab: InspectorTab;
  pinnedModel: string | null;
  view: Record<ViewKey, boolean>;
  camera: { preset: CameraPreset; nonce: number };
  setTemperature: (value: number) => void;
  setDryness: (value: number) => void;
  applyPreset: (preset: Preset) => void;
  setTime: (value: number) => void;
  setPlaying: (value: boolean) => void;
  togglePlay: () => void;
  setSpeed: (value: number) => void;
  setMetric: (value: Metric) => void;
  setExplain: (value: Explain) => void;
  setTab: (value: InspectorTab) => void;
  pinModel: (id: string | null) => void;
  toggleView: (key: ViewKey) => void;
  setCamera: (preset: CameraPreset) => void;
  toggleSpecies: (id: string) => void;
  focus: (id: string) => void;
};

function ordered(ids: string[]): string[] {
  return SPECIES_IDS.filter((id) => ids.includes(id));
}

export const useStore = create<State>()((set) => ({
  visible: SPECIES_IDS,
  focusId: "radish",
  temperature: 20,
  dryness: 0.02,
  timeH: 0,
  playing: true,
  speed: 1,
  metric: "germination",
  explain: "plain",
  tab: "now",
  pinnedModel: null,
  view: {
    section: true,
    soil: true,
    water: true,
    labels: true,
    xray: false,
    scale: false,
    orbit: false,
  },
  camera: { preset: "overview", nonce: 0 },
  setTemperature: (temperature) => set({ temperature }),
  setDryness: (dryness) => set({ dryness }),
  applyPreset: (preset) => set({ temperature: preset.temperature, dryness: preset.dryness }),
  setTime: (timeH) => set({ timeH: Math.min(DURATION_H, Math.max(0, timeH)) }),
  setPlaying: (playing) => set({ playing }),
  togglePlay: () =>
    set((state) => {
      if (state.playing) return { playing: false };
      return { playing: true, timeH: state.timeH >= DURATION_H ? 0 : state.timeH };
    }),
  setSpeed: (speed) => set({ speed }),
  setMetric: (metric) => set({ metric }),
  setExplain: (explain) => set({ explain }),
  setTab: (tab) => set({ tab }),
  pinModel: (pinnedModel) => set({ pinnedModel }),
  toggleView: (key) => set((state) => ({ view: { ...state.view, [key]: !state.view[key] } })),
  setCamera: (preset) => set((state) => ({ camera: { preset, nonce: state.camera.nonce + 1 } })),
  toggleSpecies: (id) =>
    set((state) => {
      const on = state.visible.includes(id);
      if (on && state.visible.length === 1) return state;
      const visible = on ? state.visible.filter((item) => item !== id) : ordered([...state.visible, id]);
      const focusId = visible.includes(state.focusId) ? state.focusId : visible[0];
      return { visible, focusId };
    }),
  focus: (id) =>
    set((state) => ({
      focusId: id,
      visible: state.visible.includes(id) ? state.visible : ordered([...state.visible, id]),
    })),
}));
