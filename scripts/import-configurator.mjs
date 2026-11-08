import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { optimiseEmbeddedModels, restoreModelCoordinates } from "./configurator-models.mjs";

/** A small bridge keeps the opaque iframe isolated from the surrounding page. */
export const configuratorBridge = String.raw`
(() => {
  const embedded = window.parent !== window;
  let parentOrigin = null;
  let closed = false;
  try { parentOrigin = document.referrer ? new URL(document.referrer).origin : null; } catch {}
  const report = (state) => {
    if (embedded && parentOrigin && ['ready', 'error', 'disposed'].includes(state)) {
      window.parent.postMessage({ channel: 'fireball-configurator', state }, parentOrigin);
    }
  };
  const dispose = () => {
    if (closed) return;
    closed = true;
    window.fireballConfigurator?.dispose();
    report('disposed');
  };
  window.fireballIntegration = Object.freeze({ report, isDisposed: () => closed });
  window.addEventListener('message', (event) => {
    if (!embedded || !parentOrigin || event.source !== window.parent || event.origin !== parentOrigin) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || data.channel !== 'fireball-configurator') return;
    if (data.command === 'dispose') dispose();
    if (data.command === 'pause' && typeof data.paused === 'boolean') {
      window.fireballConfigurator?.setPaused(data.paused);
    }
  });
  window.addEventListener('pagehide', dispose, { once: true });
  window.addEventListener('error', () => { if (!closed) report('error'); });
  window.addEventListener('unhandledrejection', () => { if (!closed) report('error'); });
})();
`;

function replaceOnce(html, original, replacement) {
  if (html.split(original).length !== 2) throw new Error("The configurator source changed; review the integration patch before importing.");
  return html.replace(original, () => replacement);
}

/** Preserve model data, attribution and controls while adding the host lifecycle. */
export function prepareConfigurator(source) {
  let html = replaceOnce(source, '<html lang="en">', '<html lang="en-GB">');
  html = replaceOnce(html, 'let THREE, OrbitControls, RoundedBoxGeometry;', 'let THREE, OrbitControls, RoundedBoxGeometry, MeshoptDecoder;');
  html = replaceOnce(html, '[THREE, {OrbitControls}, {RoundedBoxGeometry}]', '[THREE, {OrbitControls}, {RoundedBoxGeometry}, {MeshoptDecoder}]');
  html = replaceOnce(html, "import('three/addons/geometries/RoundedBoxGeometry.js')", "import('three/addons/geometries/RoundedBoxGeometry.js'), import('three/addons/libs/meshopt_decoder.module.js')");
  html = replaceOnce(html, '// 1. CENTRAL CONFIGURATION STATE.', restoreModelCoordinates + '\n// 1. CENTRAL CONFIGURATION STATE.');
  html = replaceOnce(html, "new GLTFLoader().parseAsync(decompressed,'')", "new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(decompressed,'')");
  html = replaceOnce(html, 'model=result.scene;', 'model=restoreModelCoordinates(result.scene);');
  html = replaceOnce(html, "const {scene:collection}=await new GLTFLoader().parseAsync(buffer,'');", "const {scene:collection}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer,'');restoreModelCoordinates(collection);");
  html = html.replace(/<style>([\s\S]*?)<\/style>/, (_, css) => '<style>' + css.replace(/font-size:(\d+)px/g, (_match, size) => 'font-size:' + Math.max(12, Number(size)) + 'px') + '</style>');
  html = replaceOnce(html, '<script type="module">', '<script id="fireball-integration">' + configuratorBridge + '</script>\n<script type="module">');
  html = replaceOnce(html, "// 1. CENTRAL CONFIGURATION STATE.", "if(window.fireballIntegration.isDisposed()) throw new Error('Configurator closed.');\n// 1. CENTRAL CONFIGURATION STATE.");
  html = replaceOnce(html, 'let frame=0,last=0,disposed=false,visible=true,needsRender=true;', 'let frame=0,last=0,disposed=false,visible=true,needsRender=true,integrationPaused=false;');
  html = replaceOnce(html, 'if(document.hidden||!visible)', 'if(document.hidden||!visible||integrationPaused)');
  html = replaceOnce(html, 'window.fireballConfigurator={getConfig:', 'window.fireballConfigurator={setPaused(value){integrationPaused=Boolean(value);if(!integrationPaused){last=0;needsRender=true;}},getConfig:');
  html = replaceOnce(html, "try{await loadProductionModel();applyConfig();loading.hidden=true;$$('button').forEach(b=>b.disabled=false);}", "try{await loadProductionModel();if(window.fireballIntegration.isDisposed()){dispose();}else{applyConfig();loading.hidden=true;$$('button').forEach(b=>b.disabled=false);window.fireballIntegration.report('ready');}}");
  html = replaceOnce(html, "catch(error){console.error(error);loading.textContent='The vehicle could not load.", "catch(error){window.fireballIntegration.report('error');console.error(error);loading.textContent='The vehicle could not load.");
  return html;
}

async function importConfigurator() {
  const source = resolve(process.argv[2] ?? "../Projects/Edited-2/fireball-car-configurator2.html");
  const destination = resolve("public/experiences/car/fireball-car-configurator2.html");
  const option = process.argv.indexOf("--models-dir");
  const modelsDirectory = option >= 0 ? process.argv[option + 1] : undefined;
  if (option >= 0 && !modelsDirectory) throw new Error("Supply a prepared model directory after --models-dir.");
  const optimised = await optimiseEmbeddedModels(await readFile(source, "utf8"), { modelsDirectory });
  const html = prepareConfigurator(optimised.source);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, html);
  console.log(JSON.stringify(optimised.report, null, 2));
  console.log("Imported the optimised configurator with verified model bounds, original attribution and the isolated lifecycle bridge.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await importConfigurator();
