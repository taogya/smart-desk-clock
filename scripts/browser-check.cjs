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
      pressure_msl: 1012.4,
      weather_code: 2,
      is_day: 0,
    },
    hourly: {
      time: [],
      temperature_2m: [],
      pressure_msl: [],
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
    fixture.hourly.pressure_msl.push(
      1012 + Math.sin((i / 24) * Math.PI * 2) * 0.6,
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
    [375, 812, "mobile-375"],
    [320, 700, "mobile-320"],
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
    const pressureBounds = await page.evaluate(() => {
      const p = document.querySelector(".main-panel").getBoundingClientRect();
      const s = document.querySelector("#pressure-summary").getBoundingClientRect();
      const children = [...document.querySelector("#pressure-summary").children].map(
        (e) => e.getBoundingClientRect(),
      );
      return {
        panelLeft: p.left,
        panelRight: p.right,
        summaryLeft: s.left,
        summaryRight: s.right,
        childLeft: Math.min(...children.map((r) => r.left)),
        childRight: Math.max(...children.map((r) => r.right)),
        humidityRight: document.querySelector(".humidity").getBoundingClientRect().right,
        headlineBottom: document.querySelector(".pressure-headline").getBoundingClientRect().bottom,
        faceTop: document.querySelector(".pressure-face").getBoundingClientRect().top,
        faceWidth: document.querySelector(".pressure-face").getBoundingClientRect().width,
        conditionsRight: document.querySelector(".conditions").getBoundingClientRect().right,
        mainRight: p.right,
        forecastTop: document.querySelector(".forecast-panel").getBoundingClientRect().top,
        timelineTop: document.querySelector(".timeline").getBoundingClientRect().top,
      };
    });
    assert.ok(
      pressureBounds.summaryLeft >= pressureBounds.panelLeft - 1 &&
        pressureBounds.summaryRight <= pressureBounds.panelRight + 1 &&
        pressureBounds.childLeft >= pressureBounds.panelLeft - 1 &&
        pressureBounds.childRight <= pressureBounds.panelRight + 1,
      `pressure stays inside main panel: ${JSON.stringify(pressureBounds)}`,
    );
    assert.ok(
      pressureBounds.summaryLeft >= pressureBounds.humidityRight - 1 &&
        pressureBounds.faceTop >= pressureBounds.headlineBottom - 1,
      `pressure stays to the right of humidity and face below reading: ${JSON.stringify(pressureBounds)}`,
    );
    assert.ok(
      pressureBounds.summaryRight <= pressureBounds.mainRight + 1 &&
        pressureBounds.faceWidth >= (width > 700 ? 40 : 50),
      `pressure readable and inside main panel: ${JSON.stringify(pressureBounds)}`,
    );
    assert.ok(
      pressureBounds.timelineTop - pressureBounds.forecastTop <= (height / 720) * 28 + 8,
      `forecast timeline starts near the panel top: ${JSON.stringify(pressureBounds)}`,
    );
    await page.screenshot({ path: `artifacts/clock-${name}.png` });
  }
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.getByRole("button", { name: "表示設定", exact: true }).focus();
  await page.getByRole("button", { name: "表示設定", exact: true }).click();
  await page.locator("#panel-width").fill("30");
  await page.getByRole("button", { name: "小さめ", exact: true }).click();
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.reload();
  assert.ok(
    (await page.locator("#clock").getAttribute("style")).includes(
      "--text-scale: 0.85",
    ),
  );
  assert.ok(
    (await page.locator("#clock").getAttribute("style")).includes("384px"),
  );
  await page.getByRole("button", { name: "表示設定", exact: true }).focus();
  await page.getByRole("button", { name: "表示設定", exact: true }).click();
  await page
    .getByRole("button", { name: "表示設定を戻す", exact: true })
    .click();
  // Exercise both independent sliders at their extremes on the actual 7-inch resolution.
  for (const size of [85, 100, 120]) {
    for (const width of [23, 30]) {
      await page.locator("#text-size").fill(String(size));
      await page.locator("#panel-width").fill(String(width));
      await page.getByRole("button", { name: "閉じる", exact: true }).click();
      await page.screenshot({
        path: `artifacts/clock-size-${size}-width-${width}.png`,
      });
      const geometry = await page.evaluate(() => {
        const rect = (selector) =>
          document.querySelector(selector).getBoundingClientRect();
        const time = rect(".time-line"),
          conditions = rect(".conditions"),
          celestial = rect(".celestial"),
          main = rect(".main-panel");
        return {
          timeBottom: time.bottom,
          conditionsTop: conditions.top,
          conditionsBottom: conditions.bottom,
          celestialTop: celestial.top,
          clockRight: rect("#seconds").right,
          mainLeft: main.left,
          mainRight: main.right,
          pressureLeft: rect("#pressure-summary").left,
          pressureRight: rect("#pressure-summary").right,
        };
      });
      assert.ok(
        geometry.timeBottom <= geometry.conditionsTop + 1,
        JSON.stringify(geometry),
      );
      assert.ok(
        geometry.conditionsBottom <= geometry.celestialTop + 1,
        JSON.stringify(geometry),
      );
      assert.ok(
        geometry.clockRight < geometry.mainRight,
        JSON.stringify(geometry),
      );
      assert.ok(
        geometry.pressureLeft >= geometry.mainLeft - 1 &&
          geometry.pressureRight <= geometry.mainRight + 1,
        JSON.stringify(geometry),
      );
      await page.getByRole("button", { name: "表示設定", exact: true }).focus();
      await page.getByRole("button", { name: "表示設定", exact: true }).click();
    }
  }
  await page
    .getByRole("button", { name: "表示設定を戻す", exact: true })
    .click();
  assert.equal(await page.locator("#now-label").isVisible(), false);
  assert.equal(await page.locator("#pressure-value").textContent(), "1012");
  assert.equal(await page.locator("#pressure-face svg").count(), 1);
  assert.equal(
    await page.locator(".github-link").getAttribute("href"),
    "https://github.com/taogya/smart-desk-clock",
  );
  await page.locator("#city").fill("Tokyo");
  await page.getByRole("button", { name: "検索", exact: true }).click();
  await page.getByRole("button", { name: "東京 — 日本" }).click();
  assert.equal(await page.locator("#location-name").textContent(), "東京");
  await page.waitForFunction(
    () => document.getElementById("temperature").textContent === "19",
  );
  await page.clock.setSystemTime(new Date("2026-10-05T14:59:58Z"));
  await page.clock.runFor(1000);
  const marker = async () =>
    page
      .locator("#now-marker")
      .evaluate((e) => e.offsetTop / e.parentElement.clientHeight);
  assert.ok(Math.abs((await marker()) - 1 / 8) < 0.005);
  const position = async () =>
    page
      .locator('.hour-row[data-epoch="1791212400"]')
      .last()
      .evaluate((e) => e.getBoundingClientRect().y);
  await page.waitForFunction(
    () => document.getElementById("time").textContent === "23:59",
  );
  await page.screenshot({ path: "artifacts/clock-before-midnight.png" });
  const before = await position();
  await page.clock.runFor(3000);
  await page.waitForFunction(
    () => document.getElementById("time").textContent === "00:00",
  );
  await page.screenshot({ path: "artifacts/clock-after-midnight.png" });
  const after = await position();
  assert.ok(
    Math.abs(after - before) < 1,
    `midnight does not reset timeline: before=${before}, after=${after}`,
  );
  assert.ok(Math.abs((await marker()) - 1 / 8) < 0.005);
  await page.screenshot({ path: "artifacts/clock-midnight.png" });
  for (const [time, name] of [
    ["2026-10-06T03:23:36Z", "day"],
    ["2026-10-06T08:15:00Z", "sunset"],
  ]) {
    await page.clock.setSystemTime(new Date(time));
    await page.clock.runFor(1000);
    await page.screenshot({ path: `artifacts/clock-${name}.png` });
  }
  // A large time jump must catch up on the same quadratic sun arc, not
  // interpolate cx/cy along a straight chord.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.setSystemTime(new Date("2026-10-06T00:00:00Z"));
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await page.clock.runFor(3000);
  await page.clock.setSystemTime(new Date("2026-10-06T04:00:00Z"));
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await page.clock.runFor(700);
  const sunMid = await page.locator("#sun-dot").evaluate((dot) => ({
    cx: +dot.getAttribute("cx"),
    cy: +dot.getAttribute("cy"),
    catching: document
      .getElementById("sun-path")
      .classList.contains("sun-catching-up"),
  }));
  const sunMidP = (sunMid.cx - 24) / 512;
  const expectedArcY = 98 - 332 * sunMidP * (1 - sunMidP);
  assert.equal(sunMid.catching, true);
  assert.ok(
    Math.abs(sunMid.cy - expectedArcY) < 0.6,
    `sun stays on arc while catching up: ${JSON.stringify({ sunMid, expectedArcY })}`,
  );
  await page.clock.runFor(3000);
  assert.equal(
    await page.locator("#sun-path").evaluate((e) =>
      e.classList.contains("sun-catching-up"),
    ),
    false,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });

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
