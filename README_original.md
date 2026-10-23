# Workforce Showdown — Online Starter

A browser-playable workplace fighting-game prototype with two match modes, online room codes, mobile-friendly controls, a basic tournament registration/bracket preview, and a server-backed leaderboard.

## Modes
- **Employees vs Bosses**: choose the employee or boss side.
- **Free-for-All**: a free fighter-vs-fighter match. This starter currently supports two fighters per room.

## Run locally
1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run `npm install`
4. Run `npm start`
5. Open `http://localhost:3000` in two browser windows/devices on the same network for local testing.

## Publish online
Deploy this folder to a Node.js hosting provider that supports WebSockets/Socket.IO. Set the start command to `npm start`. The host must allow the app to write `data.json` for persistent leaderboard/tournament data; ephemeral file systems may reset that data after restarts. If using a platform with ephemeral storage, attach a persistent disk or replace the JSON store with a hosted database.

After deployment, share the public HTTPS URL. Both players must use the same URL to play online.

## Important prototype limits
- This is an early playable prototype, not a finished commercial/AAA game.
- The tournament feature collects entrants and displays first-round pairings once at least four entrants register. It does **not** yet automatically run a full bracket, assign winners through tournament matches, or enforce tournament integrity.
- Leaderboard points are recorded when an online room match ends. Fighter names are display names and are not verified accounts, so users can reuse another name.
- Free-for-All is currently a two-player match mode, not a multi-player battle royale.
- Character art, sound, animations, account login, anti-cheat, moderation, and production security still need development.
