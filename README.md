# facgl-bot

A Discord bot built with [discord.js](https://discord.js.org/) and the [Sapphire framework](https://www.sapphirejs.dev/), in TypeScript.

## Requirements

- Node.js 20+ (developed on 22/23)
- A Discord application + bot token from the [Developer Portal](https://discord.com/developers/applications)

## Setup

```bash
npm install
cp .env.example .env   # then edit .env and paste your DISCORD_TOKEN
```

For instant slash-command updates while developing, set `DISCORD_DEV_GUILD` in `.env` to your test server's ID (enable Developer Mode in Discord, right-click the server, "Copy Server ID"). Leave it blank to register commands globally (can take up to ~1 hour to appear).

## Running

```bash
npm run dev      # watch mode (auto-restarts on changes)
npm run build    # compile TypeScript to dist/
npm start        # run the compiled bot (dist/index.js)
```

Other scripts: `npm run typecheck`, `npm run format`, `npm run format:check`.

## Project structure

```
src/
  index.ts            Bot entry point (client + login)
  commands/           Sapphire commands (one file per command)
    ping.ts           /ping — latency check
  listeners/          Sapphire event listeners
    ready.ts          Logs when the bot connects
```

Sapphire auto-discovers any file you drop into `src/commands` and `src/listeners` — no manual registration needed.

## License

[MIT](LICENSE.md)
