import {
  DEFAULT_LOCATION,
  parts,
  weather,
  moonPhase,
  moonPath,
  dayIndex,
  number,
  pressureSignal,
} from "./domain.js";
import { icon, pressureFace } from "./icons.js";
import { updateTimeline } from "./timeline.js";
import { read, save, cacheKey, forecast, searchCities } from "./api.js";
const $ = (id) => document.getElementById(id);
let location = read("utsuroi-location") ?? DEFAULT_LOCATION;
try {
  parts(new Date(), location.timezone);
  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  )
    throw Error();
} catch {
  location = DEFAULT_LOCATION;
}
let cached = read(cacheKey(location)),
  data = cached?.data ?? null,
  updated = cached?.updated ?? null;
let activeRequest = null,
  lastDay = "",
  lastMinute = "",
  failed = false;
function fit() {
  if (innerWidth <= 700 && innerHeight > innerWidth) {
    $("clock").style.transform = "";
    document.body.style.height = "";
    document.body.style.overflow = "";
    return;
  }
  const scale = Math.min(innerWidth / 1280, innerHeight / 720);
  $("clock").style.transform = `scale(${scale})`;
  document.body.style.height = `${innerHeight}px`;
  document.body.style.overflow = "hidden";
}
addEventListener("resize", fit);
fit();
function formatTime(epoch) {
  return epoch
    ? new Intl.DateTimeFormat("ja-JP", {
        timeZone: location.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(epoch * 1000))
    : "--:--";
}
function status() {
  const age = updated ? Date.now() - updated : Infinity;
  const stale = age > 1800000;
  $("status").textContent = updated
    ? `${failed || stale ? "保存済み · " : ""}${formatTime(updated / 1000)} 更新${failed ? " · 接続待ち" : ""}`
    : failed
      ? "天気を取得できません · 自動再試行します"
      : "天気を取得しています";
}
function renderWeather(now) {
  $("location-name").textContent = location.name;
  const current = data?.current,
    w = weather(current?.weather_code),
    idx = data ? dayIndex(data, now, location.timezone) : -1;
  const rise = idx >= 0 ? data.daily.sunrise[idx] : null,
    set = idx >= 0 ? data.daily.sunset[idx] : null;
  const daytime =
    rise && set
      ? now.getTime() / 1000 >= rise && now.getTime() / 1000 < set
      : current?.is_day === 1;
  $("clock").dataset.night = String(!daytime);
  $("clock").dataset.weather = w.kind;
  const distance =
    rise && set
      ? Math.min(
          Math.abs(now.getTime() / 1000 - rise),
          Math.abs(now.getTime() / 1000 - set),
        )
      : Infinity;
  $("clock").style.setProperty(
    "--twilight",
    Math.max(0, 1 - distance / 2400).toFixed(3),
  );
  const nextIcon = icon(w.icon, !daytime);
  if ($("weather-icon").dataset.key !== `${w.icon}:${daytime}`) {
    const hadIcon = !!$("weather-icon").dataset.key;
    $("weather-icon").innerHTML = nextIcon;
    $("weather-icon").dataset.key = `${w.icon}:${daytime}`;
    if (hadIcon && !matchMedia("(prefers-reduced-motion: reduce)").matches)
      $("weather-icon").animate([{ opacity: 0.3 }, { opacity: 1 }], {
        duration: 1200,
      });
  }
  $("weather-label").textContent = w.label;
  $("temperature").textContent = number(current?.temperature_2m);
  $("humidity").textContent = number(current?.relative_humidity_2m);
  const pressure = pressureSignal(data, now);
  $("pressure-value").textContent = Number.isFinite(pressure.pressure)
    ? Math.round(pressure.pressure)
    : "--";
  $("pressure-trend").textContent =
    pressure.trend === "up" ? "↗" : pressure.trend === "down" ? "↘" : "→";
  $("pressure-face").innerHTML = pressureFace(pressure.level);
  $("pressure-summary").dataset.trend = pressure.trend;
  $("pressure-summary").dataset.level = pressure.level;
  const trendLabel =
    pressure.trend === "up"
      ? "上昇傾向"
      : pressure.trend === "down"
        ? "下降傾向"
        : "ほぼ安定";
  const levelLabel =
    pressure.level === "pain"
      ? "今後12時間に大きな気圧低下"
      : pressure.level === "watch"
        ? "今後12時間に気圧低下"
        : pressure.level === "smile"
          ? "今後12時間の気圧変動は小さめ"
          : "気圧変動情報なし";
  $("pressure-summary").setAttribute(
    "aria-label",
    `気圧 ${Number.isFinite(pressure.pressure) ? Math.round(pressure.pressure) : "不明"} ヘクトパスカル、${trendLabel}、${levelLabel}`,
  );
  $("high").textContent =
    `↑ ${number(idx >= 0 ? data.daily.temperature_2m_max[idx] : null)}°`;
  $("low").textContent =
    `↓ ${number(idx >= 0 ? data.daily.temperature_2m_min[idx] : null)}°`;
  $("sunrise").textContent = formatTime(rise);
  $("sunset").textContent = formatTime(set);
  let p =
    rise && set
      ? Math.max(0, Math.min(1, (now.getTime() / 1000 - rise) / (set - rise)))
      : 0;
  $("sun-dot").setAttribute("cx", 24 + 512 * p);
  $("sun-dot").setAttribute("cy", 98 - 332 * p * (1 - p));
  $("sun-dot").style.opacity = daytime ? 1 : 0;
  $("sun-progress").style.strokeDasharray = `${daytime ? p : 0} 1`;
  $("day-phase").textContent =
    rise && set ? (daytime ? "昼の時間" : "夜の時間") : "太陽情報なし";
  const moon = moonPhase(now);
  $("moon-light").setAttribute("d", moonPath(moon.phase));
  $("moon-name").textContent = moon.name;
  $("moon-age").textContent = `月齢 ${moon.age.toFixed(1)}`;
  $("moon").setAttribute(
    "aria-label",
    `${moon.name}、概算月齢 ${moon.age.toFixed(1)}`,
  );
  updateTimeline(data, now, location.timezone);
  status();
}
function tick() {
  const now = new Date(),
    p = parts(now, location.timezone);
  $("time").textContent = `${p.hour}:${p.minute}`;
  $("time").dateTime = now.toISOString();
  $("seconds").textContent = p.second;
  $("seconds-fill").style.width = `${(+p.second / 59) * 100}%`;
  $("date").textContent = new Intl.DateTimeFormat("ja-JP", {
    timeZone: location.timezone,
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
  updateTimeline(data, now, location.timezone);

  if (lastMinute !== `${p.key}:${p.hour}:${p.minute}`) {
    renderWeather(now);
    lastMinute = `${p.key}:${p.hour}:${p.minute}`;
  }
  if (lastDay && lastDay !== p.key) loadWeather();
  lastDay = p.key;
}
async function loadWeather() {
  if (activeRequest) activeRequest.abort();
  const controller = new AbortController();
  activeRequest = controller;
  const loc = location;
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const fresh = await forecast(loc, controller.signal);
    if (loc !== location) return;
    data = fresh;
    updated = Date.now();
    failed = false;
    save(cacheKey(loc), { data, updated });
  } catch {
    if (loc === location && activeRequest === controller) failed = true;
  } finally {
    clearTimeout(timeout);
    if (activeRequest === controller) {
      activeRequest = null;
      renderWeather(new Date());
    }
  }
}
$("location-button").onclick = () => {
  $("settings").showModal();
  $("city").focus();
};
$("display-settings").onclick = () => {
  $("settings").showModal();
  $("panel-width").focus();
};
$("close-settings").onclick = () => $("settings").close();
let searchId = 0;
$("search-form").onsubmit = async (event) => {
  event.preventDefault();
  const id = ++searchId;
  $("search-status").textContent = "検索中…";
  $("results").replaceChildren();
  try {
    const cities = await searchCities($("city").value.trim());
    if (id !== searchId) return;
    $("search-status").textContent = cities.length
      ? "表示する街を選んでください"
      : "見つかりませんでした。英語名でも試してください。";
    for (const city of cities) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${city.name} — ${city.detail}`;
      button.onclick = () => {
        location = city;
        save("utsuroi-location", location);
        cached = read(cacheKey(location));
        data = cached?.data ?? null;
        updated = cached?.updated ?? null;
        failed = false;
        lastDay = "";
        lastMinute = "";
        $("settings").close();
        tick();
        loadWeather();
      };
      $("results").append(button);
    }
  } catch {
    if (id === searchId)
      $("search-status").textContent =
        "検索できませんでした。接続を確認してください。";
  }
};
$("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    $("status").textContent = "このブラウザは全画面表示に対応していません";
  }
};
// The tab can recover from sleep, network loss, and a midnight rollover.
addEventListener("online", () => loadWeather());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    tick();
    if (!updated || Date.now() - updated > 900000) loadWeather();
  }
});
let display = read("utsuroi-display") ?? { textSize: 100, width: 25 };
// Preserve the old visual size when migrating saved two-step settings.
if (!Number.isFinite(display.textSize))
  display.textSize = display.density === "standard" ? 85 : 100;
delete display.density;
function applyDisplay() {
  display.textSize = Math.max(
    85,
    Math.min(120, Number(display.textSize) || 100),
  );
  display.width = Math.max(23, Math.min(30, Number(display.width) || 25));
  $("clock").style.setProperty("--text-scale", display.textSize / 100);
  $("clock").style.setProperty("--forecast-width", `${display.width * 12.8}px`);
  $("text-size").value = display.textSize;
  $("text-size-value").textContent = `${display.textSize}%`;
  $("text-size").setAttribute("aria-valuetext", `${display.textSize}%`);
  $("panel-width").value = display.width;
  $("panel-width-value").textContent = `${display.width}%`;
  document
    .querySelectorAll("[data-size-preset]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(+button.dataset.sizePreset === display.textSize),
      ),
    );
  save("utsuroi-display", display);
}
$("text-size").oninput = () => {
  display.textSize = +$("text-size").value;
  applyDisplay();
};
document.querySelectorAll("[data-size-preset]").forEach(
  (button) =>
    (button.onclick = () => {
      display.textSize = +button.dataset.sizePreset;
      applyDisplay();
    }),
);
$("panel-width").oninput = () => {
  display.width = +$("panel-width").value;
  applyDisplay();
};
$("reset-display").onclick = () => {
  display = { textSize: 100, width: 25 };
  applyDisplay();
};
let hideControls;
function revealControls() {
  $("clock").classList.add("controls-visible");
  clearTimeout(hideControls);
  hideControls = setTimeout(
    () => $("clock").classList.remove("controls-visible"),
    6000,
  );
}
addEventListener("pointermove", revealControls, { passive: true });
addEventListener("pointerdown", revealControls, { passive: true });
addEventListener("keydown", revealControls);
applyDisplay();
revealControls();
tick();
loadWeather();
setInterval(tick, 1000);
setInterval(loadWeather, 900000);
