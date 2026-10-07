import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { Vector3 } from "three";
import { calloutBus, layoutCallouts, type PlacedCallout } from "./callouts";

const scratch = new Vector3();

/** Lives inside the Canvas: projects part anchors to pixels every frame. */
export function CalloutProjector() {
  const size = useThree((state) => state.size);
  useFrame(({ camera }) => {
    const anchors = calloutBus.anchors.flatMap((item) => {
      scratch.set(...item.world).project(camera);
      if (scratch.z > 1) return [];
      return [
        {
          key: item.key,
          text: item.text,
          x: ((scratch.x + 1) / 2) * size.width,
          y: ((1 - scratch.y) / 2) * size.height,
        },
      ];
    });
    calloutBus.publish(layoutCallouts(anchors));
  });
  return null;
}

function same(a: PlacedCallout[], b: PlacedCallout[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (p, i) =>
      p.key === b[i].key &&
      Math.abs(p.x - b[i].x) < 0.3 &&
      Math.abs(p.y - b[i].y) < 0.3 &&
      Math.abs(p.ly - b[i].ly) < 0.3 &&
      Math.abs(p.lx - b[i].lx) < 0.3,
  );
}

/** Lives outside the Canvas: draws labels and leader lines in plain DOM/SVG. */
export function CalloutOverlay() {
  const [placed, setPlaced] = useState<PlacedCallout[]>([]);
  useEffect(() => {
    const listener = (next: PlacedCallout[]) => setPlaced((current) => (same(current, next) ? current : next));
    calloutBus.listeners.add(listener);
    return () => {
      calloutBus.listeners.delete(listener);
    };
  }, []);
  if (placed.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none" aria-hidden>
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {placed.map((p) => {
          const elbow = p.lx - 14;
          return (
            <g key={p.key}>
              <polyline
                points={`${p.x},${p.y} ${elbow},${p.ly} ${p.lx - 3},${p.ly}`}
                fill="none"
                stroke="rgb(231 235 231 / 0.55)"
                strokeWidth={1}
              />
              <circle cx={p.x} cy={p.y} r={2.5} fill="#e7ebe7" stroke="rgb(9 11 10 / 0.7)" strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>
      {placed.map((p) => (
        <div
          key={p.key}
          className="absolute rounded-md border border-line-strong bg-ink-900/80 px-1.5 py-px text-[10.5px] font-medium whitespace-nowrap text-fg backdrop-blur-sm"
          style={{ transform: `translate(${p.lx}px, ${p.ly}px) translateY(-50%)`, left: 0, top: 0 }}
        >
          {p.text}
        </div>
      ))}
    </div>
  );
}
