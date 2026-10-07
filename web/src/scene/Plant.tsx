import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Points,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";
import type { Display, Sample } from "../types";
import {
  clamp01,
  hypocotylPath,
  mulberry32,
  plantPose,
  radiclePath,
  radicleRadius,
  rootHairSegments,
  scaleBarMm,
  type Vec3,
} from "./geometry";
import { calloutBus } from "./callouts";
import { taperedTube } from "./tube";

/** Seed outline as half-extents relative to half the seed length. */
const SEED_SHAPE: Record<string, Vec3> = {
  arabidopsis: [1, 0.64, 0.5],
  lettuce: [1, 0.32, 0.22],
  radish: [1, 0.86, 0.8],
};
const COTYLEDON_SHAPE: Record<string, [number, number]> = {
  arabidopsis: [0.62, 0.5],
  lettuce: [0.46, 0.56],
  radish: [0.82, 0.48],
};
const LEAF_GREEN = new Color("#5f9d3e");
const ROOT_CREAM = new Color("#efe6cf");

type Props = {
  id: string;
  name: string;
  display: Display;
  sample: Sample;
  uptake: number;
  x: number;
  z: number;
  focused: boolean;
  view: { water: boolean; labels: boolean; xray: boolean; scale: boolean; section: boolean };
  onFocus: () => void;
};

