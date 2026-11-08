import assert from "node:assert/strict";
import { test } from "node:test";
import { getNetlifyHeaders, getSecurityHeaderRules } from "../src/lib/securityHeaders";

const viewer = "/experiences/car/fireball-car-configurator2.html";
const paths = ["/_next/*", "/gallery/*", "/atlases/*", viewer];
function parse(text: string) {
  return text.trim().split("\n\n").map((block) => {
    const [path, ...lines] = block.split("\n");
    return { path, headers: lines.map((line) => { const value = line.trim(); const separator = value.indexOf(": "); return [value.slice(0, separator), value.slice(separator + 2)]; }) };
  });
}

test("Netlify emits one complete isolated viewer policy without a competing global CSP", () => {
  const blocks = parse(getNetlifyHeaders({ NODE_ENV: "production", CONTEXT: "production" }, paths));
  assert.equal(blocks.length, paths.length);
  assert.ok(!blocks.some(({ path }) => path === "/*"));
  const headers = blocks.find(({ path }) => path === viewer)!.headers;
  assert.equal(headers.filter(([name]) => name === "Content-Security-Policy").length, 1);
  const values = Object.fromEntries(headers);
  assert.equal(values["X-Frame-Options"], "SAMEORIGIN");
  assert.match(values["Content-Security-Policy"], /frame-ancestors 'self'/);
  assert.doesNotMatch(values["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(values["Content-Security-Policy"], /'wasm-unsafe-eval'/);
  assert.match(values["Content-Security-Policy"], /three@0\.170\.0\//);
  assert.equal(values["X-Content-Type-Options"], "nosniff");
  assert.match(values["X-Robots-Tag"], /noindex/);
});

test("preview static assets get noindex while production galleries remain indexable", () => {
  const preview = parse(getNetlifyHeaders({ NODE_ENV: "production", CONTEXT: "deploy-preview" }, paths));
  assert.ok(preview.every(({ headers }) => /noindex/.test(Object.fromEntries(headers)["X-Robots-Tag"])));
  const production = parse(getNetlifyHeaders({ NODE_ENV: "production", CONTEXT: "production" }, paths));
  const gallery = Object.fromEntries(production.find(({ path }) => path === "/gallery/*")!.headers);
  assert.equal(gallery["X-Robots-Tag"], undefined);
  assert.equal(gallery["X-Frame-Options"], "DENY");
  assert.doesNotMatch(gallery["Content-Security-Policy"], /wasm-unsafe-eval|cdn.jsdelivr/);
  const atlas = Object.fromEntries(production.find(({ path }) => path === "/atlases/*")!.headers);
  assert.match(atlas["Cache-Control"], /immutable/);
});

test("static delivery uses the same final viewer policy as Next.js", () => {
  const env = { NODE_ENV: "production", CONTEXT: "production" };
  const nextPolicy = getSecurityHeaderRules(env).find(({ source }) => source === viewer)!.headers;
  const staticPolicy = Object.fromEntries(parse(getNetlifyHeaders(env, [viewer]))[0].headers);
  for (const { key, value } of nextPolicy) assert.equal(staticPolicy[key], value);
});
