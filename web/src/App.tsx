import { useEffect, useState } from "react";
import { modelForPhase, sampleAt, signedMpa, soilWords } from "./format";
import { Stage } from "./Stage";
import { useEncyclopedia, useSimulation, useSpeciesDetail } from "./useSimulation";

const SPECIES = [
  { id: "arabidopsis", label: "Arabidopsis" },
  { id: "lettuce", label: "Lettuce" },
  { id: "radish", label: "Radish" },
] as const;

const MODELS = [
  { id: "hydrothermal", label: "The dose" },
  { id: "imbibition", label: "Wetting" },
  { id: "seedling", label: "Elongation" },
  { id: "respiration", label: "Respiration" },
] as const;

const DURATION_H = 168;
const N_POINTS = 169;

export function App() {
  const [speciesIds, setSpeciesIds] = useState<string[]>(["radish"]);
  const [temperature, setTemperature] = useState(20);
  const [dryness, setDryness] = useState(0.02);
  const [timeH, setTimeH] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [physics, setPhysics] = useState(false);
  const [manualId, setManualId] = useState("radish");
  const [pinnedModel, setPinnedModel] = useState<string | null>(null);

  const waterPotential = -dryness;
  const { result, error } = useSimulation({
    species_ids: speciesIds,
    temperature_c: temperature,
    water_potential_mpa: waterPotential,
    duration_h: DURATION_H,
    n_points: N_POINTS,
  });
  const encyclopedia = useEncyclopedia();
  const detail = useSpeciesDetail(manualId);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    const step = (now: number) => {
      const dt = (now - previous) / 1000;
      previous = now;
      setTimeH((current) => {
        const next = current + dt * (DURATION_H / 18);
        if (next >= DURATION_H) {
          setPlaying(false);
          return DURATION_H;
        }
        return next;
      });
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const focus = result?.runs[0];
  const focusSample = focus ? sampleAt(focus.samples, timeH) : null;
  const phaseCopy = encyclopedia?.phases.find((phase) => phase.id === focusSample?.phase);
  const activeModelId = pinnedModel ?? (focusSample ? modelForPhase(focusSample.phase) : "hydrothermal");
  const model = encyclopedia?.models.find((card) => card.id === activeModelId);
  const sentence = physics
    ? (focus?.narrative.physics ?? "The dose is hydrothermal time.")
    : speciesIds.length > 1
      ? (result?.comparison ?? focus?.narrative.plain)
      : focus?.narrative.plain;

  function chooseSpecies(id: string) {
    setSpeciesIds([id]);
    setManualId(id);
    setTimeH(0);
    setPlaying(true);
  }

  return (
    <main>
      <header className="top">
        <div>
          <p className="brand">Radicle</p>
          <p className="support">From a dry seed to the first root.</p>
        </div>
        <nav className="species" aria-label="Species">
          {SPECIES.map((species) => (
            <button
              key={species.id}
              type="button"
              aria-pressed={speciesIds.length === 1 && speciesIds[0] === species.id}
              onClick={() => chooseSpecies(species.id)}
            >
              {species.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={speciesIds.length === 3}
            onClick={() => {
              setSpeciesIds(SPECIES.map((species) => species.id));
              setTimeH(0);
              setPlaying(true);
            }}
          >
            All three
          </button>
        </nav>
      </header>

      {result ? (
        <Stage
          runs={result.runs}
          timeH={timeH}
          durationH={DURATION_H}
          onScrub={(next) => {
            setPlaying(false);
            setTimeH(next);
          }}
        />
      ) : (
        <p className="waiting">{error ?? "Computing the dose…"}</p>
      )}

      <p className="now">{sentence}</p>
      {focusSample && (
        <p className="meters">
          {phaseCopy?.title ?? focusSample.phase} · moisture {(focusSample.moisture * 100).toFixed(0)}% ·
          respiration {focusSample.respiration_index.toFixed(2)}× · {timeH.toFixed(0)} h
        </p>
      )}
      {error && result && <p className="error">{error}</p>}

      <div className="controls">
        <label>
          <span>
            Temperature <strong>{temperature.toFixed(1)}°C</strong>
          </span>
          <input
            type="range"
            min={2}
            max={40}
            step={0.5}
            value={temperature}
            aria-valuetext={`${temperature} degrees Celsius`}
            onChange={(event) => {
              setTemperature(Number(event.target.value));
              setTimeH(0);
              setPlaying(true);
            }}
          />
        </label>
        <label>
          <span>
            Soil water <strong>{soilWords(waterPotential)}</strong>
            <em>{signedMpa(waterPotential)}</em>
          </span>
          <input
            type="range"
            min={0}
            max={1.8}
            step={0.01}
            value={dryness}
            aria-valuetext={`${signedMpa(waterPotential)}, ${soilWords(waterPotential)}`}
            onChange={(event) => {
              setDryness(Number(event.target.value));
              setTimeH(0);
              setPlaying(true);
            }}
          />
        </label>
        <div className="actions">
          <button type="button" onClick={() => setPlaying((value) => !value)}>
            {playing ? "Pause" : "Play the hours"}
          </button>
          <button type="button" aria-pressed={physics} onClick={() => setPhysics((value) => !value)}>
            {physics ? "Plain language" : "Show the dose"}
          </button>
        </div>
      </div>

      <section className="manual">
        <h2>How this step is modelled</h2>
        <p className="support">
          {physics ? (phaseCopy?.physics ?? model?.physics) : (phaseCopy?.plain ?? model?.plain)}
        </p>
        <div className="manual-nav">
          {MODELS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={activeModelId === item.id}
              onClick={() => setPinnedModel(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {model && (
          <>
            <p className="equation">{model.equation}</p>
            <p>{model.equation_note}</p>
            <p className="citation">
              {model.name}, {model.year}. {model.developed_from}
            </p>
            <h3>What the model assumes</h3>
            <ul>
              {model.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3>Where it is weak</h3>
            <ul>
              {model.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}
        {detail && (
          <>
            <h3>
              {detail.common_name} <em>{detail.scientific_name}</em>
            </h3>
            <p>{detail.summary}</p>
            <p>{detail.reserves}</p>
            <p>{detail.dormancy_note}</p>
            {speciesIds.length > 1 && (
              <div className="manual-nav">
                {SPECIES.map((species) => (
                  <button
                    key={species.id}
                    type="button"
                    aria-pressed={manualId === species.id}
                    onClick={() => setManualId(species.id)}
                  >
                    {species.label} numbers
                  </button>
                ))}
              </div>
            )}
            <h3>The numbers, and how much to trust them</h3>
            <dl className="params">
              {detail.provenance
                .filter((item) => item.parameter.startsWith("germination."))
                .map((item) => (
                  <div key={item.parameter}>
                    <dt>
                      {labelFor(item.parameter)}{" "}
                      <strong>{formatParam(item.parameter, detail.germination)}</strong>
                      <em>{item.confidence}</em>
                    </dt>
                    <dd>
                      {item.source} {item.note}
                    </dd>
                  </div>
                ))}
            </dl>
          </>
        )}
        {focus && <p className="limit">{focus.narrative.limit}</p>}
      </section>
    </main>
  );
}

function labelFor(parameter: string): string {
  const names: Record<string, string> = {
    "germination.tb_c": "Base temperature",
    "germination.to_c": "Optimum",
    "germination.tc_c": "Ceiling",
    "germination.theta_htt_mpa_c_h": "Hydrothermal dose θ",
    "germination.psi_b50_mpa": "Median base water potential",
    "germination.sigma_psi_b_mpa": "Spread of that threshold",
    "germination.k_t_mpa_per_c": "Heat slope of the threshold",
  };
  return names[parameter] ?? parameter;
}

function formatParam(parameter: string, germination: Record<string, number>): string {
  const key = parameter.split(".")[1];
  const value = germination[key];
  if (value === undefined) return "";
  if (parameter.endsWith("_c")) return `${value.toFixed(0)}°C`;
  if (parameter.includes("theta")) return `${value.toFixed(0)} MPa·°C·h`;
  if (parameter.includes("k_t")) return `${value.toFixed(3)} MPa/°C`;
  if (parameter.includes("sigma") || parameter.includes("psi")) return `${value.toFixed(3)} MPa`;
  return String(value);
}
