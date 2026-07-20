// Poke Idle Auto-Throw — popup controls
"use strict";

const DEFAULTS = { enabled: true, intervalMs: 800, jitterMs: 400 };
const MIN_INTERVAL = 250;

const enabledEl = document.getElementById("enabled");
const intervalEl = document.getElementById("interval");
const jitterEl = document.getElementById("jitter");
const statusEl = document.getElementById("status");

function render() {
  if (!enabledEl.checked) {
    statusEl.textContent = "Paused";
    return;
  }
  const jitter = Number(jitterEl.value) || 0;
  statusEl.textContent = jitter > 0
    ? `Active — every ${intervalEl.value} ms + up to ${jitter} ms random`
    : `Active — throwing every ${intervalEl.value} ms`;
}

// Load current settings into the UI.
chrome.storage.sync.get(DEFAULTS, (stored) => {
  const s = { ...DEFAULTS, ...stored };
  enabledEl.checked = s.enabled;
  intervalEl.value = s.intervalMs;
  jitterEl.value = s.jitterMs;
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

function commitJitter() {
  let ms = Number(jitterEl.value);
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  ms = Math.round(ms);
  jitterEl.value = ms;
  chrome.storage.sync.set({ jitterMs: ms });
  render();
}

jitterEl.addEventListener("change", commitJitter);
