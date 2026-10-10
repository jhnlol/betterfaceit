<p align="center">
  <img src="icons/icon128.png" width="96" alt="Better Faceit logo">
</p>

<h1 align="center">Better Faceit</h1>

<p align="center">
  A browser extension that adds themes, player stats, a trust factor and match intel to FACEIT.<br>
  Change how the site looks and scout your opponents before every match.
</p>

<p align="center">
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-v3-blue">
  <img alt="Chrome 117+" src="https://img.shields.io/badge/chrome-117%2B-green">
  <img alt="MIT license" src="https://img.shields.io/badge/license-MIT-orange">
  <img alt="No build step" src="https://img.shields.io/badge/build-none-lightgrey">
</p>

---

## Features

### 🎨 Look
- **15 built-in themes**: FACEIT (native), Midnight, Toxic, Purple Haze, Blood, Synthwave, Ocean, Royal Gold, AMOLED, Nord, Dracula, Tokyo Night, Catppuccin, Gruvbox and Rosé Pine
- **Custom theme editor**: start from any preset or generate a random palette, then set your own colors
- **Background**: effects (accent glow, aurora, grid, dots, vignette) and an image from any URL, with adjustable dimming
- **Panels**: roundness, borders (theme or accent color), accent line, hover highlight, opacity, frosted-glass blur and shadows (none / strong / accent glow)
- **Fonts**: Inter, Montserrat, Poppins, Rajdhani, Exo 2, Chakra Petch, JetBrains Mono, or system fonts, plus page zoom
- **Page tweaks**: accent and thin scrollbars, hide ads, turn off animations
- **Custom CSS**: your own rules on top of everything, included in exported theme codes

### 📊 Stats in the match room
A row of stats inside every player's card, computed from their last 20, 50 or 100 matches, in a default, minimal or filled style. You choose which ones to show:

- Playstyle role (AWP, Entry, Lurk, Support, Rifler) and last-5 form
- K/D, win rate, match count, ADR
- Average kills, deaths and assists, HS%
- Steam profile link

Hover over a player to open a **player card**: ELO graph and trend, playstyle with tendency meters compared to an average player, recent stats against career K/D, their maps and the trust factor breakdown.

### 🧭 Playstyle
Each player gets a role read from FACEIT's extended stats: how often they take the opening duel (and win it), how often they end up alone in a 1vX, how many flashes and how much nade damage they throw, and what share of their kills are with the AWP. When the map is known, the role on that map is used too, so a part-time AWPer shows up as the AWP on the map where they pick it up.

> FACEIT doesn't record positions, so which site a player goes to can't be known without parsing demos. "Lurker" means a player who rarely opens rounds and often ends up alone late in them.

### 🛡️ Trust factor and smurf warning
- **Trust factor (0–100)**: a score based on account age and total matches, recent K/D, HS%, ADR, win rate and ELO gain (judged against the player's ELO, sample size and account maturity), plus sudden jumps compared to lifetime stats. Verified and premium accounts get a small bonus. Hover over it to see why the score is what it is.
- **Smurf warning**: flags new or low-match accounts with suspiciously strong stats.

> These are heuristics, not proof. A low score or a smurf flag doesn't mean anyone is cheating.

### ⚡ Match Intel
A side panel in the match room that analyzes the enemy team:

- Overview of the team and the picked map
- Playstyle of every player and the team's lineup (AWP, entry, lurk, support), with how to play against each of them
- Their strengths and weaknesses
- Tips on how to win
- Their most played maps
- A per-player table with stats, K/D on the current map, trust factor and smurf flags

## Installation

### From a release (recommended)
1. Download `faceitbetter-<version>.zip` from the [Releases](../../releases) page and unzip it.
2. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`, …).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the unzipped folder.

### From source
```bash
git clone https://github.com/jhnlol/betterfaceit.git
```
Then follow steps 2–4 above and select the cloned folder. There's no build step: the extension runs straight from the source.

Works in Chrome 117+ and other Chromium-based browsers.

## Usage
1. Open [faceit.com](https://www.faceit.com).
2. Click the extension icon to open the settings popup:
   - **Look**: themes, style and page options
   - **Player**: match-room stats, Match Intel, match range and protection options
3. Join a match room. Stats appear under each player, and the **⚡ MATCH INTEL** tab appears on the right edge of the screen.

Settings are saved with `chrome.storage.sync`, so they follow your browser profile.

## How it works
- The extension only runs on `*.faceit.com` and asks for just one permission: `storage`.
- Stats come from FACEIT's own web API (the same endpoints the site uses), called from the page with your existing session. **No external servers, no tracking, no API keys.**
- Requests are queued (at most 4 at a time) and retried on rate limits or server errors.
- The only third-party request is to Google Fonts, and only when you pick a Google font.

## Project structure
```
manifest.json            Extension manifest (MV3)
icons/                   Extension icons
src/
  shared/                Code shared by the popup and content scripts
    settings.js          Default settings, load/save via chrome.storage.sync
    themes.js            Theme presets, fonts, CSS generation
    colors.js            Color helpers
    chips.js             Stat chip rendering (used in the room and the popup preview)
    format.js, icons.js  Formatting helpers and inline SVG icons
  content/               Content scripts injected into faceit.com
    theme.js, sheets.js, dom.js   Applying themes and styles to the page
    panels.js            Detecting page panels for borders and backgrounds
    api.js               FACEIT API client (queue + retry)
    room.js              Match room state (teams, players, picked map)
    analysis.js          Stats, trust factor, smurf check, team analysis
    badges.js            Stat rows under player nicknames
    intel.js             Match Intel side panel
  popup/                 Settings popup (HTML/CSS/JS)
.github/workflows/       Builds a ZIP and attaches it to each GitHub release
```

## Releasing
Publish a GitHub release, e.g. with the tag `v1.1`. The workflow in `.github/workflows/build-release.yml` packages `icons/`, `src/` and `manifest.json` into `faceitbetter-v1.1.zip` and attaches it to the release. Remember to bump `version` in `manifest.json` first.

## Contributing
Issues and pull requests are welcome. Some notes:
- Plain JavaScript, no dependencies, no bundler. Each file is an IIFE that registers itself on the shared `globalThis.FB` namespace.
- FACEIT changes its markup from time to time. If stats stop appearing, the selectors in `src/content/badges.js` are usually the first thing to check.
- After changing code, reload the extension in `chrome://extensions` and refresh the FACEIT tab.

## Disclaimer
Better Faceit is an unofficial project. It isn't affiliated with, endorsed by or connected to FACEIT. All trademarks belong to their owners. Use it at your own risk.

## License
[MIT](LICENSE)
