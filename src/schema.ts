import { relations } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const shops = sqliteTable("shops", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  owner: text("owner").notNull(),
  computerID: int("computer_id").notNull(),
  multiShop: int("multi_shop", { mode: "boolean" }).default(false),
  softwareName: text("software_name").notNull(),
  softwareVersion: int("software_version"),
  lastSeen: int("last_seen", { mode: "timestamp" }),
});

export const shopsRelations = relations(shops, ({ one, many }) => ({
  mainLocation: one(locations),
  otherLocations: many(locations),
}));

export const locations = sqliteTable("locations", {
  x: int("x").notNull(),
  y: int("y").notNull(),
  z: int("z").notNull(),
  description: text("description"),
  dimension: text("dimension", { enum: ["overworld", "nether", "end"] }),
});
