export type Anchor = { key: string; text: string; x: number; y: number };
export type PlacedCallout = Anchor & { lx: number; ly: number };

/**
 * Textbook-style callouts: labels stacked in a column to the right of their
 * anchors, ordered by height, nudged apart so none overlap, with the column
 * kept as close to the anchors' own heights as possible.
 */
export function layoutCallouts(anchors: Anchor[], gap = 22, offset = 64): PlacedCallout[] {
  if (anchors.length === 0) return [];
  const sorted = [...anchors].sort((a, b) => a.y - b.y);
  const column = Math.max(...sorted.map((a) => a.x)) + offset;
  const ys = sorted.map((a) => a.y);
  for (let i = 1; i < ys.length; i += 1) ys[i] = Math.max(ys[i], ys[i - 1] + gap);
  const drift = ys.reduce((sum, y, i) => sum + (y - sorted[i].y), 0) / ys.length;
  for (let i = 0; i < ys.length; i += 1) ys[i] -= drift;
  for (let i = ys.length - 2; i >= 0; i -= 1) ys[i] = Math.min(ys[i], ys[i + 1] - gap);
  return sorted.map((anchor, i) => ({ ...anchor, lx: column, ly: ys[i] }));
}

export type WorldCallout = { key: string; text: string; world: [number, number, number] };

type Listener = (placed: PlacedCallout[]) => void;

/** Hand-off between the 3D scene, which knows where parts are, and the DOM overlay that draws labels. */
export const calloutBus = {
  anchors: [] as WorldCallout[],
  listeners: new Set<Listener>(),
  publish(placed: PlacedCallout[]) {
    for (const listener of this.listeners) listener(placed);
  },
};
