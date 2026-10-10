import test from "node:test";
import assert from "node:assert/strict";
import {
  parts,
  weather,
  moonPhase,
  moonPath,
  dayIndex,
  number,
  pressureSignal,
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

test("24-hour forecast keeps now at one-eighth across midnight", async () => {
  const { timelineWindow } = await import("../src/domain.js");
  for (const date of [
    "2026-10-05T14:59:59Z",
    "2026-10-05T15:00:01Z",
    "2026-11-01T06:00:00Z",
  ]) {
    const now = new Date(date),
      w = timelineWindow(now);
    assert.equal(w.nowPosition, 1 / 8);
    assert.equal(w.end - w.start, 24 * 3600);
    assert.equal(now.getTime() / 1000 - w.start, 3 * 3600);
    assert.equal(w.end - now.getTime() / 1000, 21 * 3600);
  }
});

test("pressure outlook uses the worst six-hour drop inside the next 12 hours", () => {
  const start = Date.parse("2026-10-06T00:00:00Z") / 1000;
  const data = {
    current: { pressure_msl: 1012.4 },
    hourly: {
      time: Array.from({ length: 13 }, (_, i) => start + i * 3600),
      pressure_msl: [1012, 1011, 1010, 1009, 1008, 1007, 1006, 1006, 1007, 1008, 1009, 1010, 1011],
    },
  };
  const result = pressureSignal(data, new Date(start * 1000));
  assert.equal(result.level, "pain");
  assert.equal(result.trend, "down");
  assert.equal(result.maxDrop, -6);
  assert.equal(Math.round(result.pressure), 1012);
});

test("pressure outlook smiles when forecast pressure stays nearly stable", () => {
  const start = Date.parse("2026-10-06T00:00:00Z") / 1000;
  const data = {
    current: { pressure_msl: 1014 },
    hourly: {
      time: Array.from({ length: 13 }, (_, i) => start + i * 3600),
      pressure_msl: [1014, 1014, 1013.8, 1014.2, 1014.1, 1014, 1014.3, 1014.2, 1014, 1014.1, 1014.2, 1014.4, 1014.3],
    },
  };
  const result = pressureSignal(data, new Date(start * 1000));
  assert.equal(result.level, "smile");
  assert.equal(result.trend, "steady");
});

test("pressure faces use filled discs and distinct expressions for each outlook", async () => {
  const { pressureFace } = await import("../src/icons.js");
  const faces = ["smile", "watch", "pain", "unknown"].map(pressureFace);
  for (const svg of faces) {
    assert.match(svg, /class="face-disc"/);
    assert.match(svg, /class="face-features"/);
    assert.match(svg, /class="filled-feature"|<path d=/);
  }
  assert.equal(new Set(faces).size, 4);
});
