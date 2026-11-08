import assert from "node:assert/strict";
import { test } from "node:test";
import { forecastCredits, getBudgetFailures, mediaLimits } from "../scripts/check-media-budget.mjs";

test("the standard homepage forecast leaves 85 credits before additional use", () => {
  const result = forecastCredits();
  assert.equal(result.bandwidthGb, 7.5);
  assert.equal(result.requests, 250_000);
  assert.deepEqual(result.credits, { bandwidth: 150, requests: 50, productionDeploys: 15, compute: 0 });
  assert.equal(result.totalCredits, 215);
  assert.equal(result.remainingCredits, 85);
});

test("3D launches can exceed Free even with only 5000 homepage visits", () => {
  const occasional = forecastCredits({ viewerLaunches: 250 });
  assert.equal(occasional.totalCredits, 227.75);
  assert.equal(occasional.withinFreeLimit, true);
  const everyVisit = forecastCredits({ viewerLaunches: 5_000 });
  assert.equal(everyVisit.totalCredits, 470);
  assert.equal(everyVisit.remainingCredits, -170);
  assert.equal(everyVisit.withinFreeLimit, false);
});

test("compute and additional traffic are counted independently of homepage and viewer use", () => {
  const result = forecastCredits({ viewerLaunches: 250, computeGbHours: 0.5, extraGb: 0.5, extraRequests: 10_000 });
  assert.equal(result.totalCredits, 244.75);
  assert.equal(result.credits.compute, 5);
  assert.equal(forecastCredits({ productionDeploys: 2 }).totalCredits, 230);
});

test("invalid traffic assumptions cannot silently produce an optimistic forecast", () => {
  for (const input of [{ visits: -1 }, { visits: 0.5 }, { computeGbHours: NaN }, { mbPerVisit: Infinity }, { extraRequests: -1 }]) {
    assert.throws(() => forecastCredits(input), RangeError);
  }
});

test("byte and request limits fail independently as soon as the budget is exceeded", () => {
  assert.deepEqual(getBudgetFailures({ ...mediaLimits }), []);
  for (const key of Object.keys(mediaLimits) as (keyof typeof mediaLimits)[]) {
    const failures = getBudgetFailures({ ...mediaLimits, [key]: mediaLimits[key] + 1 });
    assert.equal(failures.length, 1);
    assert.match(failures[0], new RegExp(key));
  }
});
