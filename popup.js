// Poke Idle Auto-Throw — popup controls
"use strict";

const DEFAULTS = { enabled: true, intervalMs: 800 };
const MIN_INTERVAL = 250;

const enabledEl = document.getElementById("enabled");
const intervalEl = document.getElementById("interval");
const statusEl = document.getElementById("status");

function render() {
  statusEl.textContent = enabledEl.checked
    ? `Active — throwing every ${intervalEl.value} ms`
    : "Paused";
}

// Load current settings into the UI.
chrome.storage.sync.get(DEFAULTS, (stored) => {
  const s = { ...DEFAULTS, ...stored };
  enabledEl.checked = s.enabled;
  intervalEl.value = s.intervalMs;
  render();
});

enabledEl.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: enabledEl.checked });
  render();
});

function commitInterval() {
  let ms = Number(intervalEl.value);
  if (!Number.isFinite(ms) || ms < MIN_INTERVAL) ms = MIN_INTERVAL;
  ms = Math.round(ms);
  intervalEl.value = ms;
  chrome.storage.sync.set({ intervalMs: ms });
  render();
}

intervalEl.addEventListener("change", commitInterval);
