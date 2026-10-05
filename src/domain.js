export const DEFAULT_LOCATION = {
  name: "仙台",
  latitude: 38.2682,
  longitude: 140.8694,
  timezone: "Asia/Tokyo",
};
export function parts(date, timeZone) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return {
    ...p,
    key: `${p.year}-${p.month}-${p.day}`,
    minuteOfDay: +p.hour * 60 + +p.minute + +p.second / 60,
  };
}
export function weather(code) {
  if (code === 0)
    return { kind: "clear", label: "晴れ", color: "#e6bf79", icon: "sun" };
  if (code === 1 || code === 2)
    return {
      kind: "partly",
      label: "晴れ時々くもり",
      color: "#b4b6a0",
      icon: "partly",
    };
  if (code === 3)
    return { kind: "cloudy", label: "くもり", color: "#929fa7", icon: "cloud" };
  if (code === 45 || code === 48)
    return { kind: "cloudy", label: "霧", color: "#a9b4b8", icon: "fog" };
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return { kind: "snow", label: "雪", color: "#dae9e9", icon: "snow" };
  if ([95, 96, 99].includes(code))
    return { kind: "storm", label: "雷雨", color: "#8c85b7", icon: "storm" };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return { kind: "rain", label: "雨", color: "#609abe", icon: "rain" };
  return {
    kind: "unknown",
    label: "天気情報なし",
    color: "#566771",
    icon: "unknown",
  };
}
export function moonPhase(date) {
  const period = 29.530588853,
    days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  const age = ((days % period) + period) % period,
    phase = age / period;
  const names = [
    "新月",
    "三日月",
    "上弦の月",
    "満ちていく月",
    "満月",
    "欠けていく月",
    "下弦の月",
    "細くなる月",
  ];
  return { age, phase, name: names[Math.round(phase * 8) % 8] };
}
// Orthographic illuminated lunar hemisphere; waxing lights the right side.
export function moonPath(phase) {
  const c = Math.cos(phase * 2 * Math.PI),
    side = phase < 0.5 ? 1 : -1,
    points = [];
  for (let i = 0; i <= 60; i++) {
    const y = -1 + (2 * i) / 60;
    points.push([side * Math.sqrt(Math.max(0, 1 - y * y)), y]);
  }
  for (let i = 60; i >= 0; i--) {
    const y = -1 + (2 * i) / 60;
    points.push([side * c * Math.sqrt(Math.max(0, 1 - y * y)), y]);
  }
  return "M" + points.map((p) => p.join(",")).join("L") + "Z";
}
export function dayIndex(data, date, zone) {
  return data.daily.time.findIndex(
    (t) => parts(new Date(t * 1000), zone).key === parts(date, zone).key,
  );
}
export const number = (value) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.round(value).toString()
    : "--";

export const TIMELINE_HOURS = 18;
export const PAST_HOURS = 6;
export function timelineWindow(now) {
  const center = now.getTime() / 1000;
  return {
    start: center - PAST_HOURS * 3600,
    end: center + (TIMELINE_HOURS - PAST_HOURS) * 3600,
    nowPosition: PAST_HOURS / TIMELINE_HOURS,
  };
}
