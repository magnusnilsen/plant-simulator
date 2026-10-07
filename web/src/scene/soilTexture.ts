import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { mulberry32 } from "./geometry";

/** Layered soil profile: darker humus at the top, paler mineral soil below, grain and pebbles throughout. */
export function soilSideTexture(seed = 3): CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "#4a3527");
  gradient.addColorStop(0.08, "#5e4530");
  gradient.addColorStop(0.45, "#715639");
  gradient.addColorStop(1, "#836846");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const rand = mulberry32(seed);
  for (let band = 0; band < 7; band += 1) {
    const y = rand() * size;
    ctx.fillStyle = `rgba(${rand() > 0.5 ? "20,12,8" : "120,96,70"},0.08)`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + band) * 6 + rand() * 4);
    ctx.lineTo(size, y + 18 + rand() * 30);
    ctx.lineTo(0, y + 18 + rand() * 30);
    ctx.fill();
  }
  for (let i = 0; i < 9000; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const light = rand() > 0.55;
    ctx.fillStyle = light ? `rgba(160,132,98,${0.06 + rand() * 0.1})` : `rgba(18,10,6,${0.12 + rand() * 0.2})`;
    const r = rand() * 1.4 + 0.3;
    ctx.fillRect(x, y, r, r);
  }
  for (let i = 0; i < 70; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1.5 + rand() * 4;
    ctx.fillStyle = `rgba(${110 + rand() * 40},${92 + rand() * 30},${70 + rand() * 24},0.4)`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(10,6,4,0.25)";
    ctx.beginPath();
    ctx.ellipse(x + r * 0.25, y + r * 0.35, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(canvas);
}

export function soilTopTexture(seed = 11): CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#3b2b20";
  ctx.fillRect(0, 0, size, size);
  const rand = mulberry32(seed);
  for (let i = 0; i < 1400; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1 + rand() * 5;
    ctx.fillStyle = rand() > 0.5 ? `rgba(78,58,42,${0.4 + rand() * 0.4})` : `rgba(28,18,12,${0.3 + rand() * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 8000; i += 1) {
    ctx.fillStyle = rand() > 0.5 ? "rgba(120,96,70,0.12)" : "rgba(10,6,4,0.2)";
    ctx.fillRect(rand() * size, rand() * size, 1, 1);
  }
  return finish(canvas);
}

function finish(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
