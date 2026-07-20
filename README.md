# Poke Idle Auto-Throw

A tiny Chrome/Edge (Manifest V3) browser extension that automatically clicks the
**throw** button in the idle Pokémon-catching game at
[poke.idleworld.online](https://poke.idleworld.online/play) — so catches happen
hands-free.

While enabled, it repeatedly clicks `button.cap-throw` on a configurable interval
whenever the button is visible and actionable. When there's no active encounter,
it does nothing.

## Features

- ⚡ Repeats throws while the catch button is on screen (idle farming)
- 🎛️ Popup controls: on/off toggle and adjustable interval (min 250 ms)
- 🔒 Runs **only** on `poke.idleworld.online` — no activity on other sites
- 🪶 No build step, no dependencies, no tracking

## Install (Load unpacked)

This extension isn't on the Chrome Web Store — load it directly:

1. Download or clone this repo:
   ```bash
   git clone https://github.com/shogunzalo/poke-idle-extension.git
   ```
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `poke-idle-extension` folder.
5. Open [the game](https://poke.idleworld.online/play). During an encounter the
   throw button will be clicked automatically.

## Usage

Click the extension's toolbar icon to open the popup:

- **Auto-throw** — turn the auto-clicker on or off (applies instantly, no reload).
- **Interval (ms)** — how often to click while the button is visible (default 800 ms).

## How it works

`content.js` runs a `setInterval` loop that looks for `button.cap-throw`
(falling back to the full `.game-root .cap-panel .cap-list .cap-row button.cap-throw`
selector), verifies the button is visible and enabled, then clicks it. Settings are
stored in `chrome.storage.sync`, and the content script reacts to popup changes live.

## Files

| File           | Purpose                                             |
| -------------- | --------------------------------------------------- |
| `manifest.json`| Manifest V3 config, scoped to the game domain       |
| `content.js`   | The auto-throw loop                                 |
| `popup.html`   | Popup UI                                            |
| `popup.js`     | Popup logic (reads/writes settings)                 |

## Troubleshooting

- **Nothing happens:** open DevTools on the game page and check the console. If the
  button lives in a **cross-origin iframe**, add that host to `matches` in
  `manifest.json` (same-origin frames are already covered via `all_frames`).
- **Clicks are ignored by the game:** some frameworks only respond to full pointer
  events. `content.js` already dispatches `mousedown`/`mouseup`; you can extend it
  with `pointerdown`/`pointerup` if needed.

## License

[MIT](LICENSE) — free for anyone to use, modify, and distribute.

> Not affiliated with the game or its developers. Use responsibly and at your own
> risk; automating gameplay may be against a game's terms of service.
