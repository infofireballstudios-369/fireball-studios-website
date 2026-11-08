/**
 * Offline studio still of the actual vehicle embedded in the supplied configurator.
 * Uses its original geometry and OEM wheels, with simplified studio illumination.
 * This is a model render, not a screenshot of the interactive configurator.
 *
 * node scripts/render-configurator-poster.mjs [path/to/fireball-car-configurator2.html]
 * Requires only the project's existing sharp dependency. No browser or network.
 * Original model attribution and licence remain in the source HTML.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2] ?? path.resolve(root, "../Projects/Edited-2/fireball-car-configurator2.html");
const output = path.join(root, "public/posters/car-configurator.webp");
const html = await fs.readFile(source, "utf8");
const embedded = html.match(/<script id="fb-vehicle-data"[^>]*>([\s\S]*?)<\/script>/)?.[1];
if (!embedded) throw new Error("The supplied HTML has no embedded vehicle model.");
const glb = gunzipSync(Buffer.from(embedded.trim(), "base64"));
if (glb.readUInt32LE(0) !== 0x46546c67 || glb.readUInt32LE(4) !== 2) {
  throw new Error("Expected a glTF 2 binary model.");
}
let document, binary;
for (let offset = 12; offset < glb.length;) {
  const length = glb.readUInt32LE(offset);
  const type = glb.readUInt32LE(offset + 4);
  const data = glb.subarray(offset + 8, offset + 8 + length);
  if (type === 0x4e4f534a) document = JSON.parse(data.toString("utf8"));
  if (type === 0x004e4942) binary = data;
  offset += 8 + length;
}
if (!document || !binary) throw new Error("The vehicle GLB is incomplete.");

function accessor(index) {
  const item = document.accessors[index];
  if (item.sparse) throw new Error("Sparse accessors are not supported by this renderer.");
  const view = document.bufferViews[item.bufferView];
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[item.type];
  const formats = { 5121: [1, "readUInt8"], 5123: [2, "readUInt16LE"], 5125: [4, "readUInt32LE"], 5126: [4, "readFloatLE"] };
  const format = formats[item.componentType];
  if (!format || !components) throw new Error("Unsupported accessor format.");
  const [bytes, read] = format;
  const stride = view.byteStride ?? components * bytes;
  const start = (view.byteOffset ?? 0) + (item.byteOffset ?? 0);
  const values = item.type === "SCALAR" ? new Uint32Array(item.count) : new Float32Array(item.count * components);
  for (let i = 0; i < item.count; i++) {
    for (let c = 0; c < components; c++) values[i * components + c] = binary[read](start + i * stride + c * bytes);
  }
  return values;
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const subtract = (a, b) => a.map((v, i) => v - b[i]);
const normalise = (v) => { const length = Math.hypot(...v); return v.map((x) => x / (length || 1)); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const clamp = (value) => Math.max(0, Math.min(1, value));
const linearColour = (hex) => [1, 3, 5].map((start) => {
  const value = parseInt(hex.slice(start, start + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
});
const display = (value) => {
  const mapped = clamp((value * (2.51 * value + 0.03)) / (value * (2.43 * value + 0.59) + 0.14));
  return 255 * (mapped <= 0.0031308 ? 12.92 * mapped : 1.055 * mapped ** (1 / 2.4) - 0.055);
};

// Material names and paint colour follow the original configurator's default palette.
const palette = {
  carpaint: ["#c86224", 0.6, 0.42, 1],
  black: ["#16191b", 0.1, 0.24, 1],
  brakedisk: ["#6a6d71", 0.5, 0.24, 1],
  chrome: ["#d7dee5", 0.9, 0.2, 1],
  clearglass: ["#c4d4d9", 0.8, 0.1, 0.12],
  darkglass: ["#516a72", 0.55, 0.16, 0.3],
  interior: ["#242427", 0.03, 0.6, 1],
  mirror: ["#cdd8dd", 0.95, 0.15, 1],
  orangeglass: ["#e36712", 0.45, 0.15, 1],
  redglass: ["#970714", 0.5, 0.18, 1],
  material: ["#aeb5bc", 0.6, 0.24, 1],
  tire: ["#1b1c1e", 0.02, 0.9, 1],
  fabric: ["#151619", 0.015, 1, 1],
};
const materials = document.materials.map((material) => {
  const [colour, sheen, roughness, opacity] = palette[material.name] ?? palette.black;
  const diffuseWeight = { carpaint: 0.7, chrome: 0.18, material: 0.24, brakedisk: 0.4, mirror: 0.2 }[material.name] ?? 1;
  return { name: material.name, colour: linearColour(colour), sheen, roughness, opacity, diffuseWeight };
});

// Render slightly larger than the delivered poster for clean, antialiased edges.
const width = 1920, height = 1080;
const camera = [4.65, 1.95, 4.8], target = [0, 0.53, 0];
const forward = normalise(subtract(target, camera));
const right = normalise(cross(forward, [0, 1, 0]));
const up = cross(right, forward);
const focal = height / (2 * Math.tan(27 * Math.PI / 360));
const pixels = Buffer.alloc(width * height * 3);
const depth = new Float32Array(width * height).fill(-Infinity);
const lights = [
  { direction: normalise([3, 6, 4]), power: 1.5, colour: [1, 0.94, 0.85] },
  { direction: normalise([-4, 3, -4]), power: 0.6, colour: [0.77, 0.86, 1] },
  { direction: normalise([-1, 4, 5]), power: 0.4, colour: [1, 1, 1] },
];

// A restrained studio floor and soft contact shadows ground the unchanged mesh.
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const nx = (x - width / 2) / focal, ny = (height / 2 - y) / focal;
    const direction = forward.map((v, i) => v + right[i] * nx + up[i] * ny);
    const distance = (-0.012 - camera[1]) / direction[1];
    let shade = 0;
    if (distance > 0) {
      const px = camera[0] + distance * direction[0], pz = camera[2] + distance * direction[2];
      shade = 0.7 * Math.exp(-1.5 * ((px / 2.05) ** 2 + (pz / 0.95) ** 2));
      for (const axle of [-1.08277, 1.22765]) for (const side of [-0.77, 0.77]) {
        shade = Math.max(shade, 0.88 * Math.exp(-(((px - axle) / 0.35) ** 2) - ((pz - side) / 0.24) ** 2));
      }
    }
    const pool = Math.exp(-(((x - width * 0.48) / (width * 0.65)) ** 2) - ((y - height * 0.58) / (height * 0.8)) ** 2);
    const background = [17 + 17 * pool, 20 + 18 * pool, 25 + 19 * pool];
    const offset = (y * width + x) * 3;
    for (let c = 0; c < 3; c++) pixels[offset + c] = Math.round(background[c] * (1 - shade));
  }
}

function shadeVertex(position, normal, material) {
  const view = normalise(subtract(camera, position));
  const n = dot(normal, view) < 0 ? normal.map((v) => -v) : normal;
  const diffuse = [0.27, 0.29, 0.33].map((v) => v * (0.62 + Math.max(0, n[1]) * 0.6));
  let specular = 0;
  for (const light of lights) {
    const amount = Math.max(0, dot(n, light.direction)) * light.power;
    for (let c = 0; c < 3; c++) diffuse[c] += amount * light.colour[c];
    const half = normalise(light.direction.map((v, i) => v + view[i]));
    specular += Math.max(0, dot(n, half)) ** (16 + 130 * (1 - material.roughness)) * light.power;
  }
  const reflect = n.map((v, i) => 2 * dot(n, view) * v - view[i]);
  // Broad studio softboxes reflected in the supplied curved vehicle surfaces.
  const overhead = Math.exp(-(((reflect[1] - 0.78) / 0.17) ** 2)) * 0.5;
  const sideCard = Math.exp(-(((reflect[1] - 0.32) / 0.065) ** 2)) * 0.4;
  const fresnel = (1 - Math.max(0, dot(n, view))) ** 4;
  const reflection = (overhead + sideCard + 0.1 * Math.max(0, reflect[1])) * material.sheen;
  return material.colour.map((value, c) => display(value * diffuse[c] * material.diffuseWeight + reflection * (0.65 + fresnel) + specular * material.sheen * 0.5));
}

const geometry = [];
let triangleCount = 0;
function visit(nodeIndex) {
  const node = document.nodes[nodeIndex];
  if (node.matrix || node.translation || node.rotation || node.scale) {
    throw new Error("This source version contains node transforms; extend the renderer before using it.");
  }
  if (node.mesh !== undefined) for (const primitive of document.meshes[node.mesh].primitives) {
    if ((primitive.mode ?? 4) !== 4) throw new Error("Only triangle primitives are supported.");
    const positions = accessor(primitive.attributes.POSITION);
    const normals = accessor(primitive.attributes.NORMAL);
    const indices = accessor(primitive.indices);
    let material = materials[primitive.material];
    if (material.name === "clearglass" && node.name.endsWith("_45")) material = materials.find((m) => m.name === "darkglass");
    const vertices = new Float32Array(positions.length / 3 * 6);
    for (let index = 0; index < positions.length / 3; index++) {
      const point = Array.from(positions.subarray(index * 3, index * 3 + 3));
      const normal = normalise(Array.from(normals.subarray(index * 3, index * 3 + 3)));
      const relative = subtract(point, camera), inverseZ = 1 / dot(relative, forward);
      const colour = shadeVertex(point, normal, material);
      vertices.set([width / 2 + focal * dot(relative, right) * inverseZ, height / 2 - focal * dot(relative, up) * inverseZ, inverseZ, ...colour.map((v) => v * inverseZ)], index * 6);
    }
    geometry.push({ vertices, indices, material });
    triangleCount += indices.length / 3;
  }
  for (const child of node.children ?? []) visit(child);
}
for (const node of document.scenes[document.scene ?? 0].nodes) visit(node);

function triangle(item, offset, opacity) {
  const { vertices: v, indices } = item;
  const a = indices[offset] * 6, b = indices[offset + 1] * 6, c = indices[offset + 2] * 6;
  const ax = v[a], ay = v[a + 1], bx = v[b], by = v[b + 1], cx = v[c], cy = v[c + 1];
  const area = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(area) < 0.0001) return;
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
  const ia = 1 / area, waX = (by - cy) * ia, wbX = (cy - ay) * ia;
  for (let y = minY; y <= maxY; y++) {
    let wa = ((by - cy) * (minX + 0.5 - cx) + (cx - bx) * (y + 0.5 - cy)) * ia;
    let wb = ((cy - ay) * (minX + 0.5 - cx) + (ax - cx) * (y + 0.5 - cy)) * ia;
    for (let x = minX; x <= maxX; x++, wa += waX, wb += wbX) {
      const wc = 1 - wa - wb;
      if (wa < 0 || wb < 0 || wc < 0) continue;
      const z = wa * v[a + 2] + wb * v[b + 2] + wc * v[c + 2], pixel = y * width + x;
      if (z <= depth[pixel]) continue;
      if (opacity === 1) depth[pixel] = z;
      for (let channel = 0; channel < 3; channel++) {
        const colour = (wa * v[a + 3 + channel] + wb * v[b + 3 + channel] + wc * v[c + 3 + channel]) / z;
        const index = pixel * 3 + channel;
        pixels[index] = Math.round(colour * opacity + pixels[index] * (1 - opacity));
      }
    }
  }
}

for (const item of geometry.filter((g) => g.material.opacity === 1)) {
  for (let offset = 0; offset < item.indices.length; offset += 3) triangle(item, offset, 1);
}
const transparent = [];
for (const item of geometry.filter((g) => g.material.opacity < 1)) {
  for (let offset = 0; offset < item.indices.length; offset += 3) {
    const z = [0, 1, 2].reduce((sum, i) => sum + item.vertices[item.indices[offset + i] * 6 + 2], 0);
    transparent.push({ item, offset, z });
  }
}
transparent.sort((a, b) => a.z - b.z);
for (const { item, offset } of transparent) triangle(item, offset, item.material.opacity);

await fs.mkdir(path.dirname(output), { recursive: true });
await sharp(pixels, { raw: { width, height, channels: 3 } }).resize(1600, 900).webp({ quality: 92, effort: 6 }).toFile(output);
const { size } = await fs.stat(output);
console.log(JSON.stringify({ source, output, meshes: geometry.length, triangles: triangleCount, width: 1600, height: 900, bytes: size }, null, 2));
