import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";

export const GLTF_TRANSFORM_VERSION = "4.5.1";
const modelIds = ["vehicle", "rim"];

/** Read just the glTF metadata; binary compression is decoded by GLTFLoader at runtime. */
export function readModelMetadata(bytes) {
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length || bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error("Invalid glTF model container.");
  const length = bytes.readUInt32LE(12);
  if (20 + length > bytes.length) throw new Error("Invalid glTF metadata length.");
  return JSON.parse(bytes.subarray(20, 20 + length).toString("utf8"));
}

export function getEmbeddedModel(source, id) {
  const match = source.match(new RegExp('<script id="fb-' + id + '-data" type="application/octet-stream">([\\s\\S]*?)</script>'));
  if (!match) throw new Error("The original " + id + " model is missing.");
  return gunzipSync(Buffer.from(match[1].trim(), "base64"));
}

function identity(node) {
  return !node.matrix && (!node.translation || node.translation.every((value) => value === 0)) && (!node.scale || node.scale.every((value) => value === 1)) && (!node.rotation || node.rotation.every((value, index) => value === (index === 3 ? 1 : 0)));
}
function normalised(value, accessor) {
  if (!accessor.normalized) return value;
  const denominator = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[accessor.componentType];
  if (!denominator) throw new Error("Unsupported quantised attribute format.");
  return Math.max(value / denominator, accessor.componentType === 5120 || accessor.componentType === 5122 ? -1 : 0);
}
function nodeGeometry(model, node) {
  if (node.mesh === undefined) return null;
  const primitives = model.meshes[node.mesh].primitives;
  if (primitives.length !== 1 || node.children?.length) throw new Error("Review multi-primitive or nested mesh transforms before optimisation.");
  const primitive = primitives[0];
  if (primitive.mode !== undefined && primitive.mode !== 4 || primitive.targets?.length || node.skin !== undefined) throw new Error("Review animated or non-triangle model geometry before optimisation.");
  const accessor = model.accessors[primitive.attributes.POSITION];
  if (!accessor.min || !accessor.max || accessor.type !== "VEC3") throw new Error("Position bounds are required for model verification.");
  if (node.matrix || node.rotation?.some((value, index) => value !== (index === 3 ? 1 : 0))) throw new Error("Review rotated geometry before baking quantisation transforms.");
  const translation = node.translation ?? [0, 0, 0];
  const scale = node.scale ?? [1, 1, 1];
  if (scale.some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("Invalid model scale.");
  return {
    bounds: [accessor.min, accessor.max].map((corner) => corner.map((value, axis) => normalised(value, accessor) * scale[axis] + translation[axis])),
    triangles: (primitive.indices !== undefined ? model.accessors[primitive.indices].count : accessor.count) / 3,
    material: model.materials[primitive.material]?.name,
  };
}

/** Fail closed if optimisation changes control names, materials, topology or physical bounds. */
export function compareModelGeometry(original, optimised) {
  if (original.nodes.length !== optimised.nodes.length || original.meshes.length !== optimised.meshes.length) throw new Error("Optimisation changed the model hierarchy.");
  if (!optimised.extensionsRequired?.includes("EXT_meshopt_compression")) throw new Error("The optimised model does not require the expected Meshopt decoder.");
  let maxBoundsError = 0;
  let triangles = 0;
  for (let index = 0; index < original.nodes.length; index++) {
    const before = original.nodes[index], after = optimised.nodes[index];
    if (!identity(before)) throw new Error("The original model has transforms; review the coordinate restoration before importing.");
    if (before.name !== after.name || JSON.stringify(before.children ?? []) !== JSON.stringify(after.children ?? [])) throw new Error("Optimisation changed a control node.");
    if (after.mesh === undefined && !identity(after)) throw new Error("A control group gained a transform.");
    const first = nodeGeometry(original, before), second = nodeGeometry(optimised, after);
    if (Boolean(first) !== Boolean(second)) throw new Error("Optimisation changed a geometry node.");
    if (!first || !second) continue;
    if (first.triangles !== second.triangles || first.material !== second.material) throw new Error("Optimisation changed triangles or material names.");
    triangles += first.triangles;
    for (let corner = 0; corner < 2; corner++) for (let axis = 0; axis < 3; axis++) {
      maxBoundsError = Math.max(maxBoundsError, Math.abs(first.bounds[corner][axis] - second.bounds[corner][axis]));
    }
  }
  if (maxBoundsError > 0.001) throw new Error("Optimised geometry moved by more than one millimetre.");
  return { meshes: original.meshes.length, triangles, maxBoundsError };
}

/** Restore physical local coordinates before the application reparents or positions meshes. */
export const restoreModelCoordinates = String.raw`function restoreModelCoordinates(scene) {
 const retired=new Set();
 scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  mesh.updateMatrix();
  const geometry=mesh.geometry.clone();
  for(const name of ['position','normal','tangent']){
   const attribute=geometry.getAttribute(name);if(!attribute)continue;
   const values=new Float32Array(attribute.count*attribute.itemSize),readers=['getX','getY','getZ','getW'];
   for(let index=0;index<attribute.count;index++)for(let component=0;component<attribute.itemSize;component++)values[index*attribute.itemSize+component]=attribute[readers[component]](index);
   geometry.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize));
  }
  geometry.applyMatrix4(mesh.matrix);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  retired.add(mesh.geometry);mesh.geometry=geometry;
  mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);mesh.updateMatrix();
 });
 retired.forEach(geometry=>geometry.dispose());scene.updateMatrixWorld(true);return scene;
}`;

/** Run the pinned tool in a temporary directory, never adding runtime dependencies. */
export async function optimiseEmbeddedModels(source, { modelsDirectory } = {}) {
  const temporary = modelsDirectory ? null : await mkdtemp(join(tmpdir(), "fireball-models-"));
  const directory = temporary ?? resolve(modelsDirectory);
  const report = {};
  let html = source;
  try {
    for (const id of modelIds) {
      const original = getEmbeddedModel(source, id);
      const input = join(directory, id + ".glb"), output = join(directory, id + "-meshopt.glb");
      if (temporary) {
        await writeFile(input, original);
        const result = spawnSync("npm", ["exec", "--yes", "--package=@gltf-transform/cli@" + GLTF_TRANSFORM_VERSION, "--", "gltf-transform", "meshopt", input, output, "--level", "high"], { cwd: temporary, stdio: "inherit" });
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error("The model optimisation tool failed.");
      } else if (!(await readFile(input)).equals(original)) {
        throw new Error("The prepared " + id + " model does not match the original HTML source.");
      }
      const optimised = await readFile(output);
      const geometry = compareModelGeometry(readModelMetadata(original), readModelMetadata(optimised));
      const packed = gzipSync(optimised, { level: 9 });
      const pattern = new RegExp('(<script id="fb-' + id + '-data" type="application/octet-stream">)[\\s\\S]*?(</script>)');
      html = html.replace(pattern, (_match, opening, closing) => opening + packed.toString("base64") + closing);
      report[id] = { originalBytes: original.length, optimisedBytes: optimised.length, gzipBytes: packed.length, ...geometry };
    }
    return { source: html, report };
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true });
  }
}
