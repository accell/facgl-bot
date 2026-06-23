import 'dotenv/config';

import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';

const client = new SapphireClient({
  // Only the Guilds intent is needed for slash commands.
  // Add MessageContent + GuildMessages (privileged) if you build message commands.
  intents: [GatewayIntentBits.Guilds],
  logger: {
    level: process.env.NODE_ENV === 'production' ? LogLevel.Info : LogLevel.Debug,
  },
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
  client.logger.fatal('Missing DISCORD_TOKEN. Copy .env.example to .env and set your bot token.');
  process.exit(1);
}

void (async () => {
  try {
    await client.login(token);
  } catch (error) {
    client.logger.fatal('Failed to log in:', error);
    await client.destroy();
    process.exit(1);
  }
})();
