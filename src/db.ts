import { PrismaClient } from "@prisma/client";

export class DatabaseManager {
  db: PrismaClient;

  constructor() {
    this.db = new PrismaClient({
      log: ["query", "warn", "error", "info"],
    });
  }

  async getAllShops() {
    return this.db.shop.findMany({
      include: {
        mainLocation: true,
      },
    });
  }

  async searchItems(query: string) {
    return this.db.item.findMany({
      where: {
        itemId: {
          contains: query,
          mode: "insensitive",
        },
        OR: [
          {
            displayName: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      orderBy: {
        price: "desc",
      },
      include: {
        shop: {
          include: {
            mainLocation: true,
          },
        },
      },
    });
  }
}