export function Plant({ id, name, display, sample, uptake, x, z, focused, view, onFocus }: Props) {
  const pose = plantPose(display, sample);
  const [hovered, setHovered] = useState(false);
  const shape = SEED_SHAPE[id] ?? SEED_SHAPE.arabidopsis;
  const half = pose.seedLength / 2;
  const seedScale: Vec3 = [half * shape[0] * pose.swell, half * shape[1] * pose.swell, half * shape[2] * pose.swell];
  const rootR = radicleRadius(pose.seedLength);

  const radicle = useMemo(() => {
    if (pose.radicleLength <= 1e-3) return null;
    const points = radiclePath(pose.seedLength, pose.radicleLength).map(
      ([px, py, pz]) => [px, py + pose.seedY, pz] as Vec3,
    );
    return { points, geometry: taperedTube(points, rootR), hairs: rootHairSegments(points, rootR * 0.9, id.length * 13) };
  }, [pose.radicleLength, pose.seedLength, pose.seedY, rootR, id]);

  const shoot = useMemo(() => {
    if (pose.hypocotylLength <= 1e-3) return null;
    const origin: Vec3 = [pose.seedLength * 0.3, pose.seedY + pose.seedLength * 0.05, 0];
    const path = hypocotylPath(origin, pose.hypocotylLength, pose.hookOpen);
    return { ...path, geometry: taperedTube(path.points, rootR * 1.25) };
  }, [pose.hypocotylLength, pose.hookOpen, pose.seedLength, pose.seedY, rootR]);

  const hairGeometry = useMemo(() => {
    if (!radicle || radicle.hairs.length === 0) return null;
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(radicle.hairs, 3));
    return geometry;
  }, [radicle]);

  useEffect(() => () => radicle?.geometry?.dispose(), [radicle]);
  useEffect(() => () => shoot?.geometry?.dispose(), [shoot]);
  useEffect(() => () => hairGeometry?.dispose(), [hairGeometry]);

  const stemColour = useMemo(
    () => new Color(display.embryo).lerp(new Color(display.stem), pose.greening),
    [display.embryo, display.stem, pose.greening],
  );
  const leafColour = useMemo(
    () => new Color(display.embryo).lerp(LEAF_GREEN, pose.greening),
    [display.embryo, pose.greening],
  );

  const cotyledonFrame = useMemo(() => {
    if (!shoot || !pose.cotyledonsOut) return null;
    const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...shoot.tangent).normalize());
    return { quaternion, tip: shoot.tip };
  }, [shoot, pose.cotyledonsOut]);

  const [leafW, leafT] = COTYLEDON_SHAPE[id] ?? COTYLEDON_SHAPE.arabidopsis;
  const spread = 0.12 + pose.cotyledonOpen * 1.15;
  const L = pose.cotyledonSize;

  const shootTop = cotyledonFrame ? cotyledonFrame.tip[1] + L * pose.hookOpen : 0;
  const nameHeight = Math.max(0.2, shootTop + 0.14);
  const coatOpacity = view.xray ? 0.28 : 1;

  const anchors =
    view.labels && focused
      ? partAnchors({
          seedTop: [-half * 0.3, pose.seedY + seedScale[1] * 0.8, seedScale[2] * 0.5],
          radicle: radicle?.points ?? null,
          hasHairs: hairGeometry !== null,
          shoot,
          hookOpen: pose.hookOpen,
          cotyledonTip: cotyledonFrame ? cotyledonFrame.tip : null,
          leafLength: L,
        })
      : [];
  const anchorKey = anchors.map((a) => `${a.key}:${a.at.map((v) => v.toFixed(3)).join(",")}`).join("|");
  useLayoutEffect(() => {
    if (!focused) return;
    calloutBus.anchors = anchors.map((a) => ({ key: a.key, text: a.text, world: [a.at[0] + x, a.at[1], a.at[2] + z] }));
    // anchorKey is the stable serialization of anchors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorKey, focused, x, z]);
  useLayoutEffect(
    () => () => {
      if (focused) calloutBus.anchors = [];
    },
    [focused],
  );

  return (
    <group
      position={[x, 0, z]}
      onClick={(event) => {
        event.stopPropagation();
        onFocus();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      <group position={[0, pose.seedY, 0]} rotation={[0, 0, id === "lettuce" ? 0.25 : 0.1]}>
        <mesh scale={seedScale} castShadow>
          <sphereGeometry args={[1, 40, 28]} />
          <meshPhysicalMaterial
            color={display.coat}
            roughness={0.42}
            clearcoat={0.5}
            clearcoatRoughness={0.4}
            sheen={0.4}
            sheenColor="#ffffff"
            transparent={view.xray}
            opacity={coatOpacity}
            depthWrite={!view.xray}
          />
        </mesh>
        {view.xray && (
          <mesh scale={[seedScale[0] * 0.78, seedScale[1] * 0.7, seedScale[2] * 0.7]}>
            <sphereGeometry args={[1, 32, 20]} />
            <meshStandardMaterial
              color={display.embryo}
              emissive={display.embryo}
              emissiveIntensity={0.15 + 0.35 * clamp01(sample.respiration_index / 3)}
              roughness={0.6}
            />
          </mesh>
        )}
        {focused && (
          <mesh scale={[seedScale[0] * 1.6, seedScale[1] * 1.6, 1]} position={[0, 0, -0.01]}>
            <ringGeometry args={[0.92, 1, 64]} />
            <meshBasicMaterial color={display.accent} transparent opacity={hovered ? 0.8 : 0.45} />
          </mesh>
        )}
      </group>

      {radicle?.geometry && (
        <mesh geometry={radicle.geometry} castShadow>
          <meshPhysicalMaterial color={ROOT_CREAM} roughness={0.5} sheen={0.6} sheenColor="#fff7e6" transmission={0} />
        </mesh>
      )}
      {hairGeometry && (
        <lineSegments geometry={hairGeometry}>
          <lineBasicMaterial color="#fffaf0" transparent opacity={0.6} />
        </lineSegments>
      )}

      {shoot?.geometry && (
        <mesh geometry={shoot.geometry} castShadow>
          <meshPhysicalMaterial color={stemColour} roughness={0.45} sheen={0.3} clearcoat={0.2} />
        </mesh>
      )}

      {cotyledonFrame && (
        <group position={cotyledonFrame.tip} quaternion={cotyledonFrame.quaternion}>
          {[-1, 1].map((side) => (
            <group key={side} rotation={[0, 0, side * spread * 0.5]}>
              <mesh position={[0, L * 0.5, side * 0.002]} scale={[L * leafW * 0.5, L * 0.5, L * leafT * 0.12]} castShadow>
                <sphereGeometry args={[1, 32, 20]} />
                <meshPhysicalMaterial color={leafColour} roughness={0.5} clearcoat={0.35} sheen={0.3} sheenColor="#e8ffd0" />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {view.water && (
        <WaterFlow
          seedY={pose.seedY}
          seedRadius={seedScale[0]}
          radicle={radicle?.points ?? null}
          intensity={uptake}
        />
      )}

      {view.scale && view.section && <ScaleBar unitsPerMm={pose.unitsPerMm} x={0.52} />}

      {view.labels && (
        <Html position={[0, nameHeight, 0]} zIndexRange={[20, 0]}>
          <div className="scene-name -translate-y-full">
            <div
              className={
                focused
                  ? "rounded-md border border-line-strong bg-ink-900/80 px-2 py-0.5 text-[11px] font-semibold text-fg backdrop-blur"
                  : "px-2 py-0.5 text-[11px] font-medium text-fg-muted"
              }
            >
              {name}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

type PartAnchor = { key: string; at: Vec3; text: string };

function partAnchors({
  seedTop,
  radicle,
  hasHairs,
  shoot,
  hookOpen,
  cotyledonTip,
  leafLength,
}: {
  seedTop: Vec3;
  radicle: Vec3[] | null;
  hasHairs: boolean;
  shoot: { points: Vec3[]; tip: Vec3; tangent: Vec3 } | null;
  hookOpen: number;
  cotyledonTip: Vec3 | null;
  leafLength: number;
}): PartAnchor[] {
  const tags: PartAnchor[] = [{ key: "coat", at: seedTop, text: "Seed coat" }];
  if (radicle && radicle.length > 3) {
    tags.push({ key: "radicle", at: radicle[Math.floor(radicle.length * 0.3)], text: "Radicle" });
    if (hasHairs) {
      tags.push({ key: "hairs", at: radicle[Math.floor(radicle.length * 0.82)], text: "Root hairs" });
    }
  }
  if (shoot && shoot.points.length > 4) {
    tags.push({ key: "hypo", at: shoot.points[Math.floor(shoot.points.length * 0.4)], text: "Hypocotyl" });
    if (hookOpen < 0.5 && shoot.points.length > 12) {
      tags.push({ key: "hook", at: shoot.points[shoot.points.length - 6], text: "Apical hook" });
    }
  }
  if (cotyledonTip && shoot) {
    const [tx, ty] = shoot.tangent;
    tags.push({
      key: "cot",
      at: [cotyledonTip[0] + tx * leafLength * 0.5, cotyledonTip[1] + ty * leafLength * 0.5, cotyledonTip[2]],
      text: "Cotyledons",
    });
  }
  return tags;
}

function ScaleBar({ unitsPerMm, x }: { unitsPerMm: number; x: number }) {
  const mm = scaleBarMm(unitsPerMm);
  const length = mm * unitsPerMm;
  const top = -0.18;
  return (
    <group position={[x, top, 0.03]}>
      <mesh position={[0, -length / 2, 0]}>
        <boxGeometry args={[0.006, length, 0.002]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
      {[0, -length].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[0.04, 0.004, 0.002]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </mesh>
      ))}
      <Html position={[0.03, -length / 2, 0]} zIndexRange={[20, 0]}>
        <div className="-translate-y-1/2 font-mono text-[10px] whitespace-nowrap text-fg">{mm} mm</div>
      </Html>
    </group>
  );
}

const PARTICLES = 90;

function WaterFlow({
  seedY,
  seedRadius,
  radicle,
  intensity,
}: {
  seedY: number;
  seedRadius: number;
  radicle: Vec3[] | null;
  intensity: number;
}) {
  const ref = useRef<Points>(null);
  const seeds = useMemo(() => {
    const rand = mulberry32(5);
    return Array.from({ length: PARTICLES }, () => ({
      phase: rand(),
      speed: 0.35 + rand() * 0.4,
      dir: new Vector3(rand() - 0.5, rand() - 0.5, (rand() - 0.5) * 0.4).normalize(),
      along: rand(),
    }));
  }, []);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(PARTICLES * 3), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(PARTICLES * 3), 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const target = useRef(new Vector3());
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const positions = geometry.attributes.position as BufferAttribute;
    const colours = geometry.attributes.color as BufferAttribute;
    for (let i = 0; i < PARTICLES; i += 1) {
      const p = seeds[i];
      const toRoot = radicle && radicle.length > 2 && i % 3 !== 0;
      if (toRoot) {
        const point = radicle![Math.min(radicle!.length - 1, Math.floor(p.along * radicle!.length))];
        target.current.set(point[0], point[1], point[2]);
      } else {
        target.current.set(0, seedY, 0);
      }
      const cycle = (t * p.speed + p.phase) % 1;
      const reach = (toRoot ? 0.16 : seedRadius * 3.2 + 0.05) * (1 - cycle);
      const radius = (toRoot ? 0.012 : seedRadius) + reach;
      positions.setXYZ(
        i,
        target.current.x + p.dir.x * radius,
        Math.min(-0.01, target.current.y + p.dir.y * radius),
        target.current.z + p.dir.z * radius + 0.02,
      );
      const fade = Math.sin(cycle * Math.PI) * intensity;
      colours.setXYZ(i, 0.25 * fade, 0.6 * fade, 1.0 * fade);
    }
    positions.needsUpdate = true;
    colours.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.014}
        map={dropletSprite()}
        vertexColors
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

let sprite: CanvasTexture | null = null;

function dropletSprite(): CanvasTexture {
  if (sprite) return sprite;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.7)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  sprite = new CanvasTexture(canvas);
  sprite.colorSpace = SRGBColorSpace;
  return sprite;
}
