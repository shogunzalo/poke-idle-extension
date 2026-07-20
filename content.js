// Poke Idle Auto-Throw — content script
// Repeatedly clicks the game's `button.cap-throw` while it is visible so
// Pokémon get caught hands-free. Runs only on the game domain (see manifest).

(() => {
  "use strict";

  const DEFAULTS = { enabled: true, intervalMs: 800 };
  const MIN_INTERVAL = 250;

  let settings = { ...DEFAULTS };
  let timer = null;
  let lastThrow = 0; // timestamp guard so we don't hammer mid-animation
  let wasActionable = false; // edge detection: was the button clickable last tick?

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
    // A single native click. Firing extra mousedown/mouseup as well made the
    // game process 2-3 interactions per throw, which slowed the page.
    el.click();
  }

  function tick() {
    if (!settings.enabled) return;
    if (document.hidden) return; // don't work while the tab is in the background

    const btn = findButton();
    const actionable = isActionable(btn);

    // Edge-triggered: click only on the RISING edge — i.e. the first tick the
    // button becomes actionable. We then wait for it to go away (falling edge)
    // before we're allowed to click again. This throws exactly once per
    // appearance instead of hammering the button while it sits there, which is
    // what was jamming the game.
    if (actionable && !wasActionable) {
      const now = performance.now();
      // Safety floor: never fire two throws closer than one interval apart,
      // even if the button flickers off/on quickly.
      if (now - lastThrow >= settings.intervalMs) {
        lastThrow = now;
        throwBall(btn);
      }
    }

    wasActionable = actionable;
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
