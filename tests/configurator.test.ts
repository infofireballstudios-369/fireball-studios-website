import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { ConfiguratorPlayer } from "../src/components/ui/ConfiguratorPlayer";

test("the imported model-ready path enables every control and reports readiness", async () => {
  const html = await readFile(new URL("../public/experiences/car/fireball-car-configurator2.html", import.meta.url), "utf8");
  const readyBlock = html.match(/try\{await loadProductionModel\(\);[^\n]+/);
  assert.ok(readyBlock);
  const buttons = [{ disabled: true }, { disabled: true }];
  const reports: string[] = [];
  const loading = { hidden: false };
  await runInNewContext("(async () => { " + readyBlock[0] + " catch(error) { throw error; } })()", {
    loadProductionModel: async () => undefined,
    window: { fireballIntegration: { isDisposed: () => false, report: (state: string) => reports.push(state) } },
    applyConfig() {},
    dispose() { assert.fail("An active model should stay open"); },
    loading,
    $$: () => buttons,
    $: () => assert.fail("Bulk control updates must use the collection helper"),
  });
  assert.ok(buttons.every((button) => !button.disabled));
  assert.equal(loading.hidden, true);
  assert.deepEqual(reports, ["ready"]);
});

test("the configurator serves a poster and launch control without fetching an iframe initially", () => {
  const html = renderToStaticMarkup(createElement(ConfiguratorPlayer));
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /Launch configurator/);
  assert.match(html, /car-configurator\.webp/);
  assert.match(html, /Open the standalone configurator/);
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net|fb-vehicle-data|fb-rim-data/);
});

test("the isolated bridge accepts lifecycle commands only from its known parent origin and window", async () => {
  const { configuratorBridge } = await import("../scripts/import-configurator.mjs");
  const listeners = new Map<string, (event: unknown) => void>();
  const reports: unknown[] = [];
  const pauses: boolean[] = [];
  let disposals = 0;
  const parent = { postMessage: (data: unknown, target: string) => reports.push({ data, target }) };
  const window = {
    parent,
    addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, listener),
    fireballConfigurator: { dispose: () => { disposals++; }, setPaused: (paused: boolean) => pauses.push(paused) },
    fireballIntegration: undefined as undefined | { report: (state: string) => void; isDisposed: () => boolean },
  };
  runInNewContext(configuratorBridge, { window, document: { referrer: "https://fireballstudios.co.uk/projects/car-configurator" }, URL });
  const send = (source: unknown, origin: string, command: string, paused = true) => listeners.get("message")?.({ source, origin, data: { channel: "fireball-configurator", command, paused } });
  send({}, "https://fireballstudios.co.uk", "dispose");
  send(parent, "https://untrusted.example", "dispose");
  assert.equal(disposals, 0);
  send(parent, "https://fireballstudios.co.uk", "pause");
  assert.deepEqual(pauses, [true]);
  window.fireballIntegration?.report("ready");
  assert.equal(reports.length, 1);
  assert.equal((reports[0] as { target: string }).target, "https://fireballstudios.co.uk");
  send(parent, "https://fireballstudios.co.uk", "dispose");
  send(parent, "https://fireballstudios.co.uk", "dispose");
  assert.equal(disposals, 1);
  assert.equal(window.fireballIntegration?.isDisposed(), true);
  listeners.get("pagehide")?.({});
  assert.equal(disposals, 1);
});

test("an absent referrer does not open a lifecycle command channel", async () => {
  const { configuratorBridge } = await import("../scripts/import-configurator.mjs");
  const listeners = new Map<string, (event: unknown) => void>();
  let disposals = 0;
  const parent = { postMessage: () => assert.fail("No parent origin is available") };
  const window = { parent, addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, listener), fireballConfigurator: { dispose: () => { disposals++; } } };
  runInNewContext(configuratorBridge, { window, document: { referrer: "" }, URL });
  listeners.get("message")?.({ source: parent, origin: "https://fireballstudios.co.uk", data: { channel: "fireball-configurator", command: "dispose" } });
  assert.equal(disposals, 0);
  listeners.get("pagehide")?.({});
  assert.equal(disposals, 1);
});
