import * as crypto from 'node:crypto';
import { generateDPoP } from './dpop';
import type { SearchParams, SearchResponse, SearchResultItem } from './types';

const SEARCH_URL = 'https://api.mercari.jp/v2/entities:search';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.3';

const instanceUuid = crypto.randomUUID();

function buildSearchBody(params: SearchParams): Record<string, unknown> {
  return {
    userId: '',
    pageSize: params.pageSize ?? 30,
    pageToken: params.pageToken ?? '',
    searchSessionId: crypto.randomUUID().replace(/-/g, ''),
    indexRouting: 'INDEX_ROUTING_UNSPECIFIED',
    thumbnailTypes: [],
    searchCondition: {
      keyword: params.keyword,
      sort: params.sort ?? 'SORT_CREATED_TIME',
      order: params.order ?? 'ORDER_DESC',
      status: params.status ?? ['STATUS_ON_SALE'],
      sizeId: [],
      categoryId: params.categoryId ?? [],
      brandId: [],
      sellerId: [],
      priceMin: params.priceMin ?? 0,
      priceMax: params.priceMax ?? 0,
      itemConditionId: [],
      shippingPayerId: [],
      shippingFromArea: [],
      shippingMethod: [],
      colorId: [],
      hasCoupon: false,
      attributes: [],
      itemTypes: [],
      skuIds: [],
      excludeKeyword: params.excludeKeyword ?? '',
    },
    defaultDatasets: [],
    serviceFrom: 'suruga',
  };
}

function mapItem(raw: Record<string, unknown>): SearchResultItem {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    price: Number(raw.price ?? 0),
    status: String(raw.status ?? ''),
    created: Number(raw.created ?? 0),
    updated: Number(raw.updated ?? 0),
    sellerId: String(raw.sellerId ?? raw.seller_id ?? ''),
    thumbnails: Array.isArray(raw.thumbnails) ? raw.thumbnails.map(String) : [],
    categoryId: Number(raw.categoryId ?? raw.category_id ?? 0),
    itemConditionId: Number(raw.itemConditionId ?? raw.item_condition_id ?? 0),
    itemType: String(raw.itemType ?? raw.item_type ?? ''),
  };
}

export async function searchMercari(params: SearchParams): Promise<SearchResponse> {
  const dpop = await generateDPoP(SEARCH_URL, 'POST', instanceUuid);
  const body = buildSearchBody(params);

  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'X-Platform': 'web',
      DPoP: dpop,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Mercari API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const meta = (data.meta ?? {}) as Record<string, unknown>;

  return {
    items: rawItems.map((item: Record<string, unknown>) => mapItem(item)),
    meta: {
      nextPageToken: String(meta.nextPageToken ?? ''),
      prevPageToken: String(meta.prevPageToken ?? ''),
      numFound: Number(meta.numFound ?? 0),
    },
  };
}

export function mercariListingUrl(itemId: string): string {
  return `https://jp.mercari.com/item/${itemId}`;
}
