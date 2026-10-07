import { Edges } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, DodecahedronGeometry, InstancedMesh, MeshStandardMaterial, Object3D, type Texture } from "three";
import { mulberry32, smoothstep, SOIL_DEPTH, SOIL_Z } from "./geometry";
import { soilSideTexture, soilTopTexture } from "./soilTexture";

type Props = { width: number; section: boolean; dryness: number };

function repeated(texture: Texture, x: number, y: number): Texture {
  const copy = texture.clone();
  copy.repeat.set(x, y);
  copy.needsUpdate = true;
  return copy;
}

export function SoilBlock({ width, section, dryness }: Props) {
  const depth = section ? SOIL_Z / 2 : SOIL_Z;
  const centreZ = section ? -depth / 2 : 0;
  const wetness = 1 - smoothstep(0, 0.9, dryness);

  const textures = useMemo(() => ({ side: soilSideTexture(), top: soilTopTexture() }), []);
  const materials = useMemo(() => {
    const unit = 2.2;
    const make = (map: Texture) =>
      new MeshStandardMaterial({ map, roughness: 0.95, metalness: 0, envMapIntensity: 0.6 });
    return {
      front: make(repeated(textures.side, width / unit, SOIL_DEPTH / unit)),
      side: make(repeated(textures.side, depth / unit, SOIL_DEPTH / unit)),
      top: make(repeated(textures.top, width / unit, depth / unit)),
      bottom: new MeshStandardMaterial({ color: "#2a1f17", roughness: 1 }),
    };
  }, [textures, width, depth]);

  useLayoutEffect(() => {
    const tint = new Color().setRGB(0.72 + 0.3 * (1 - wetness), 0.7 + 0.28 * (1 - wetness), 0.68 + 0.25 * (1 - wetness));
    for (const material of Object.values(materials)) {
      if (material.map) material.color.copy(tint);
      material.roughness = 0.68 + 0.32 * (1 - wetness);
    }
  }, [materials, wetness]);

  useLayoutEffect(
    () => () => {
      for (const material of Object.values(materials)) {
        material.map?.dispose();
        material.dispose();
      }
    },
    [materials],
  );

  const faces = [materials.side, materials.side, materials.top, materials.bottom, materials.front, materials.front];

  return (
    <group>
      <mesh position={[0, -SOIL_DEPTH / 2, centreZ]} material={faces} receiveShadow castShadow>
        <boxGeometry args={[width, SOIL_DEPTH, depth]} />
        <Edges threshold={20} color="#ffffff" transparent opacity={0.12} />
      </mesh>
      <Pebbles width={width} depth={depth} centreZ={centreZ} />
      {wetness > 0.55 && (
        <mesh position={[0, 0.0015, centreZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, depth]} />
          <meshPhysicalMaterial
            color="#1d150f"
            transparent
            opacity={0.35 * (wetness - 0.55) * 2.2}
            roughness={0.25}
            clearcoat={1}
            clearcoatRoughness={0.3}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

const pebbleGeometry = new DodecahedronGeometry(1, 0);

function Pebbles({ width, depth, centreZ }: { width: number; depth: number; centreZ: number }) {
  const ref = useRef<InstancedMesh>(null);
  const count = Math.round(width * 22);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rand = mulberry32(19);
    const dummy = new Object3D();
    const colour = new Color();
    const frontZ = centreZ + depth / 2;
    for (let i = 0; i < count; i += 1) {
      const onTop = i % 4 === 0;
      const r = onTop ? 0.006 + rand() * 0.014 : 0.008 + rand() * 0.026;
      if (onTop) {
        dummy.position.set((rand() - 0.5) * (width - 0.06), r * 0.3, centreZ + (rand() - 0.5) * (depth - 0.06));
      } else {
        dummy.position.set((rand() - 0.5) * (width - 0.08), -0.08 - rand() * (SOIL_DEPTH - 0.16), frontZ - r * 0.45);
      }
      dummy.rotation.set(rand() * 6, rand() * 6, rand() * 6);
      dummy.scale.set(r, r * (0.55 + rand() * 0.4), r * (0.7 + rand() * 0.3));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const shade = 0.16 + rand() * 0.22;
      colour.setRGB(shade * 1.1, shade * 0.9, shade * 0.72);
      mesh.setColorAt(i, colour);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, width, depth, centreZ]);

  return (
    <instancedMesh ref={ref} args={[pebbleGeometry, undefined, count]} castShadow receiveShadow key={count}>
      <meshStandardMaterial roughness={0.9} flatShading envMapIntensity={0.15} />
    </instancedMesh>
  );
}
