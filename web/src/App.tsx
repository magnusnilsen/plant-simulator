import { Tooltip } from "radix-ui";
import { useEffect, useMemo, useRef } from "react";
import { sampleAt } from "./format";
import { ErrorBoundary } from "./ErrorBoundary";
import { ControlPanel } from "./panels/ControlPanel";
import { Inspector } from "./panels/Inspector";
import { Timeline } from "./panels/Timeline";
import { Toolbar, VIEW_SHORTCUTS } from "./panels/Toolbar";
import { CalloutOverlay } from "./scene/CalloutLayer";
import { Scene } from "./scene/Scene";
import { DURATION_H, useStore } from "./store";
import type { SimulationResult } from "./types";
import { useEncyclopedia, useSimulation, useSpeciesDetail } from "./useSimulation";

const N_POINTS = 169;
const HOURS_PER_SECOND = 12;

function usePlayback() {
  const playing = useStore((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      const { timeH, speed, setTime, setPlaying } = useStore.getState();
      const next = timeH + dt * HOURS_PER_SECOND * speed;
      if (next >= DURATION_H) {
        setTime(DURATION_H);
        setPlaying(false);
        return;
      }
      setTime(next);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (target?.closest("input, textarea") || target?.isContentEditable) return;
      if (event.key === " " && target?.closest("button, [role=tab], summary")) return;
      const state = useStore.getState();
      if (event.key === " ") {
        event.preventDefault();
        state.togglePlay();
        return;
      }
      const view = VIEW_SHORTCUTS[event.key.toLowerCase()];
      if (view) state.toggleView(view);
      if (event.key === "1") state.setCamera("overview");
      if (event.key === "2") state.setCamera("section");
      if (event.key === "3") state.setCamera("seed");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function App() {
  usePlayback();
  useShortcuts();
  const visible = useStore((s) => s.visible);
  const focusId = useStore((s) => s.focusId);
  const temperature = useStore((s) => s.temperature);
  const dryness = useStore((s) => s.dryness);
  const timeH = useStore((s) => s.timeH);

  const { result, error } = useSimulation({
    species_ids: visible,
    temperature_c: temperature,
    water_potential_mpa: -dryness,
    duration_h: DURATION_H,
    n_points: N_POINTS,
  });
  const encyclopedia = useEncyclopedia();
  const detail = useSpeciesDetail(focusId);

  const lastGood = useRef<SimulationResult | null>(null);
  if (result) lastGood.current = result;
  const shown = result ?? lastGood.current;
  const runs = useMemo(() => shown?.runs.filter((run) => visible.includes(run.species_id)) ?? [], [shown, visible]);
  const accents = useMemo(() => Object.fromEntries((shown?.runs ?? []).map((run) => [run.species_id, run.display.accent])), [shown]);
  const focusRun = runs.find((run) => run.species_id === focusId) ?? runs[0] ?? null;
  const focusSample = focusRun ? sampleAt(focusRun.samples, timeH) : null;

  return (
    <Tooltip.Provider delayDuration={350} skipDelayDuration={150}>
      <main className="canvas-backdrop relative h-full w-full overflow-hidden">
        <div className="absolute inset-0">
          <ErrorBoundary
            fallback={(failure) => (
              <div className="grid h-full place-items-center">
                <p className="max-w-md text-center font-mono text-[11px] text-warn" data-testid="scene-error" title={failure.stack}>
                  The 3D view failed: {failure.message}
                </p>
              </div>
            )}
          >
            {runs.length > 0 && <Scene runs={runs} />}
          </ErrorBoundary>
        </div>
        <CalloutOverlay />

        <header className="pointer-events-none absolute top-3 left-3 z-30 flex h-10 items-center gap-2.5 px-1">
          <Logo />
          <div className="leading-tight">
            <p className="text-[12.5px] font-semibold tracking-[-0.01em] text-fg">Radicle</p>
            <p className="text-[10.5px] text-fg-subtle">Seed to seedling · 7 days</p>
          </div>
        </header>

        <div className="absolute top-3 left-1/2 z-30 -translate-x-1/2">
          <Toolbar />
        </div>

        <aside className="absolute top-16 left-3 z-30">
          <ControlPanel detail={detail} accents={accents} />
        </aside>

        <aside className="absolute top-3 right-3 bottom-3 z-30 flex flex-col items-end">
          <Inspector
            run={focusRun}
            sample={focusSample}
            comparison={runs.length > 1 ? (shown?.comparison ?? null) : null}
            encyclopedia={encyclopedia}
            detail={detail}
          />
        </aside>

        {runs.length > 0 && (
          <section className="absolute bottom-3 left-1/2 z-30 w-[min(640px,calc(100vw-720px))] min-w-[440px] -translate-x-1/2">
            <Timeline runs={runs} />
          </section>
        )}

        {!shown && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="font-mono text-[11px] text-fg-subtle">{error ?? "Connecting to the simulator…"}</p>
          </div>
        )}
        {error && shown && (
          <div className="panel absolute bottom-3 left-3 z-30 max-w-[252px] px-3 py-2 text-[11px] text-warn">{error}</div>
        )}
      </main>
    </Tooltip.Provider>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="23" height="23" rx="6.5" fill="#151918" stroke="rgb(255 255 255 / 0.12)" />
      <path d="M12 12.5c0 3 .4 5.5 1.6 7.5" stroke="#efe6cf" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 12.5V8.2" stroke="#8fd16a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 8.4c-1.8-.2-3.3-1.2-3.8-3 1.9-.1 3.4.9 3.8 3Zm0 0c1.8-.2 3.3-1.2 3.8-3-1.9-.1-3.4.9-3.8 3Z" fill="#8fd16a" />
      <ellipse cx="12.4" cy="13" rx="2.2" ry="1.5" fill="#8a5a34" />
    </svg>
  );
}
