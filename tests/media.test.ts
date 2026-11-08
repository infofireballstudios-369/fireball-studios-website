import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getFramePath, getVideoPath, getVimeoVideo, homeSequenceIds, sequenceConfigs } from "../src/lib/assetManifest";
import { VimeoPlayer } from "../src/components/ui/VimeoPlayer";
import { ProjectsGrid } from "../src/components/ui/ProjectsGrid";
import { getCreativeWorkSchema } from "../src/lib/schema";
import type { Project } from "../src/types/portfolio";
import { homeChapters } from "../src/lib/homeStory";
import { FeaturedProjects } from "../src/components/ui/FeaturedProjects";
import { getProjectBySource } from "../src/lib/projectsData";

const project: Project = {
  id: "test",
  slug: "test-project",
  title: "A residential study",
  category: "Real Estate",
  client: "Studio study",
  industry: "Residential property",
  sourceAssetId: 1,
  video: getVimeoVideo(1),
  coverImage: "/posters/1.webp",
  galleryImages: [{ src: "/posters/1.webp", alt: "Residential interior" }],
  description: "A visualisation study.",
  brief: "Explore a residential interior.",
  features: ["Interior visualisation"],
  year: 2026,
  isConcept: true,
  metrics: [],
};

test("the homepage residence card offers exactly the last two photos and an explicit film action", () => {
  const residence = getProjectBySource(3);
  assert.ok(residence);
  const html = renderToStaticMarkup(createElement(FeaturedProjects, { projects: [residence] }));
  assert.equal((html.match(/aria-label="Show view/g) ?? []).length, 2);
  assert.match(html, /Watch film: The Interactive Residence/);
  assert.doesNotMatch(html, /gallery%2F3%2F3\.[123]\.webp|<iframe|<video/i);
});

test("all six source assets map to their supplied Vimeo films", () => {
  const ids = ["1243948791", "1243948789", "1243951425", "1243948790", "1243948881", "1243948923"];
  ids.forEach((id, index) => {
    assert.deepEqual(getVimeoVideo(index + 1), {
      id,
      watchUrl: "https://vimeo.com/" + id,
      embedUrl: "https://player.vimeo.com/video/" + id,
    });
    assert.equal(getVideoPath(index + 1), "https://vimeo.com/" + id);
  });
  for (const invalid of [0, 7, 1.5, NaN, Infinity]) assert.throws(() => getVimeoVideo(invalid), RangeError);
});

test("the home story keeps local WebP sequences in the requested 3, 6, 5 order", () => {
  assert.deepEqual(homeSequenceIds, [3, 6, 5]);
  assert.deepEqual(homeChapters.map((chapter) => chapter.sequenceId), homeSequenceIds);
  assert.equal(sequenceConfigs[6].frameCount, 96);
  assert.equal(getFramePath(6, 1), "/frames/6/6.1.webp");
  assert.equal(getFramePath(6, 96), "/frames/6/6.96.webp");
});

test("a player initially renders a local poster and explicit play control without third-party loading", () => {
  const html = renderToStaticMarkup(createElement(VimeoPlayer, {
    video: getVimeoVideo(1), title: project.title, poster: project.coverImage, posterAlt: "Residential interior",
  }));
  assert.match(html, /Watch film/);
  assert.match(html, /Residential interior/);
  assert.match(html, /href="https:\/\/vimeo.com\/1243948791"/);
  assert.doesNotMatch(html, /<iframe|<video|<script|preconnect|player\.vimeo\.com|\.mp4/i);
});

test("a player mounted after a Watch film action has one accessible privacy-aware iframe", () => {
  const html = renderToStaticMarkup(createElement(VimeoPlayer, {
    video: getVimeoVideo(6), title: "Architectural film", poster: "/posters/6.webp", playOnOpen: true,
  }));
  assert.equal((html.match(/<iframe/g) ?? []).length, 1);
  assert.match(html, /https:\/\/player.vimeo.com\/video\/1243948923\?autoplay=1&amp;dnt=1/);
  assert.match(html, /title="Architectural film — project film"/);
  assert.match(html, /referrerPolicy="strict-origin-when-cross-origin"/i);
  assert.match(html, /Loading the film/);
  assert.match(html, /Watch on Vimeo/);
});

test("the portfolio grid initially renders image cards without mounted media players", () => {
  const html = renderToStaticMarkup(createElement(ProjectsGrid, { projects: [project] }));
  assert.match(html, /Watch film: A residential study/);
  assert.match(html, /\/projects\/test-project/);
  assert.match(html, /Residential interior/);
  assert.doesNotMatch(html, /<iframe|<video|<script|preconnect|player\.vimeo\.com|\.mp4/i);
});

test("interactive-only projects do not render film controls or invent video metadata", () => {
  const interactive: Project = {
    ...project,
    video: undefined,
    interactive: { src: "/interactive/furniture.html", title: "Furniture configurator" },
  };
  const html = renderToStaticMarkup(createElement(ProjectsGrid, { projects: [interactive] }));
  assert.match(html, /Explore interactive/);
  assert.doesNotMatch(html, /Watch film|<iframe|<video/);
  assert.equal("encoding" in getCreativeWorkSchema(interactive), false);
});

test("film structured data names the Vimeo watch and embed URLs without a fabricated content URL", () => {
  const schema = getCreativeWorkSchema(project);
  const video = schema.encoding as Record<string, unknown>;
  assert.equal(video["@type"], "VideoObject");
  assert.equal(video.url, getVimeoVideo(1).watchUrl);
  assert.equal(video.embedUrl, getVimeoVideo(1).embedUrl);
  assert.equal("contentUrl" in video, false);
  assert.equal("uploadDate" in video, false);
});
