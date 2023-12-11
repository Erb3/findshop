import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import Database from "bun:sqlite";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

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
}
