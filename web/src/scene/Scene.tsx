import { CameraControls, ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { sampleAt } from "../format";
import { useStore } from "../store";
import type { Run } from "../types";
import {
  blockWidth,
  clamp01,
  frameBox,
  MAX_HYPOCOTYL,
  plantPose,
  plantX,
  PLANT_Z,
  smoothstep,
  SOIL_DEPTH,
  uptakeIntensity,
} from "./geometry";
import { CalloutProjector } from "./CalloutLayer";
import { Plant } from "./Plant";
import { SoilBlock } from "./SoilBlock";

type Props = { runs: Run[] };

export function Scene({ runs }: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [4, 1.5, 12], fov: FOV, near: 0.01, far: 100 }}
      onPointerMissed={() => undefined}
    >
      <Lights />
      <World runs={runs} />
      <CameraRig runs={runs} />
      <CalloutProjector />
    </Canvas>
  );
}

function Lights() {
  return (
    <>
      <hemisphereLight args={["#dfe9ff", "#3a2a1c", 0.55]} />
      <directionalLight
        position={[3.5, 6, 4.5]}
        intensity={2.1}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      <directionalLight position={[-5, 2, -4]} intensity={0.9} color="#9cc8ff" />
      <directionalLight position={[0, 0.5, 8]} intensity={0.7} color="#fff6ea" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 2]} scale={[10, 4, 1]} rotation-x={Math.PI / 2.5} color="#fff4e6" />
        <Lightformer form="rect" intensity={1.2} position={[-6, 1, 1]} scale={[4, 6, 1]} rotation-y={Math.PI / 2} color="#cfe3ff" />
        <Lightformer form="rect" intensity={0.8} position={[6, 1, -1]} scale={[4, 6, 1]} rotation-y={-Math.PI / 2} color="#ffe2c4" />
        <Lightformer form="ring" intensity={1.5} position={[0, 2, -6]} scale={3} color="#d8ffd0" />
      </Environment>
    </>
  );
}

function World({ runs }: Props) {
  const timeH = useStore((s) => s.timeH);
  const dryness = useStore((s) => s.dryness);
  const view = useStore((s) => s.view);
  const focusId = useStore((s) => s.focusId);
  const focus = useStore((s) => s.focus);
  const width = blockWidth(runs.length);
  const wetness = 1 - smoothstep(0, 0.9, dryness);

  return (
    <group>
      {view.soil ? (
        <SoilBlock width={width} section={view.section} dryness={dryness} />
      ) : (
        <GhostSoil width={width} />
      )}
      <ContactShadows position={[0, -SOIL_DEPTH - 0.002, 0]} scale={[width * 1.6, 4]} opacity={0.55} blur={2.6} far={1.2} resolution={512} color="#000000" />
      <group>
        {runs.map((run, index) => {
          const sample = sampleAt(run.samples, timeH);
          const before = sampleAt(run.samples, Math.max(0, timeH - 1));
          let uptake = uptakeIntensity(before.moisture, sample.moisture, 1);
          if (sample.root_mm > 0) uptake = Math.max(uptake, 0.3 * wetness);
          return (
            <Plant
              key={run.species_id}
              id={run.species_id}
              name={run.common_name}
              display={run.display}
              sample={sample}
              uptake={clamp01(uptake)}
              x={plantX(index, runs.length)}
              z={view.section || !view.soil ? PLANT_Z : 0}
              focused={run.species_id === focusId}
              view={view}
              onFocus={() => focus(run.species_id)}
            />
          );
        })}
      </group>
    </group>
  );
}

function GhostSoil({ width }: { width: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[width, 2]} />
        <meshBasicMaterial color="#c9b79a" transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <gridHelper args={[width, Math.round(width * 5), "#ffffff", "#ffffff"]} position={[0, 0.001, 0]} scale={[1, 1, 2 / width]}>
        <lineBasicMaterial attach="material" transparent opacity={0.06} />
      </gridHelper>
      <mesh position={[0, -SOIL_DEPTH / 2, 0]}>
        <boxGeometry args={[width, SOIL_DEPTH, 0.002]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.015} depthWrite={false} />
      </mesh>
    </group>
  );
}

const FOV = 30;
const PANEL_INSETS = { top: 64, right: 344, bottom: 196, left: 276 };

function CameraRig({ runs }: Props) {
  const ref = useRef<CameraControls>(null);
  const camera = useStore((s) => s.camera);
  const focusId = useStore((s) => s.focusId);
  const orbit = useStore((s) => s.view.orbit);
  const size = useThree((state) => state.size);
  const count = runs.length;
  const followId = camera.preset === "seed" ? focusId : null;

  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    if (camera.preset === "seed") {
      const index = Math.max(0, runs.findIndex((run) => run.species_id === focusId));
      const run = runs[index];
      const x = plantX(index, count);
      const seedY = run ? plantPose(run.display, run.samples[0]).seedY : -0.4;
      void controls.setLookAt(x + 0.35, seedY + 0.3, 1.7, x + 0.08, seedY - 0.1, 0, true);
      return;
    }
    const box = { width: blockWidth(count), bottom: -SOIL_DEPTH, top: MAX_HYPOCOTYL * 0.75 };
    const oblique = camera.preset === "overview";
    const frame = frameBox(box, size, PANEL_INSETS, FOV, oblique ? 0.98 : 0.95);
    const azimuth = oblique ? 0.42 : 0;
    const elevation = oblique ? 0.2 : 0;
    const d = frame.distance;
    const tx = frame.targetX * Math.cos(azimuth);
    const tz = -frame.targetX * Math.sin(azimuth);
    void controls.setLookAt(
      tx + d * Math.sin(azimuth) * Math.cos(elevation),
      frame.targetY + d * Math.sin(elevation),
      tz + d * Math.cos(azimuth) * Math.cos(elevation),
      tx,
      frame.targetY,
      tz,
      true,
    );
    // Re-frame only on preset clicks, close-up focus changes, layout changes, and plant count changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.nonce, camera.preset, count, followId, size.width, size.height]);

  useFrame((_, dt) => {
    if (orbit && ref.current) ref.current.rotate(dt * 0.12, 0, false);
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={0.6}
      maxDistance={40}
      maxPolarAngle={Math.PI * 0.62}
      smoothTime={0.5}
      draggingSmoothTime={0.12}
    />
  );
}
