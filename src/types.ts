// FindShop-specific data.
export interface findshop_data_t {
  computerID: number;
  lastSeen: number;
}

// Location of a shop. All fields are optional.
export interface shop_loc_t {
  coordinates?: number[];
  description?: string;
  dimension?: string;
}

// Structure of the shop item object.
export interface shop_item_t {
  prices: {
    value: number;
    currency: string;
    address: string;
    requiredMeta?: string;
  }[];
  item: {
    name: string;
    displayName: string;
    nbt?: string;
  };
  dynamicPrice?: boolean;
  stock?: number;
  madeOnDemand?: boolean;
  requiresInteraction?: boolean;
  shopBuysItem?: boolean;
  noLimit?: boolean;
}

// Structure of the shop object.
export interface shop_t {
  type: string;
  info: {
    name: string;
    description?: string;
    owner?: string;
    computerID?: number;
    multiShop?: number;
    software?: {
      name?: string;
      version?: string;
    };
    location: shop_loc_t;
    otherLocations?: shop_loc_t[];
  };
  items: shop_item_t[];
  findShop: findshop_data_t;
}

// Structure of the 'search results' object
export interface search_results_t {
  shop: shop_t;
  item: shop_item_t;
}
