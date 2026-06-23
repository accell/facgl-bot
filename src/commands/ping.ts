import { Command } from '@sapphire/framework';

export class PingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Check whether the bot is alive and see its latency.',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName('ping').setDescription(this.description),
      {
        // Register to a single guild for instant updates during development.
        // Leave DISCORD_DEV_GUILD unset to register globally (can take up to ~1h to appear).
        guildIds: process.env.DISCORD_DEV_GUILD ? [process.env.DISCORD_DEV_GUILD] : undefined,
      },
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const ws = Math.round(this.container.client.ws.ping);
    const start = Date.now();

    await interaction.reply({ content: '🏓 Pinging...' });
    const roundtrip = Date.now() - start;

    return interaction.editReply(`🏓 Pong! Roundtrip: \`${roundtrip}ms\` · WebSocket: \`${ws}ms\``);
  }
}
