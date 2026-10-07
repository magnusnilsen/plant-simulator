import type { Display, Sample } from "../types";

export type Vec3 = [number, number, number];

/** Scene units given to one species' typical root span. Each plant is drawn to its own scale. */
export const ROOT_UNITS = 1.0;
export const SOIL_DEPTH = 2.4;
export const SOIL_Z = 2.0;
export const PLANT_Z = 0.035;
export const PLANT_SPACING = 1.5;
export const MAX_HYPOCOTYL = 1.6;

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function unitsPerMm(display: Display): number {
  return ROOT_UNITS / display.root_span_mm;
}

export function blockWidth(count: number): number {
  return Math.max(1, count) * PLANT_SPACING + 0.8;
}

export type Insets = { top: number; right: number; bottom: number; left: number };

/**
 * Camera distance and target that frame a box in the part of the viewport
 * the floating panels leave free. Sizes are in world units and pixels.
 */
export function frameBox(
  box: { width: number; bottom: number; top: number },
  viewport: { width: number; height: number },
  insets: Insets,
  fovDeg: number,
  slack = 1.12,
): { distance: number; targetX: number; targetY: number } {
  const freeW = Math.max(viewport.width * 0.4, viewport.width - insets.left - insets.right);
  const freeH = Math.max(viewport.height * 0.45, viewport.height - insets.top - insets.bottom);
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const aspect = viewport.width / viewport.height;
  const needH = ((box.top - box.bottom) * slack * viewport.height) / freeH;
  const needW = (box.width * slack * viewport.width) / freeW;
  const distance = Math.max(needH / (2 * tanHalf), needW / (2 * tanHalf * aspect));
  const worldPerPx = (2 * tanHalf * distance) / viewport.height;
  const shiftX = ((insets.right - insets.left) / 2) * worldPerPx;
  const shiftY = ((insets.bottom - insets.top) / 2) * worldPerPx;
  return { distance, targetX: shiftX, targetY: (box.top + box.bottom) / 2 - shiftY };
}

export function plantX(index: number, count: number): number {
  return (index - (count - 1) / 2) * PLANT_SPACING;
}

export type PlantPose = {
  unitsPerMm: number;
  seedLength: number;
  seedY: number;
  hydration: number;
  swell: number;
  radicleLength: number;
  hypocotylLength: number;
  clearance: number;
  hookOpen: number;
  cotyledonOpen: number;
  greening: number;
  cotyledonsOut: boolean;
  cotyledonSize: number;
};

export function plantPose(display: Display, sample: Sample): PlantPose {
  const s = unitsPerMm(display);
  const seedLength = display.seed_length_mm * s;
  const seedY = -(display.sowing_depth_mm * s + seedLength * 0.35);
  const hydration = clamp01((sample.moisture - 0.08) / 0.54);
  const emerged = sample.median_progress >= 1;
  const roomBelow = SOIL_DEPTH + seedY - 0.12;
  const radicleLength = emerged
    ? Math.min(roomBelow, Math.max(seedLength * 0.3, sample.root_mm * s))
    : 0;
  const hypocotylLength = emerged ? Math.min(MAX_HYPOCOTYL, sample.hypocotyl_mm * s) : 0;
  // Epigeal germination: the hypocotyl carries the cotyledons up through the soil.
  const clearance = hypocotylLength + seedY;
  const greening = smoothstep(0, 0.35, clearance);
  return {
    unitsPerMm: s,
    seedLength,
    seedY,
    hydration,
    swell: 0.88 + 0.16 * hydration,
    radicleLength,
    hypocotylLength,
    clearance,
    hookOpen: smoothstep(0, 0.16, clearance),
    cotyledonOpen: smoothstep(0.05, 0.3, clearance),
    greening,
    cotyledonsOut: hypocotylLength > seedLength * 0.5,
    cotyledonSize: seedLength * 0.8 + (display.cotyledon_mm * s - seedLength * 0.8) * greening,
  };
}

/** Leaves the micropylar end of the seed, turns down under gravity, then grows on. */
export function radiclePath(seedLength: number, length: number): Vec3[] {
  const start: Vec3 = [seedLength * 0.42, -seedLength * 0.08, 0];
  const turn = Math.min(length, seedLength * 0.6 + 0.02);
  const radius = Math.max(1e-4, turn / (Math.PI / 2));
  const points: Vec3[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i += 1) {
    const phi = (i / steps) * (turn / radius);
    points.push([start[0] + radius * Math.sin(phi), start[1] - radius * (1 - Math.cos(phi)), 0]);
  }
  const rest = length - turn;
  if (rest > 1e-4) {
    const [x0, y0] = points[points.length - 1];
    const n = Math.max(2, Math.ceil(rest / 0.04));
    for (let i = 1; i <= n; i += 1) {
      const d = (i / n) * rest;
      points.push([x0 + 0.012 * Math.sin(d * 9), y0 - d, 0.01 * Math.sin(d * 6)]);
    }
  }
  return points;
}

