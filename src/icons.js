export function icon(type, night = false) {
  const sun =
    '<circle cx="32" cy="30" r="10"/><path d="M32 10v5m0 30v5M12 30h5m30 0h5M18 16l4 4m20 20 4 4M18 44l4-4m20-20 4-4"/>';
  const cloud =
    '<path d="M17 43h29a10 10 0 0 0 0-20 15 15 0 0 0-28-3 12 12 0 0 0-1 23Z"/>';
  const moon = '<path d="M43 14a21 21 0 1 0 7 32 22 22 0 0 1-7-32Z"/>';
  let shape =
    type === "sun"
      ? night
        ? moon
        : sun
      : type === "partly"
        ? '<g transform="translate(-6,-6) scale(.8)">' +
          (night ? moon : sun) +
          "</g>" +
          cloud
        : cloud;
  if (type === "rain") shape += '<path d="m23 49-3 6m13-6-3 6m13-6-3 6"/>';
  if (type === "storm") shape += '<path d="m34 43-8 10h9l-5 9"/>';
  if (type === "snow")
    shape += '<path d="M25 48v10m-4-8 8 6m0-6-8 6m21-8v10m-4-8 8 6m0-6-8 6"/>';
  if (type === "fog") shape += '<path d="M16 49h32M22 56h20"/>';
  if (type === "unknown")
    shape = '<path d="M25 23a8 8 0 1 1 12 7c-5 3-5 4-5 9m0 8v1"/>';
  return `<svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`;
}

export function pressureFace(level) {
  // Solid muted colors represent outlook severity, without changing the forecast.
  let face;
  if (level === "smile") {
    face =
      '<path d="M22 27c2-2 4-2 6 0m8 0c2-2 4-2 6 0"/><path class="filled-feature" d="M22 36c2 9 18 9 20 0Z"/>';
  } else if (level === "watch") {
    face =
      '<circle class="filled-feature" cx="25" cy="28" r="1.8"/><circle class="filled-feature" cx="39" cy="28" r="1.8"/><path d="M24 39c4-2 12-2 16 0"/>';
  } else if (level === "pain") {
    face =
      '<path d="m20 24 8 3m8 0 8-3M21 31l6 5m0-5-6 5"/><path d="M37 32c2-2 4-2 6 0"/><path d="M24 42c4-5 12-5 16 0"/><path d="m55 21 3-3m-2 8 4-1"/>';
  } else {
    face =
      '<circle class="filled-feature" cx="25" cy="29" r="1.8"/><circle class="filled-feature" cx="39" cy="29" r="1.8"/><path d="M26 40h12"/>';
  }
  return `<svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><circle class="face-disc" cx="32" cy="32" r="22"/><g class="face-features">${face}</g></svg>`;
}
