import type { PointerEvent } from "react";
import { sampleAt } from "./format";
import type { Run } from "./types";

const VB_W = 1200;
const VB_H = 460;
const GROUND = 250;
const PAD = 36;

type Props = {
  runs: Run[];
  timeH: number;
  durationH: number;
  onScrub: (timeH: number) => void;
};

export function Stage({ runs, timeH, durationH, onScrub }: Props) {
  function scrub(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * VB_W;
    const fraction = (x - PAD) / (VB_W - PAD * 2);
    onScrub(Math.min(1, Math.max(0, fraction)) * durationH);
  }

  return (
    <svg
      className="stage"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Cross-section of the seed and early seedling, with the germination curve in the soil"
      onPointerDown={scrub}
      onPointerMove={(event) => {
        if (event.buttons === 1) scrub(event);
      }}
    >
      <defs>
        <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d7c4a4" />
          <stop offset="0.45" stopColor="#b89a74" />
          <stop offset="1" stopColor="#7d6248" />
        </linearGradient>
        <pattern id="pores" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="1.1" fill="#6b513c" opacity="0.28" />
          <circle cx="12" cy="11" r="0.8" fill="#f3e6d2" opacity="0.35" />
        </pattern>
      </defs>
      <rect x="0" y={GROUND} width={VB_W} height={VB_H - GROUND} fill="url(#soil)" />
      <rect x="0" y={GROUND} width={VB_W} height={VB_H - GROUND} fill="url(#pores)" />
      <line x1="0" y1={GROUND} x2={VB_W} y2={GROUND} stroke="#5c4634" strokeWidth="2" />
      <GerminationCurve runs={runs} durationH={durationH} timeH={timeH} />
      {runs.map((run, index) => (
        <Plant
          key={run.species_id}
          run={run}
          index={index}
          count={runs.length}
          timeH={timeH}
        />
      ))}
    </svg>
  );
}

function GerminationCurve({
  runs,
  durationH,
  timeH,
}: {
  runs: Run[];
  durationH: number;
  timeH: number;
}) {
  const top = GROUND + 36;
  const bottom = VB_H - 36;
  const playX = PAD + (timeH / durationH) * (VB_W - PAD * 2);
  return (
    <g aria-hidden="true">
      <text x={PAD} y={top - 10} fill="#3e2e22" fontSize="13" fontFamily="Syne, sans-serif">
        germinated
      </text>
      {runs.map((run) => {
        const points = run.samples
          .map((sample) => {
            const x = PAD + (sample.time_h / durationH) * (VB_W - PAD * 2);
            const y = bottom - sample.germination_fraction * (bottom - top);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");
        return (
          <polyline
            key={run.species_id}
            points={points}
            fill="none"
            stroke={run.display.accent}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}
      <line x1={playX} y1={top - 6} x2={playX} y2={bottom} stroke="#1a2b22" strokeWidth="1.5" />
    </g>
  );
}

function Plant({
  run,
  index,
  count,
  timeH,
}: {
  run: Run;
  index: number;
  count: number;
  timeH: number;
}) {
  const sample = sampleAt(run.samples, timeH);
  const slot = VB_W / count;
  const cx = slot * index + slot / 2;
  const scale = count === 1 ? 1 : 0.78;
  const hypoPx = Math.min(188, (sample.hypocotyl_mm / run.display.hypocotyl_span_mm) * 180) * scale;
  const rootPx = Math.min(150, (sample.root_mm / run.display.root_span_mm) * 140) * scale;
  const seedY = GROUND - 36 * scale - hypoPx;
  const swell = 0.82 + sample.moisture * 0.45;
  const buried = sample.phase === "imbibition" || sample.phase === "activation" || sample.phase === "blocked";

  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="rotate"
        values={`-0.6 ${cx} ${GROUND};0.7 ${cx} ${GROUND};-0.6 ${cx} ${GROUND}`}
        dur="6.5s"
        repeatCount="indefinite"
      />
      {rootPx > 1 && (
        <path
          d={`M ${cx} ${seedY + 28 * scale} C ${cx - 8} ${seedY + 28 * scale + rootPx * 0.45}, ${cx + 10} ${seedY + 28 * scale + rootPx * 0.7}, ${cx - 4} ${seedY + 28 * scale + rootPx}`}
          fill="none"
          stroke="#5c3b28"
          strokeWidth={9 * scale}
          strokeLinecap="round"
        />
      )}
      {hypoPx > 2 && (
        <line
          x1={cx}
          y1={seedY + 20 * scale}
          x2={cx}
          y2={GROUND}
          stroke="#6d8f4e"
          strokeWidth={8 * scale}
          strokeLinecap="round"
        />
      )}
      <g transform={`translate(${cx} ${seedY}) scale(${(swell * scale).toFixed(3)})`}>
        <ellipse cx="0" cy="0" rx={buried ? 52 : 18} ry={buried ? 70 : 16} fill={run.display.coat} />
        {buried && <ellipse cx="0" cy="4" rx={32} ry={44} fill={run.display.embryo} />}
        {buried && (
          <path
            d="M -8 28 C -10 8, -4 -12, 0 -28 C 4 -8, 8 10, 6 30"
            fill="none"
            stroke="#5c3b28"
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
        {!buried && (
          <>
            <g transform="translate(-34 -6) rotate(-36)">
              <ellipse cx="0" cy="0" rx="34" ry="14" fill="#c5d48a" />
            </g>
            <g transform="translate(34 -6) rotate(36)">
              <ellipse cx="0" cy="0" rx="34" ry="14" fill="#7ea24a" />
            </g>
          </>
        )}
      </g>
      <text
        x={cx}
        y={VB_H - 12}
        textAnchor="middle"
        fill="#2a2118"
        fontSize="15"
        fontFamily="Syne, sans-serif"
      >
        {run.common_name}
      </text>
    </g>
  );
}
