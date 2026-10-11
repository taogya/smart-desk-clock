const MINUTE = 60_000;
/** Pure warning decision; uses cached age and keeps the clock independent of API success. */
export function weatherNotice({ now, updated, failed, locationKey, formattedTime }) {
  const age = Number.isFinite(updated) && updated > 0 ? Math.max(0, now - updated) : Infinity;
  if (!Number.isFinite(age) && !failed) return null; // Initial request is still pending.
  if (age < 30 * MINUTE) return null;
  const level = age >= 120 * MINUTE ? "error" : "warning";
  return {
    key: `weather:${locationKey}:${updated ?? "none"}:${level}`,
    level,
    title: level === "error" ? "天気情報を更新できません" : "天気情報の更新が遅れています",
    detail: formattedTime ? `最終更新 ${formattedTime} · 自動再試行中` : "天気情報がありません · 自動再試行中",
  };
}
/** Reusable notification presentation, with per-session dismissal until a new incident/severity. */
export function createNoticeCenter({ banner, title, detail, close, storage = sessionStorage }) {
  const storageKey = "utsuroi-dismissed-notice";
  let dismissed = null;
  try { dismissed = storage.getItem(storageKey); } catch { /* Storage may be unavailable. */ }
  let current = null;
  function update(notice) {
    current = notice;
    if (!notice || notice.key === dismissed) { banner.hidden = true; return; }
    banner.dataset.level = notice.level;
    title.textContent = notice.title;
    detail.textContent = notice.detail;
    banner.hidden = false;
  }
  close.addEventListener("click", () => {
    if (!current) return;
    dismissed = current.key;
    try { storage.setItem(storageKey, dismissed); } catch { /* In-memory dismissal still works. */ }
    banner.hidden = true;
  });
  return { update };
}
