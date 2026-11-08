import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { featuredProjects, getProject, getProjectBySource, projectsData } from "../src/lib/projectsData";
import { getFramePaths, homeSequenceIds, sequenceConfigs } from "../src/lib/assetManifest";

test("portfolio categories and original galleries follow the supplied source films", () => {
  const expected = [
    { source: 1, category: "Real Estate", gallery: ["1.4.webp", "1.5.webp", "1.6.webp"] },
    { source: 2, category: "Architecture", gallery: ["2.4.webp", "2.5.webp"] },
    { source: 3, category: "Real Estate", gallery: ["3.4.webp", "3.5.webp"] },
    { source: 4, category: "Real Estate", gallery: ["4.5.webp", "4.6.webp"] },
    { source: 5, category: "Product Design", gallery: ["5.2.webp", "5.1.webp"] },
  ];
  for (const item of expected) {
    const project = getProjectBySource(item.source);
    assert.ok(project);
    assert.equal(project.category, item.category);
    assert.deepEqual(project.galleryImages.map((image) => image.src.split("/").at(-1)), item.gallery);
    assert.ok(project.galleryImages.every((image) => image.src.startsWith("/gallery/")));
    assert.ok(project.video?.watchUrl.startsWith("https://vimeo.com/"));
  }
  assert.equal(projectsData.filter((project) => project.category === "Real Estate").length, 3);
  assert.equal(getProjectBySource(6), undefined, "The spaceship belongs in the studio article, not the portfolio");
  assert.equal(new Set(projectsData.map((project) => project.slug)).size, projectsData.length);
});

test("featured projects select sources 3 and 5 independently of portfolio IDs", () => {
  assert.deepEqual(featuredProjects.map((project) => project.sourceAssetId), [3, 5]);
  assert.deepEqual(featuredProjects[0].galleryImages.map((image) => image.src), ["/gallery/3/3.4.webp", "/gallery/3/3.5.webp"]);
  assert.equal(featuredProjects[0].coverImage, "/gallery/3/3.4.webp");
});

test("home sequences have complete numbered frame files for forward and reverse playback", () => {
  assert.deepEqual(homeSequenceIds, [3, 6, 5]);
  for (const id of homeSequenceIds) {
    const paths = getFramePaths(id, sequenceConfigs[id].frameCount);
    assert.equal(readdirSync(join(process.cwd(), "public/frames", String(id))).filter((name) => name.endsWith(".webp")).length, paths.length);
    for (const path of paths) assert.ok(existsSync(join(process.cwd(), "public", path)), path);
  }
});

test("the automotive entry launches the imported configurator without a fabricated film", () => {
  const project = getProject("car-configurator");
  assert.ok(project);
  assert.equal(project.category, "Automotive");
  assert.equal(project.video, undefined);
  assert.equal(project.interactive?.src, "/experiences/car/fireball-car-configurator2.html");
  assert.ok(existsSync(join(process.cwd(), "public", project.interactive.src)));
});
