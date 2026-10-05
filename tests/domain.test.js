import test from "node:test";
import assert from "node:assert/strict";
import {
  parts,
  weather,
  moonPhase,
  moonPath,
  dayIndex,
  number,
} from "../src/domain.js";
test("Tokyo date rolls over independently from device UTC", () => {
  const p = parts(new Date("2026-10-05T15:00:00Z"), "Asia/Tokyo");
  assert.equal(p.key, "2026-10-06");
  assert.equal(p.minuteOfDay, 0);
});
test("DST fall-back retains local hour", () => {
  assert.equal(
    parts(new Date("2026-11-01T05:30Z"), "America/New_York").hour,
    "01",
  );
  assert.equal(
    parts(new Date("2026-11-01T06:30Z"), "America/New_York").hour,
    "01",
  );
});
test("missing observations never become clear skies or zero degrees", () => {
  assert.equal(weather(null).kind, "unknown");
  assert.equal(number(null), "--");
  assert.equal(weather(65).kind, "rain");
  assert.equal(weather(75).kind, "snow");
});
test("daily UTC epochs align to selected local day", () => {
  const data = {
    daily: {
      time: [
        Date.parse("2026-10-04T15:00Z") / 1000,
        Date.parse("2026-10-05T15:00Z") / 1000,
      ],
    },
  };
  assert.equal(dayIndex(data, new Date("2026-10-05T16:00Z"), "Asia/Tokyo"), 1);
});
test("moon age wraps at known reference; drawing is finite in all phases", () => {
  assert.equal(moonPhase(new Date("2000-01-06T18:14Z")).age, 0);
  for (const p of [0, 0.25, 0.5, 0.75, 0.999])
    assert.ok(!moonPath(p).includes("NaN"));
  assert.ok(moonPhase(new Date("1999-01-01")).age >= 0);
});

test("moving forecast keeps now at one-third across midnight", async () => {
  const { timelineWindow } = await import("../src/domain.js");
  for (const date of [
    "2026-10-05T14:59:59Z",
    "2026-10-05T15:00:01Z",
    "2026-11-01T06:00:00Z",
  ]) {
    const now = new Date(date),
      w = timelineWindow(now);
    assert.equal(w.nowPosition, 1 / 3);
    assert.equal(w.end - w.start, 18 * 3600);
    assert.equal(now.getTime() / 1000 - w.start, 6 * 3600);
  }
});
