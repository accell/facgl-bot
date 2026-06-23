export interface SearchParams {
  keyword: string;
  categoryId?: number[];
  sort?: 'SORT_SCORE' | 'SORT_CREATED_TIME' | 'SORT_PRICE' | 'SORT_NUM_LIKES';
  order?: 'ORDER_DESC' | 'ORDER_ASC';
  status?: ('STATUS_ON_SALE' | 'STATUS_SOLD_OUT' | 'STATUS_TRADING')[];
  priceMin?: number;
  priceMax?: number;
  pageSize?: number;
  pageToken?: string;
  excludeKeyword?: string;
}

export interface SearchResultItem {
  id: string;
  name: string;
  price: number;
  status: string;
  created: number;
  updated: number;
  sellerId: string;
  thumbnails: string[];
  categoryId: number;
  itemConditionId: number;
  itemType: string;
}

export interface SearchResponse {
  items: SearchResultItem[];
  meta: {
    nextPageToken: string;
    prevPageToken: string;
    numFound: number;
  };
}
