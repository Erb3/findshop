import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import Database from "bun:sqlite";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { shop_t } from "./types";

export class DatabaseManager {
  db: BunSQLiteDatabase<typeof schema>;

  constructor() {
    const sqlite = new Database("findshop.db", { create: true });
    const db = drizzle(sqlite, { schema });
    this.db = db;
  }

  async hasShopByComputerID(computerID: number): Promise<boolean> {
    const shop = await this.db.query.shops.findFirst({
      where: eq(schema.shops.computerID, computerID),
    });

    return !!shop;
  }

  async getAllShops() {
    return await this.db.query.shops.findMany({
      with: {
        mainLocation: true,
      },
    });
  }

  async searchItems(query: string) {}

  async updateShop(data: shop_t) {
    const shop = await this.db.query;

    if (!shop) {
    }
  }
}
