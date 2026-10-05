const fs = require("node:fs");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
fs.mkdirSync("artifacts", { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install({ time: new Date("2026-10-05T11:23:36Z") });
  const start = Date.parse("2026-10-03T15:00Z") / 1000;
  const fixture = {
    current: {
      temperature_2m: 19.4,
      relative_humidity_2m: 68,
      weather_code: 2,
      is_day: 0,
    },
    hourly: {
      time: [],
      temperature_2m: [],
      weather_code: [],
      precipitation_probability: [],
      is_day: [],
    },
    daily: {
      time: [],
      sunrise: [],
      sunset: [],
      temperature_2m_max: [],
      temperature_2m_min: [],
    },
  };
  for (let d = 0; d < 4; d++) {
    fixture.daily.time.push(start + d * 86400);
    fixture.daily.sunrise.push(start + d * 86400 + 5.7 * 3600);
    fixture.daily.sunset.push(start + d * 86400 + 17.3 * 3600);
    fixture.daily.temperature_2m_max.push(23);
    fixture.daily.temperature_2m_min.push(16);
  }
  for (let i = 0; i < 96; i++) {
    fixture.hourly.time.push(start + i * 3600);
    fixture.hourly.temperature_2m.push(
      19 + Math.sin((i / 24) * Math.PI * 2) * 4,
    );
    fixture.hourly.weather_code.push(
      i % 24 < 8 ? 3 : i % 24 < 15 ? 0 : i % 24 < 19 ? 61 : 2,
    );
    fixture.hourly.precipitation_probability.push(
      i % 24 >= 15 && i % 24 < 19 ? 70 : 0,
    );
    fixture.hourly.is_day.push(i % 24 >= 6 && i % 24 < 18 ? 1 : 0);
  }
  await page.route("https://api.open-meteo.com/**", (r) =>
    r.fulfill({ json: fixture }),
  );
  await page.route("https://geocoding-api.open-meteo.com/**", (r) =>
    r.fulfill({
      json: {
        results: [
          {
            name: "東京",
            latitude: 35.68,
            longitude: 139.69,
            timezone: "Asia/Tokyo",
            country: "日本",
          },
        ],
      },
    }),
  );
  await page.goto("http://127.0.0.1:5173");
  await page.waitForFunction(
    () => document.querySelector("#temperature").textContent === "19",
  );
  assert.equal(await page.locator("#time").textContent(), "20:23");
  for (const [width, height, name] of [
    [1280, 720, "night"],
    [1024, 600, "7inch"],
    [800, 480, "small"],
    [390, 844, "mobile"],
  ]) {
    await page.setViewportSize({ width, height });
    // Viewport changes resolve before the browser dispatches resize on some runners.
    await page.waitForFunction(() => {
      const box = document.getElementById("clock").getBoundingClientRect();
      return (
        box.x >= -1 &&
        box.y >= -1 &&
        box.right <= innerWidth + 1 &&
        box.bottom <= innerHeight + 1
      );
    });
    const box = await page.locator("#clock").boundingBox();
    assert.ok(
      box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1,
      "clock stays inside viewport",
    );
    await page.screenshot({ path: `artifacts/clock-${name}.png` });
  }
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.getByRole("button", { name: "表示設定", exact: true }).focus();
  await page.getByRole("button", { name: "表示設定", exact: true }).click();
  await page.locator("#panel-width").fill("30");
  await page.getByRole("button", { name: "標準", exact: true }).click();
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.reload();
  assert.equal(
    await page.locator("#clock").getAttribute("data-density"),
    "standard",
  );
  assert.ok(
    (await page.locator("#clock").getAttribute("style")).includes("384px"),
  );
  await page.getByRole("button", { name: "表示設定", exact: true }).focus();
  await page.getByRole("button", { name: "表示設定", exact: true }).click();
  await page
    .getByRole("button", { name: "表示設定を戻す", exact: true })
    .click();
  await page.locator("#city").fill("Tokyo");
  await page.getByRole("button", { name: "検索", exact: true }).click();
  await page.getByRole("button", { name: "東京 — 日本" }).click();
  assert.equal(await page.locator("#location-name").textContent(), "東京");
  await page.clock.setSystemTime(new Date("2026-10-05T14:59:58Z"));
  await page.clock.runFor(1000);
  const marker = async () =>
    page
      .locator("#now-marker")
      .evaluate((e) => e.offsetTop / e.parentElement.clientHeight);
  assert.ok(Math.abs((await marker()) - 1 / 3) < 0.005);
  const position = async () =>
    page
      .locator('.hour-row[data-epoch="1791212400"]')
      .last()
      .evaluate((e) => e.getBoundingClientRect().y);
  const before = await position();
  await page.clock.runFor(3000);
  const after = await position();
  assert.ok(Math.abs(after - before) < 1, "midnight does not reset timeline");
  assert.ok(Math.abs((await marker()) - 1 / 3) < 0.005);
  await page.screenshot({ path: "artifacts/clock-midnight.png" });
  for (const [time, name] of [
    ["2026-10-06T03:23:36Z", "day"],
    ["2026-10-06T08:15:00Z", "sunset"],
  ]) {
    await page.clock.setSystemTime(new Date(time));
    await page.clock.runFor(1000);
    await page.screenshot({ path: `artifacts/clock-${name}.png` });
  }
  await page.unroute("https://api.open-meteo.com/**");
  await page.route("https://api.open-meteo.com/**", (r) => r.abort());
  await page.reload();
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("接続待ち"),
  );
  assert.equal(await page.locator("#temperature").textContent(), "19");
  assert.deepEqual(errors, []);
  console.log(
    "Passed: responsive viewports, settings persistence, location search, midnight continuity, fixed now marker, offline cache, day/night.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
