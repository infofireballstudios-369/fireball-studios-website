import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { runInNewContext } from "node:vm";

test("the shipped configurator keeps both decodable model containers and attribution within its transfer budget", async () => {
  const { getEmbeddedModel, readModelMetadata } = await import("../scripts/configurator-models.mjs");
  const html = await readFile(new URL("../public/experiences/car/fireball-car-configurator2.html", import.meta.url), "utf8");
  const vehicle = readModelMetadata(getEmbeddedModel(html, "vehicle"));
  const rims = readModelMetadata(getEmbeddedModel(html, "rim"));
  assert.ok(vehicle.extensionsRequired.includes("EXT_meshopt_compression"));
  assert.ok(rims.extensionsRequired.includes("EXT_meshopt_compression"));
  for (const name of ["Body", "Wheel01", "FixedWheelParts"]) assert.ok(vehicle.nodes.some((node: { name: string }) => node.name === name), name);
  for (let index = 1; index <= 13; index++) assert.ok(rims.nodes.some((node: { name: string }) => node.name === "wheel" + String(index).padStart(2, "0")));
  assert.match(html, /creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(html, /sketchfab\.com\/Res1n/);
  assert.match(html, /sketchfab\.com\/Imagigoo/);
  assert.match(html, /setMeshoptDecoder\(MeshoptDecoder\)/);
  assert.ok(gzipSync(html).length < 2_500_000, "Keep the requested configurator below 2.5 MB with ordinary gzip transfer.");
});

test("model verification rejects lost control transforms, material names, triangles and physical bounds", async () => {
  const { compareModelGeometry } = await import("../scripts/configurator-models.mjs");
  type TestNode = { name: string; children?: number[]; mesh?: number; translation?: number[] };
  const original = {
    nodes: [{ name: "Body", children: [1] }, { name: "paint_0", mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    accessors: [{ type: "VEC3", componentType: 5126, count: 3, min: [-1, 0, -1], max: [1, 2, 1] }, { count: 3 }],
    materials: [{ name: "carpaint" }],
  };
  const candidate = {
    ...structuredClone(original),
    nodes: [{ name: "Body", children: [1] }, { name: "paint_0", mesh: 0, translation: [0, 1, 0] }] as TestNode[],
    accessors: [{ type: "VEC3", componentType: 5122, count: 3, normalized: true, min: [-32767, -32767, -32767], max: [32767, 32767, 32767] }, { count: 3 }],
    extensionsRequired: ["EXT_meshopt_compression"],
  };
  assert.equal(compareModelGeometry(original, candidate).maxBoundsError, 0);
  const movedControl = structuredClone(candidate);
  movedControl.nodes[0] = { ...movedControl.nodes[0], translation: [1, 0, 0] };
  assert.throws(() => compareModelGeometry(original, movedControl), /control group gained a transform/);
  const lostMaterial = structuredClone(candidate);
  lostMaterial.materials[0].name = "changed";
  assert.throws(() => compareModelGeometry(original, lostMaterial), /material names/);
  const changedTriangles = structuredClone(candidate);
  changedTriangles.accessors[1].count = 6;
  assert.throws(() => compareModelGeometry(original, changedTriangles), /triangles/);
  const changedBounds = structuredClone(candidate);
  changedBounds.accessors[0].max = [32000, 32767, 32767];
  assert.throws(() => compareModelGeometry(original, changedBounds), /one millimetre/);
});

test("coordinate restoration converts normalised integer positions before baking and resetting placement", async () => {
  const { restoreModelCoordinates } = await import("../scripts/configurator-models.mjs");
  class Attribute {
    count: number;
    constructor(public array: Float32Array | Int16Array, public itemSize: number, public normalized = false) { this.count = array.length / itemSize; }
    getX(index: number) { return this.read(index, 0); }
    getY(index: number) { return this.read(index, 1); }
    getZ(index: number) { return this.read(index, 2); }
    read(index: number, component: number) { const value = this.array[index * this.itemSize + component]; return this.normalized ? Math.max(-1, value / 32767) : value; }
  }
  class Geometry {
    disposed = false;
    constructor(public position: Attribute) {}
    clone() { return new Geometry(new Attribute(this.position.array.slice(), 3, this.position.normalized)); }
    getAttribute(name: string) { return name === "position" ? this.position : undefined; }
    setAttribute(_name: string, attribute: Attribute) { this.position = attribute; }
    applyMatrix4(matrix: { scale: number[]; translation: number[] }) {
      assert.ok(this.position.array instanceof Float32Array);
      assert.equal(this.position.normalized, false);
      for (let axis = 0; axis < 3; axis++) this.position.array[axis] = this.position.array[axis] * matrix.scale[axis] + matrix.translation[axis];
    }
    computeBoundingBox() {}
    computeBoundingSphere() {}
    dispose() { this.disposed = true; }
  }
  const original = new Geometry(new Attribute(new Int16Array([-32767, 0, 32767]), 3, true));
  let position: number[] = [], scale: number[] = [], resetRotation = false, updatedWorld = false;
  const mesh = { isMesh: true, geometry: original, matrix: { scale: [.244, .244, .244], translation: [0, .01, .0001] }, updateMatrix() {}, position: { set: (...values: number[]) => { position = values; } }, quaternion: { identity: () => { resetRotation = true; } }, scale: { set: (...values: number[]) => { scale = values; } } };
  const scene = { traverse: (visit: (node: typeof mesh) => void) => visit(mesh), updateMatrixWorld: () => { updatedWorld = true; } };
  const restore = runInNewContext("(" + restoreModelCoordinates + ")", { THREE: { BufferAttribute: Attribute }, Float32Array });
  restore(scene);
  const values = [...mesh.geometry.position.array];
  for (const [index, expected] of [-.244, .01, .2441].entries()) assert.ok(Math.abs(values[index] - expected) < 0.000001);
  assert.deepEqual(position, [0, 0, 0]);
  assert.deepEqual(scale, [1, 1, 1]);
  assert.equal(resetRotation, true);
  assert.equal(updatedWorld, true);
  assert.equal(original.disposed, true);
  assert.deepEqual([...original.position.array], [-32767, 0, 32767]);
});