export type ShootPath = { points: Vec3[]; tip: Vec3; tangent: Vec3 };

/** Straight shaft plus an apical hook that unbends once the shoot reaches light. */
export function hypocotylPath(origin: Vec3, length: number, hookOpen: number): ShootPath {
  const safe = Math.max(length, 1e-3);
  const theta = Math.PI * 0.9 * (1 - clamp01(hookOpen));
  let radius = Math.min(0.05, safe * 0.25);
  if (theta > 0 && radius * theta > safe * 0.7) radius = (safe * 0.7) / theta;
  const arc = radius * theta;
  const straight = safe - arc;
  const [ox, oy, oz] = origin;
  const points: Vec3[] = [];
  const n = Math.max(2, Math.ceil(straight / 0.04));
  for (let i = 0; i <= n; i += 1) {
    points.push([ox, oy + (straight * i) / n, oz]);
  }
  const arcSteps = 10;
  if (theta > 1e-3) {
    for (let i = 1; i <= arcSteps; i += 1) {
      const phi = (theta * i) / arcSteps;
      points.push([ox - radius + radius * Math.cos(phi), oy + straight + radius * Math.sin(phi), oz]);
    }
  }
  const tip = points[points.length - 1];
  const tangent: Vec3 = theta > 1e-3 ? [-Math.sin(theta), Math.cos(theta), 0] : [0, 1, 0];
  return { points, tip, tangent };
}

export function radicleRadius(seedLength: number): number {
  return Math.min(0.016, Math.max(0.005, seedLength * 0.13));
}

/** Tapered shaft with a rounded tip, for u from base (0) to tip (1). */
export function taperProfile(u: number, baseRadius: number): number {
  const tipStart = 0.94;
  const body = baseRadius * (1 - 0.35 * u);
  if (u < tipStart) return body;
  const k = (u - tipStart) / (1 - tipStart);
  return body * Math.sqrt(Math.max(0, 1 - k * k)) + 1e-4;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Root hairs sit in a band behind the tip: the youngest tissue is bare,
 * the zone just behind it is still elongating, and hairs grow behind that.
 */
export function rootHairSegments(points: Vec3[], baseRadius: number, seed = 7): Float32Array {
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) {
    cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]));
  }
  const total = cumulative[cumulative.length - 1];
  const zoneStart = 0.05;
  const zoneEnd = Math.min(total * 0.55, 0.6);
  if (total < 0.12 || zoneEnd <= zoneStart) return new Float32Array(0);
  const rand = mulberry32(seed);
  const count = Math.floor(260 * (zoneEnd - zoneStart));
  const out = new Float32Array(count * 6);
  for (let h = 0; h < count; h += 1) {
    const fromTip = zoneStart + rand() * (zoneEnd - zoneStart);
    const along = total - fromTip;
    let i = 1;
    while (i < cumulative.length - 1 && cumulative[i] < along) i += 1;
    const a = points[i - 1];
    const b = points[i];
    const span = cumulative[i] - cumulative[i - 1] || 1;
    const u = (along - cumulative[i - 1]) / span;
    const base: Vec3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    const t = normalize([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    const side = normalize(cross(t, [0, 0, 1]));
    const up = cross(t, side);
    const angle = rand() * Math.PI * 2;
    const dir: Vec3 = [
      side[0] * Math.cos(angle) + up[0] * Math.sin(angle),
      side[1] * Math.cos(angle) + up[1] * Math.sin(angle),
      side[2] * Math.cos(angle) + up[2] * Math.sin(angle),
    ];
    const young = smoothstep(zoneStart, zoneStart + 0.12, fromTip);
    const length = (0.012 + 0.022 * rand()) * young;
    const k = h * 6;
    out[k] = base[0] + dir[0] * baseRadius;
    out[k + 1] = base[1] + dir[1] * baseRadius;
    out[k + 2] = base[2] + dir[2] * baseRadius;
    out[k + 3] = base[0] + dir[0] * (baseRadius + length);
    out[k + 4] = base[1] + dir[1] * (baseRadius + length);
    out[k + 5] = base[2] + dir[2] * (baseRadius + length);
  }
  return out;
}

export function scaleBarMm(unitsPerMillimetre: number): number {
  const options = [0.5, 1, 2, 5, 10, 20];
  let pick = options[0];
  for (const mm of options) {
    if (mm * unitsPerMillimetre <= 0.42) pick = mm;
  }
  return pick;
}

/** Net water entering the seed or seedling, as 0–1 for the particle flow. */
export function uptakeIntensity(moistureBefore: number, moistureAfter: number, hours: number): number {
  if (hours <= 0) return 0;
  return clamp01(((moistureAfter - moistureBefore) / hours) * 6);
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
