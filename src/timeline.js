import {
  parts,
  weather,
  number,
  timelineWindow,
  TIMELINE_HOURS,
} from "./domain.js";
import { icon } from "./icons.js";
let previousData,
  previousZone,
  previousDay,
  layers = [];
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export function updateTimeline(data, now, zone) {
  const host = document.getElementById("timeline-layers"),
    h = data?.hourly;
  const day = parts(now, zone).key;
  if (
    previousData !== data ||
    previousZone !== zone ||
    previousDay !== day ||
    !layers.length
  ) {
    const layer = document.createElement("div");
    layer.className = "timeline-layer";
    const first = h?.time[0] ?? now.getTime() / 1000 - 86400,
      last = h?.time.at(-1) ?? first + 4 * 86400;
    const duration = last - first + 3600;
    layer.style.height = `${(duration / (TIMELINE_HOURS * 3600)) * 100}%`;
    const ribbon = document.createElement("div");
    ribbon.className = "weather-ribbon";
    if (h?.time.length) {
      const stops = h.time.map(
        (t, i) =>
          `${weather(h.weather_code[i]).color} ${((t - first) / duration) * 100}%`,
      );
      ribbon.style.background = `linear-gradient(to bottom,${stops.join(",")})`;
    }
    layer.append(ribbon);
    // One tick every 3 local hours. Epoch positioning remains monotonic over DST.
    if (h)
      for (let i = 0; i < h.time.length; i++) {
        const p = parts(new Date(h.time[i] * 1000), zone);
        if (+p.hour % 3 !== 0) continue;
        const row = document.createElement("div");
        row.className = "hour-row";
        row.dataset.epoch = h.time[i];
        row.style.top = `${((h.time[i] - first) / duration) * 100}%`;
        const w = weather(h.weather_code[i]);
        row.innerHTML = `<span class="hour">${p.hour}<small>時</small></span>${icon(w.icon, h.is_day[i] === 0)}<span class="hour-temp">${number(h.temperature_2m[i])}°</span>`;
        if (p.hour === "00") {
          const label = document.createElement("span");
          label.className = "day-label";
          label.textContent = p.key === day ? "今日" : `${+p.month}/${+p.day}`;
          row.append(label);
        }
        const chance = h.precipitation_probability[i];
        if (typeof chance === "number" && chance > 0) {
          const rain = document.createElement("span");
          rain.className = "rain-chance";
          rain.textContent = `${chance}%`;
          row.append(rain);
        }
        row.setAttribute(
          "aria-label",
          `${+p.month}月${+p.day}日${p.hour}時 ${w.label} ${number(h.temperature_2m[i])}度、降水確率${number(chance)}パーセント`,
        );
        layer.append(row);
      }
    const old = layers;
    const entry = { el: layer, first, duration };
    layers = [...old, entry];
    host.append(layer);
    move(entry, now, true);
    if (old.length && !reduced() && previousZone === zone) {
      layer.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1600,
        easing: "ease-in-out",
      });
      for (const e of old)
        e.el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 1600,
          easing: "ease-in-out",
        });
      setTimeout(() => {
        for (const e of old) e.el.remove();
        layers = layers.filter((e) => !old.includes(e));
      }, 1600);
    } else {
      for (const e of old) e.el.remove();
      layers = [entry];
    }
    previousData = data;
    previousZone = zone;
    previousDay = day;
  }
  for (const entry of layers) move(entry, now);
}
function move(entry, now, instant = false) {
  const start = timelineWindow(now).start;
  entry.el.style.transition = instant ? "none" : "";
  entry.el.style.transform = `translateY(${(-(start - entry.first) / entry.duration) * 100}%)`;
  for (const row of entry.el.querySelectorAll(".hour-row"))
    row.classList.toggle("past", +row.dataset.epoch < now.getTime() / 1000);
}
