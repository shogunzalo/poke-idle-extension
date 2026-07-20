// Poke Idle Auto-Throw — content script
// Repeatedly clicks the game's `button.cap-throw` buttons while they are visible
// so Pokémon get caught hands-free. When several Pokémon are down at once the
// game shows one throw button per `.cap-row`, so we handle ALL of them, not just
// the first. Runs only on the game domain (see manifest).

(() => {
  "use strict";

  const DEFAULTS = { enabled: true, intervalMs: 800, jitterMs: 400 };
  const MIN_INTERVAL = 250;

  let settings = { ...DEFAULTS };
  let timer = null;

  // Per-button state, keyed by the element itself. A WeakMap lets entries be
  // garbage-collected automatically when the game removes a button from the DOM.
  //   state = { wasActionable, lastThrow, pending }
  const buttonState = new WeakMap();
  // Live set of button states that currently have a scheduled (jittered) throw,
  // so we can cancel and reset them all on stop/restart — a WeakMap isn't
  // iterable.
  const pendingStates = new Set();

  // Primary selector (class-only). The full descendant chain is a fallback in
  // case `cap-throw` ever becomes ambiguous on the page.
  const PRIMARY = "button.cap-throw";
  const FALLBACK = ".game-root .cap-panel .cap-list .cap-row button.cap-throw";

  // Every throw button currently on the page (there can be several at once).
  function findButtons() {
    const primary = document.querySelectorAll(PRIMARY);
    return primary.length ? primary : document.querySelectorAll(FALLBACK);
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

    for (const btn of findButtons()) {
      const actionable = isActionable(btn);

      let state = buttonState.get(btn);
      if (!state) {
        state = { wasActionable: false, lastThrow: 0, pending: null };
        buttonState.set(btn, state);
      }

      // Edge-triggered PER BUTTON: click only on the RISING edge — the first
      // tick this particular button becomes actionable. We then wait for it to
      // go away (falling edge) before clicking it again. This throws exactly
      // once per appearance instead of hammering a button while it sits there,
      // which is what was jamming the game.
      if (actionable && !state.wasActionable && state.pending === null) {
        const now = performance.now();
        // Safety floor: never fire two throws at the same button closer than one
        // interval apart, even if it flickers off/on quickly.
        if (now - state.lastThrow >= settings.intervalMs) {
          // Humanize: wait a small random delay before actually clicking so the
          // throw timing isn't robotically instant. Re-check that the button is
          // still actionable when the delay elapses (it may have vanished).
          const delay = Math.random() * Math.max(0, Number(settings.jitterMs) || 0);
          state.pending = setTimeout(() => {
            state.pending = null;
            pendingStates.delete(state);
            if (settings.enabled && !document.hidden && isActionable(btn)) {
              state.lastThrow = performance.now();
              throwBall(btn);
            }
          }, delay);
          pendingStates.add(state);
        }
      }

      state.wasActionable = actionable;
    }
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
    // Cancel any scheduled throws and clear their pending flag so a fresh start
    // can throw those buttons again. Reset the edge flag too so a button that is
    // already actionable re-triggers on the next tick.
    for (const state of pendingStates) {
      clearTimeout(state.pending);
      state.pending = null;
      state.wasActionable = false;
    }
    pendingStates.clear();
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
    if (changes.jitterMs) settings.jitterMs = changes.jitterMs.newValue;
    if (restart) startLoop();
  });
})();
