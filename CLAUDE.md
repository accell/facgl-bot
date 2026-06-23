# CLAUDE.md

Guidance for AI assistants (and humans) working on this repository.

## Project

**facgl-bot** — a Discord bot built with [discord.js](https://discord.js.org/) v14 and the
[Sapphire framework](https://www.sapphirejs.dev/), written in **TypeScript** (CommonJS module output).

> History: this repo started life as a Laracord (PHP/Laravel Zero) template and was rewritten to
> discord.js + Sapphire before any real features were built. There is no PHP in the project anymore.

## Where the code lives (important)

- **Canonical working copy:** `~/code/facgl-bot` (`/home/accell/code/facgl-bot`) inside **WSL2 Ubuntu**.
  Do all development, builds, and git operations here.
- **Do NOT use** the legacy Windows copy at `C:\Users\me\Herd\facgl-bot` — it's a stale pre-rewrite
  leftover and is not what runs.
- Runtime: **Node.js** (v23 in dev, CI uses Node 22, `engines` requires `>=20`). Package manager: **npm**.
- The files are reachable from Windows at `\\wsl.localhost\Ubuntu\home\accell\code\facgl-bot` for
  browsing, but **build and run only inside WSL** (native Linux filesystem = fast; `/mnt/c` is slow).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Run in watch mode (tsx); auto-restarts on file changes. Primary dev loop. |
| `npm run build` | Compile TypeScript → `dist/` via `tsc`. |
| `npm start` | Run the compiled bot (`node dist/index.js`). Production entry. |
| `npm run typecheck` | `tsc --noEmit` — type errors only, no output. |
| `npm run format` / `format:check` | Prettier write / check. |

CI (`.github/workflows/main.yml`) runs **format:check → typecheck → build** on push/PR to `main`.
Keep all three green.

## Configuration — `.env` (gitignored, never commit)

Copy `.env.example` → `.env` and fill in:

- `DISCORD_TOKEN` — the bot token (required). From the Discord Developer Portal → Bot → Reset Token.
- `DISCORD_DEV_GUILD` — a guild (server) ID. When set, slash commands register to that **one guild
  instantly** (ideal for development). Leave blank to register **globally** (can take up to ~1 hour to
  propagate).
- `NODE_ENV` — set to `production` on the server to reduce log verbosity (defaults to debug logging).

## Architecture

- `src/index.ts` — entry point. Loads dotenv, creates a `SapphireClient` (intents: `Guilds` only,
  enough for slash commands), validates `DISCORD_TOKEN`, and logs in.
- `src/commands/` — Sapphire `Command` subclasses, **one command per file**. Auto-discovered by
  Sapphire; no manual registration needed.
- `src/listeners/` — Sapphire `Listener` subclasses for Discord/Sapphire events.

Sapphire scans `commands/` and `listeners/` relative to the entry file (so `dist/commands` and
`dist/listeners` when running the compiled build).

## Conventions

- **CommonJS** (`"module": "CommonJS"` in tsconfig; no `"type": "module"` in package.json). Imports do
  **not** need `.js` extensions.
- Listener event names: use the `Events` enum (e.g. `Events.ClientReady`), **not** raw strings —
  string event names have changed across discord.js versions.
- Slash command replies: avoid the deprecated `fetchReply` option; `reply()` then `editReply()`.
- Constructor context types are `Command.LoaderContext` / `Listener.LoaderContext` (Sapphire v5).
- Prettier: single quotes, semicolons, trailing commas (`all`), printWidth 110, 2-space indent.
  Run `npm run format` before committing.

### Adding a slash command

Create `src/commands/<name>.ts` with a class extending `Command`. Implement
`registerApplicationCommands(registry)` (reuse the `DISCORD_DEV_GUILD` pattern for `guildIds` so it
registers to your dev server instantly) and `chatInputRun(interaction)`. Use `src/commands/ping.ts`
as the reference implementation.

## Gotchas

- **The bot must be invited to a server with both the `bot` and `applications.commands` scopes**, or
  guild command registration fails with `DiscordAPIError[50001] Missing Access`. Invite URL pattern:
  `https://discord.com/oauth2/authorize?client_id=<APP_ID>&permissions=84992&scope=bot+applications.commands`
  (this bot's client/app ID is `1518137423815774318`).
- After inviting the bot or changing scopes, **restart the process** — watch mode won't pick it up
  (it only reacts to file changes).
- `undici` is pinned via the package.json `overrides` field to `^6.27.0` to resolve security
  advisories while keeping discord.js v14. **Do not run `npm audit fix --force`** — it would downgrade
  discord.js to v13.

## Git

- `origin` → `git@github.com:accell/facgl-bot.git` (your repo; push here). SSH auth via an ed25519 key
  in WSL `~/.ssh`.
- `upstream` → `https://github.com/laracord/laracord.git` — leftover from the original PHP template.
  The project no longer uses it; safe to remove with `git remote remove upstream`.

## Deployment (not yet configured)

Build with `npm run build`, run `node dist/index.js` with `NODE_ENV=production`. The bot is a
long-running process — host on a VPS with a process manager (systemd / pm2) or in a container. To be
set up.
