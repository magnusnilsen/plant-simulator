import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { taperProfile, type Vec3 } from "./geometry";

/**
 * TubeGeometry with a radius that varies along the curve. Three's tube has a
 * constant radius, so the ring vertices are pushed in or out after building.
 */
export function taperedTube(points: Vec3[], baseRadius: number, radialSegments = 10): TubeGeometry | null {
  if (points.length < 2) return null;
  const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)), false, "centripetal");
  const length = curve.getLength();
  if (!Number.isFinite(length) || length < 1e-4) return null;
  const tubular = Math.max(8, Math.min(160, Math.ceil(length / 0.012)));
  const geometry = new TubeGeometry(curve, tubular, 1, radialSegments, false);
  const position = geometry.attributes.position;
  const centre = new Vector3();
  const vertex = new Vector3();
  for (let i = 0; i <= tubular; i += 1) {
    const u = i / tubular;
    curve.getPointAt(u, centre);
    const radius = taperProfile(u, baseRadius);
    for (let j = 0; j <= radialSegments; j += 1) {
      const index = i * (radialSegments + 1) + j;
      vertex.fromBufferAttribute(position, index).sub(centre).multiplyScalar(radius).add(centre);
      position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
