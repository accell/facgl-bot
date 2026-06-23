import { container } from '@sapphire/framework';
import { EmbedBuilder, TextChannel } from 'discord.js';
import { searchMercari, mercariListingUrl } from '../mercari';
import type { SearchResultItem } from '../mercari';
import { getAllWatches, getSeenItems, markItemsSeen } from './db';

const POLL_INTERVAL_MS = 3 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;

export function startPoller(): void {
  if (timer) return;
  container.logger.info('[Poller] Starting Mercari watch poller');
  timer = setInterval(() => void pollAllWatches(), POLL_INTERVAL_MS);
  void pollAllWatches();
}

export function stopPoller(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

async function pollAllWatches(): Promise<void> {
  const watches = await getAllWatches();
  if (watches.length === 0) return;

  for (const watch of watches) {
    try {
      await pollWatch(watch);
    } catch (err) {
      container.logger.error(`[Poller] Error polling watch ${watch.id} ("${watch.keyword}"):`, err);
    }
  }
}

async function pollWatch(watch: { id: number; channel_id: string; keyword: string; category_id: number | null }) {
  const results = await searchMercari({
    keyword: watch.keyword,
    categoryId: watch.category_id ? [watch.category_id] : undefined,
    sort: 'SORT_CREATED_TIME',
    order: 'ORDER_DESC',
    pageSize: 30,
  });

  const seen = await getSeenItems(watch.id);
  const newItems = results.items.filter((item) => !seen.has(item.id));

  if (newItems.length === 0) return;

  await markItemsSeen(
    watch.id,
    results.items.map((i) => i.id),
  );

  const channel = await container.client.channels.fetch(watch.channel_id).catch(() => null);
  if (!channel || !(channel instanceof TextChannel)) return;

  const batch = newItems.slice(0, 10);
  for (const item of batch) {
    const embed = buildEmbed(item, watch.keyword);
    await channel.send({ embeds: [embed] });
  }

  if (newItems.length > 10) {
    await channel.send(`...and ${newItems.length - 10} more new listings for **${watch.keyword}**.`);
  }
}

function buildEmbed(item: SearchResultItem, keyword: string): EmbedBuilder {
  const url = mercariListingUrl(item.id);
  const embed = new EmbedBuilder()
    .setTitle(item.name.slice(0, 256))
    .setURL(url)
    .setColor(0xe84855)
    .addFields({ name: 'Price', value: `¥${item.price.toLocaleString()}`, inline: true })
    .setFooter({ text: `Watch: ${keyword}` });

  if (item.thumbnails.length > 0) {
    embed.setThumbnail(item.thumbnails[0]);
  }

  return embed;
}
