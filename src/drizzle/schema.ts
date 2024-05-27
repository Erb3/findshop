import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm/relations";
import {
    integer,
    numeric,
    real,
    sqliteTable,
    text,
    uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const Shop = sqliteTable(
    "Shop",
    {
        id: text("id").primaryKey().notNull().$defaultFn(crypto.randomUUID),
        name: text("name").notNull(),
        description: text("description"),
        owner: text("owner"),
        computerID: integer("computerID").notNull(),
        multiShop: integer("multiShop"),
        softwareName: text("softwareName"),
        softwareVersion: text("softwareVersion"),
        lastSeen: integer("lastSeen")
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
    },
    (table) => {
        return {
            id_key: uniqueIndex("Shop_id_key").on(table.id),
        };
    }
);

export const Location = sqliteTable(
    "Location",
    {
        id: text("id").primaryKey().notNull(),
        main: numeric("main").notNull(),
        x: integer("x"),
        y: integer("y"),
        z: integer("z"),
        description: text("description"),
        dimension: integer("dimension"),
        shopID: text("shopID")
            .notNull()
            .references(() => Shop.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
    },
    (table) => {
        return {
            id_key: uniqueIndex("Location_id_key").on(table.id),
        };
    }
);

export const Item = sqliteTable("Item", {
    id: text("id").primaryKey().notNull(),
    name: text("name").notNull(),
    displayName: text("displayName").notNull(),
    nbtHash: text("nbtHash"),
    description: text("description"),
    dynamicPrice: numeric("dynamicPrice").notNull(),
    madeOnDemand: numeric("madeOnDemand").notNull(),
    stock: integer("stock"),
    requiresInteraction: numeric("requiresInteraction").notNull(),
    shopBuysItem: numeric("shopBuysItem").notNull(),
    noLimit: numeric("noLimit").notNull(),
    shopID: text("shopID")
        .notNull()
        .references(() => Shop.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        }),
});

export const Price = sqliteTable("Price", {
    id: text("id").primaryKey().notNull(),
    value: real("value").notNull(),
    currency: text("currency").notNull(),
    address: text("address"),
    requiredMeta: text("requiredMeta"),
    itemID: text("itemID")
        .notNull()
        .references(() => Item.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        }),
});

export const LocationRelations = relations(Location, ({ one }) => ({
    Shop: one(Shop, {
        fields: [Location.shopID],
        references: [Shop.id],
    }),
}));

export const ShopRelations = relations(Shop, ({ many }) => ({
    Locations: many(Location),
    Items: many(Item),
}));

export const ItemRelations = relations(Item, ({ one, many }) => ({
    Shop: one(Shop, {
        fields: [Item.shopID],
        references: [Shop.id],
    }),
    Prices: many(Price),
}));

export const PriceRelations = relations(Price, ({ one }) => ({
    Item: one(Item, {
        fields: [Price.itemID],
        references: [Item.id],
    }),
}));
