import { Command } from '@sapphire/framework';
import { ChannelType } from 'discord.js';
import { addWatch, removeWatch, listWatches, setWatchChannel } from '../lib/watch';

export class WatchCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Manage Mercari JP listing watches.',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName('watch')
          .setDescription(this.description)
          .addSubcommand((sub) =>
            sub
              .setName('add')
              .setDescription('Add a new Mercari search watch.')
              .addStringOption((opt) => opt.setName('keyword').setDescription('Search keyword').setRequired(true))
              .addIntegerOption((opt) =>
                opt.setName('category').setDescription('Mercari category ID (e.g. 37 = men\'s jewelry)'),
              )
              .addChannelOption((opt) =>
                opt
                  .setName('channel')
                  .setDescription('Channel to post new listings (defaults to current)')
                  .addChannelTypes(ChannelType.GuildText),
              ),
          )
          .addSubcommand((sub) =>
            sub
              .setName('remove')
              .setDescription('Remove a watch by its ID.')
              .addIntegerOption((opt) =>
                opt.setName('id').setDescription('Watch ID (from /watch list)').setRequired(true),
              ),
          )
          .addSubcommand((sub) => sub.setName('list').setDescription('List all active watches.'))
          .addSubcommand((sub) =>
            sub
              .setName('channel')
              .setDescription('Change the notification channel for a watch.')
              .addIntegerOption((opt) =>
                opt.setName('id').setDescription('Watch ID (from /watch list)').setRequired(true),
              )
              .addChannelOption((opt) =>
                opt
                  .setName('channel')
                  .setDescription('New channel for notifications')
                  .setRequired(true)
                  .addChannelTypes(ChannelType.GuildText),
              ),
          ),
      {
        guildIds: process.env.DISCORD_DEV_GUILD ? [process.env.DISCORD_DEV_GUILD] : undefined,
      },
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand(true);

    switch (sub) {
      case 'add':
        return this.handleAdd(interaction);
      case 'remove':
        return this.handleRemove(interaction);
      case 'list':
        return this.handleList(interaction);
      case 'channel':
        return this.handleChannel(interaction);
    }
  }

  private async handleAdd(interaction: Command.ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const keyword = interaction.options.getString('keyword', true);
    const categoryId = interaction.options.getInteger('category') ?? null;
    const channel = interaction.options.getChannel('channel') ?? interaction.channel!;

    try {
      const watch = await addWatch(guildId, channel.id, keyword, categoryId);
      const catLabel = categoryId ? ` (category ${categoryId})` : '';
      await interaction.reply(
        `Watch **#${watch.id}** created: \`${keyword}\`${catLabel} → <#${channel.id}>`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message.includes('UNIQUE') ? 'already exists' : 'failed';
      await interaction.reply({ content: `That watch ${msg}.`, ephemeral: true });
    }
  }

  private async handleRemove(interaction: Command.ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const watchId = interaction.options.getInteger('id', true);

    if (await removeWatch(guildId, watchId)) {
      await interaction.reply(`Watch **#${watchId}** removed.`);
    } else {
      await interaction.reply({ content: `Watch #${watchId} not found.`, ephemeral: true });
    }
  }

  private async handleList(interaction: Command.ChatInputCommandInteraction) {
    const watches = await listWatches(interaction.guildId!);

    if (watches.length === 0) {
      await interaction.reply({ content: 'No active watches. Use `/watch add` to create one.', ephemeral: true });
      return;
    }

    const lines = watches.map((w) => {
      const cat = w.category_id ? ` (cat ${w.category_id})` : '';
      return `**#${w.id}** — \`${w.keyword}\`${cat} → <#${w.channel_id}>`;
    });

    await interaction.reply(lines.join('\n'));
  }

  private async handleChannel(interaction: Command.ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const watchId = interaction.options.getInteger('id', true);
    const channel = interaction.options.getChannel('channel', true);

    if (await setWatchChannel(guildId, watchId, channel.id)) {
      await interaction.reply(`Watch **#${watchId}** now posting to <#${channel.id}>.`);
    } else {
      await interaction.reply({ content: `Watch #${watchId} not found.`, ephemeral: true });
    }
  }
}
