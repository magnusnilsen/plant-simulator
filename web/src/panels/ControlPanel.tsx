import { Eye, EyeOff, Thermometer, Droplet } from "lucide-react";
import { shiftedPsiB50, soilWords } from "../format";
import { PRESETS, SPECIES, useStore } from "../store";
import type { SpeciesDetail } from "../types";
import { cx, Divider, Panel, RangeSlider, SectionTitle, type Mark } from "../ui";

const T_MIN = 0;
const T_MAX = 42;
const DRY_MAX = 1.8;

export function ControlPanel({ detail, accents }: { detail: SpeciesDetail | null; accents: Record<string, string> }) {
  const visible = useStore((s) => s.visible);
  const focusId = useStore((s) => s.focusId);
  const focus = useStore((s) => s.focus);
  const toggleSpecies = useStore((s) => s.toggleSpecies);
  const temperature = useStore((s) => s.temperature);
  const setTemperature = useStore((s) => s.setTemperature);
  const dryness = useStore((s) => s.dryness);
  const setDryness = useStore((s) => s.setDryness);
  const applyPreset = useStore((s) => s.applyPreset);

  const g = detail?.id === focusId ? detail.germination : null;
  const temperatureMarks: Mark[] = g
    ? [
        { value: g.tb_c, label: "Tb" },
        { value: g.to_c, label: "To", tone: "accent" },
        { value: Math.min(g.tc_c, T_MAX), label: "Tc" },
      ]
    : [];
  const threshold = g ? -shiftedPsiB50(g, temperature) : null;
  const waterMarks: Mark[] = [{ value: 0.03, label: "FC" }, { value: 1.5, label: "wilt" }];
  if (threshold !== null && threshold > 0 && threshold < DRY_MAX) {
    waterMarks.push({ value: threshold, label: "ψb50", tone: "accent" });
  }
  const psi = -dryness;

  return (
    <Panel className="flex w-[252px] flex-col py-1.5">
      <SectionTitle>Specimens</SectionTitle>
      <ul className="px-1.5">
        {SPECIES.map((species) => {
          const on = visible.includes(species.id);
          const focused = focusId === species.id;
          return (
            <li key={species.id}>
              <div
                className={cx(
                  "group flex h-9 items-center gap-2.5 rounded-md px-1.5 transition-colors",
                  focused ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  onClick={() => focus(species.id)}
                  aria-pressed={focused}
                >
                  <span
                    className="size-2.5 flex-none rounded-full ring-2 ring-black/30"
                    style={{ background: accents[species.id] ?? "#888", opacity: on ? 1 : 0.35 }}
                  />
                  <span className="min-w-0">
                    <span className={cx("block truncate text-[12px] font-medium", on ? "text-fg" : "text-fg-subtle")}>
                      {species.name}
                    </span>
                    <span className="block truncate text-[10.5px] italic leading-tight text-fg-subtle">{species.latin}</span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={on ? `Hide ${species.name}` : `Show ${species.name}`}
                  onClick={() => toggleSpecies(species.id)}
                  className={cx(
                    "grid size-6 place-items-center rounded text-fg-subtle transition-opacity hover:bg-white/8 hover:text-fg",
                    on && !focused && "opacity-0 group-hover:opacity-100",
                  )}
                >
                  {on ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Divider />
      <SectionTitle>Environment</SectionTitle>
      <div className="space-y-3 px-3 pb-1">
        <div>
          <div className="mb-0.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              <Thermometer size={12} /> Temperature
            </span>
            <span className="font-mono text-[11px] text-fg tabular-nums">{temperature.toFixed(1)}°C</span>
          </div>
          <RangeSlider
            label="Temperature"
            value={temperature}
            min={T_MIN}
            max={T_MAX}
            step={0.5}
            onChange={setTemperature}
            marks={temperatureMarks}
            track="linear-gradient(90deg, #5aa8ff 0%, #8fd1c4 30%, #c9d66a 52%, #f2b866 72%, #f0705a 100%)"
            valueText={`${temperature} degrees Celsius`}
          />
        </div>
        <div>
          <div className="mb-0.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              <Droplet size={12} /> Soil water
            </span>
            <span className="font-mono text-[11px] text-fg tabular-nums">{psi.toFixed(2)} MPa</span>
          </div>
          <RangeSlider
            label="Soil dryness"
            value={dryness}
            min={0}
            max={DRY_MAX}
            step={0.01}
            onChange={setDryness}
            marks={waterMarks}
            track="linear-gradient(90deg, #7cc7ff 0%, #6aa0b8 18%, #8c7a5c 55%, #a8743f 100%)"
            valueText={`${psi.toFixed(2)} MPa, ${soilWords(psi)}`}
          />
          <p className="mt-1 text-[10.5px] text-fg-subtle">
            {soilWords(psi)}
            {threshold !== null && threshold > 0 && (
              <>
                {" · "}
                {dryness < threshold ? "wetter" : "drier"} than half of these seeds can tolerate
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((preset) => {
            const active = Math.abs(preset.temperature - temperature) < 0.01 && Math.abs(preset.dryness - dryness) < 0.001;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cx(
                  "h-6 rounded-md border px-2 text-[10.5px] font-medium transition-colors",
                  active
                    ? "border-leaf/40 bg-leaf/10 text-leaf"
                    : "border-line-strong text-fg-muted hover:border-white/20 hover:text-fg",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
