import { Pause, Play, RotateCcw } from "lucide-react";
import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { formatHours, PHASE_COLOURS, sampleAt } from "../format";
import { DURATION_H, useStore, type Metric } from "../store";
import type { Run, Sample } from "../types";
import { cx, Panel, Segmented, Tip } from "../ui";

type MetricDef = { label: string; unit: string; read: (s: Sample) => number; format: (v: number) => string };

export const METRICS: Record<Metric, MetricDef> = {
  germination: {
    label: "Germinated",
    unit: "%",
    read: (s) => s.germination_fraction,
    format: (v) => `${(v * 100).toFixed(0)}%`,
  },
  moisture: { label: "Water", unit: "%", read: (s) => s.moisture, format: (v) => `${(v * 100).toFixed(0)}%` },
  root: { label: "Root", unit: "mm", read: (s) => s.root_mm, format: (v) => `${v.toFixed(1)} mm` },
  respiration: { label: "Breathing", unit: "×", read: (s) => s.respiration_index, format: (v) => `${v.toFixed(2)}×` },
};

const HEIGHT = 92;
const PAD = { left: 30, right: 10, top: 8, bottom: 16 };

function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

export function Timeline({ runs }: { runs: Run[] }) {
  const timeH = useStore((s) => s.timeH);
  const setTime = useStore((s) => s.setTime);
  const playing = useStore((s) => s.playing);
  const togglePlay = useStore((s) => s.togglePlay);
  const setPlaying = useStore((s) => s.setPlaying);
  const speed = useStore((s) => s.speed);
  const setSpeed = useStore((s) => s.setSpeed);
  const metric = useStore((s) => s.metric);
  const setMetric = useStore((s) => s.setMetric);
  const focusId = useStore((s) => s.focusId);
  const focus = useStore((s) => s.focus);
  const [chartRef, width] = useWidth<HTMLDivElement>(560);

  const def = METRICS[metric];
  const fractional = metric === "germination" || metric === "moisture";
  const peak = fractional ? 1 : niceMax(Math.max(0, ...runs.flatMap((run) => run.samples.map(def.read))));
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const xOf = (t: number) => PAD.left + (t / DURATION_H) * innerW;
  const yOf = (v: number) => PAD.top + innerH - (v / peak) * innerH;
  const ordered = [...runs].sort((a, b) => Number(a.species_id === focusId) - Number(b.species_id === focusId));
  const focusRun = runs.find((run) => run.species_id === focusId) ?? runs[0];

  function scrub(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const t = ((event.clientX - rect.left - PAD.left) / innerW) * DURATION_H;
    setTime(t);
  }

  return (
    <Panel className="px-3 pt-2 pb-2.5">
      <div className="flex h-7 items-center gap-2">
        <Tip label={<span>{playing ? "Pause" : "Play"} <kbd className="font-mono text-[10px] text-fg-subtle">Space</kbd></span>} side="top">
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
            className="grid size-7 place-items-center rounded-full bg-fg text-ink-950 transition-transform hover:scale-105"
          >
            {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="translate-x-px" />}
          </button>
        </Tip>
        <Tip label="Back to sowing" side="top">
          <button
            type="button"
            aria-label="Back to sowing"
            onClick={() => setTime(0)}
            className="grid size-7 place-items-center rounded-md text-fg-muted hover:bg-white/6 hover:text-fg"
          >
            <RotateCcw size={13} />
          </button>
        </Tip>
        <div className="font-mono text-[11px] whitespace-nowrap tabular-nums" title={`${timeH.toFixed(0)} hours since sowing`}>
          <span className="text-fg">{formatHours(timeH)}</span>
        </div>
        <Segmented
          label="Playback speed"
          size="xs"
          value={String(speed)}
          onChange={(value) => setSpeed(Number(value))}
          options={[
            { value: "1", label: "1×", title: "Half a day per second" },
            { value: "2", label: "2×" },
            { value: "4", label: "4×" },
          ]}
        />
        <div className="flex-1" />
        <Segmented<Metric>
          label="Metric"
          size="xs"
          value={metric}
          onChange={setMetric}
          options={(Object.keys(METRICS) as Metric[]).map((key) => ({ value: key, label: METRICS[key].label }))}
        />
      </div>

      <div ref={chartRef} className="mt-1.5">
        <svg
          width={width}
          height={HEIGHT}
          className="block cursor-ew-resize touch-none select-none"
          role="slider"
          aria-label="Time since sowing"
          aria-valuemin={0}
          aria-valuemax={DURATION_H}
          aria-valuenow={Math.round(timeH)}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") setTime(timeH + (event.shiftKey ? 24 : 1));
            if (event.key === "ArrowLeft") setTime(timeH - (event.shiftKey ? 24 : 1));
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setPlaying(false);
            scrub(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) scrub(event);
          }}
        >
          {[0, 0.5, 1].map((u) => (
            <g key={u}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={yOf(u * peak)} y2={yOf(u * peak)} stroke="rgb(255 255 255 / 0.06)" />
              <text x={PAD.left - 6} y={yOf(u * peak) + 3} textAnchor="end" className="fill-fg-subtle font-mono text-[9px]">
                {fractional ? `${u * 100}` : +(u * peak).toPrecision(2)}
              </text>
            </g>
          ))}
          {Array.from({ length: DURATION_H / 24 + 1 }, (_, day) => (
            <g key={day}>
              <line x1={xOf(day * 24)} x2={xOf(day * 24)} y1={PAD.top} y2={PAD.top + innerH} stroke="rgb(255 255 255 / 0.04)" />
              <text x={xOf(day * 24)} y={HEIGHT - 4} textAnchor="middle" className="fill-fg-subtle font-mono text-[9px]">
                d{day}
              </text>
            </g>
          ))}
          {focusRun && <PhaseStrip run={focusRun} xOf={xOf} y={PAD.top + innerH + 1} />}
          {ordered.map((run) => {
            const focused = run.species_id === focusId;
            const d = run.samples
              .map((s, i) => `${i === 0 ? "M" : "L"}${xOf(s.time_h).toFixed(1)},${yOf(def.read(s)).toFixed(1)}`)
              .join("");
            return (
              <g key={run.species_id} opacity={focused ? 1 : 0.55}>
                <path d={d} fill="none" stroke={run.display.accent} strokeWidth={focused ? 1.75 : 1.1} strokeLinejoin="round" />
                {metric === "germination" && run.t50_h !== null && run.t50_h <= DURATION_H && (
                  <circle cx={xOf(run.t50_h)} cy={yOf(0.5)} r={2.5} fill={run.display.accent} stroke="#0a0c0b" strokeWidth={1}>
                    <title>{`${run.common_name}: half the seeds sprouted at ${run.t50_h.toFixed(0)} h`}</title>
                  </circle>
                )}
              </g>
            );
          })}
          <line x1={xOf(timeH)} x2={xOf(timeH)} y1={PAD.top - 4} y2={PAD.top + innerH + 4} stroke="#e7ebe7" strokeWidth={1} />
          <circle cx={xOf(timeH)} cy={PAD.top - 4} r={3} fill="#e7ebe7" />
          {runs.map((run) => {
            const value = def.read(sampleAt(run.samples, timeH));
            return <circle key={run.species_id} cx={xOf(timeH)} cy={yOf(value)} r={2.5} fill={run.display.accent} stroke="#0a0c0b" strokeWidth={1} />;
          })}
        </svg>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[30px]">
        {runs.map((run) => {
          const value = def.read(sampleAt(run.samples, timeH));
          const focused = run.species_id === focusId;
          return (
            <button
              key={run.species_id}
              type="button"
              onClick={() => focus(run.species_id)}
              className={cx("flex items-center gap-1.5 text-[10.5px]", focused ? "text-fg" : "text-fg-subtle hover:text-fg-muted")}
            >
              <span className="h-0.5 w-2.5 rounded-full" style={{ background: run.display.accent }} />
              {run.common_name}
              <span className="font-mono tabular-nums">{def.format(value)}</span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function PhaseStrip({ run, xOf, y }: { run: Run; xOf: (t: number) => number; y: number }) {
  const segments: { phase: Sample["phase"]; start: number; end: number }[] = [];
  for (const sample of run.samples) {
    const last = segments[segments.length - 1];
    if (last && last.phase === sample.phase) last.end = sample.time_h;
    else {
      if (last) last.end = sample.time_h;
      segments.push({ phase: sample.phase, start: sample.time_h, end: sample.time_h });
    }
  }
  return (
    <g>
      {segments.map((segment) => (
        <rect
          key={`${segment.phase}-${segment.start}`}
          x={xOf(segment.start)}
          y={y}
          width={Math.max(0, xOf(segment.end) - xOf(segment.start))}
          height={2}
          rx={1}
          fill={PHASE_COLOURS[segment.phase]}
          opacity={0.75}
        />
      ))}
    </g>
  );
}
