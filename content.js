// Poke Idle Auto-Throw — content script
// Repeatedly clicks the game's `button.cap-throw` while it is visible so
// Pokémon get caught hands-free. Runs only on the game domain (see manifest).

(() => {
  "use strict";

  const DEFAULTS = { enabled: true, intervalMs: 800 };
  const MIN_INTERVAL = 250;

  let settings = { ...DEFAULTS };
  let timer = null;

  // Primary selector (class-only). The full descendant chain is a fallback in
  // case `cap-throw` ever becomes ambiguous on the page.
  const PRIMARY = "button.cap-throw";
  const FALLBACK = ".game-root .cap-panel .cap-list .cap-row button.cap-throw";

  function findButton() {
    return document.querySelector(PRIMARY) || document.querySelector(FALLBACK);
  }

  // Only click when the button is genuinely actionable.
  function isActionable(el) {
    if (!el || el.disabled) return false;
    if (el.getAttribute("aria-disabled") === "true") return false;
    if (el.offsetParent === null) return false; // hidden (display:none / detached)
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function throwBall(el) {
    // Standard click covers most React/DOM handlers.
    el.click();
    // Fallback for handlers that only listen for real pointer events.
    const opts = { bubbles: true, cancelable: true, view: window };
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
  }

  function tick() {
    if (!settings.enabled) return;
    const btn = findButton();
    if (isActionable(btn)) throwBall(btn);
  }

  function startLoop() {
    stopLoop();
    const ms = Math.max(MIN_INTERVAL, Number(settings.intervalMs) || DEFAULTS.intervalMs);
    timer = setInterval(tick, ms);
  }

  function stopLoop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  // Load persisted settings, then start.
  chrome.storage.sync.get(DEFAULTS, (stored) => {
    settings = { ...DEFAULTS, ...stored };
    startLoop();
  });

  // React live to popup changes (no page reload needed).
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    let restart = false;
    if (changes.enabled) settings.enabled = changes.enabled.newValue;
    if (changes.intervalMs) {
      settings.intervalMs = changes.intervalMs.newValue;
      restart = true;
    }
    if (restart) startLoop();
  });
})();
