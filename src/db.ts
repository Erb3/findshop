import { PrismaClient } from "@prisma/client";
import { FindShopLogger } from "./logger";
import { websocketMessageSchema } from "./index";
import { z } from "zod";

export class DatabaseManager {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getAllShops() {
    return this.prisma.shop.findMany({
      include: {
        mainLocation: true,
      },
    });
  }

  async searchItems(query: string) {
    return this.prisma.item.findMany({
      where: {
        OR: [
	  {
	    itemID: {
              contains: query,
              mode: "insensitive",
	    }
          },
          {
            displayName: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      orderBy: {
        kstPrice: "asc",
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

  async createShop(data: z.infer<typeof websocketMessageSchema>) {
    await this.prisma.shop.create({
      data: {
        computerID: data.computerID,
        description: data.shopDescription,
        multiShop: data.multiShop,
        name: data.shopName,
        owner: data.owner,
        softwareName: data.softwareName,
        softwareVersion: data.softwareVersion,
        mainLocation: {
          create: {
            description: data.mainLocation?.description,
            dimension: data.mainLocation?.dimension,
            x: data.mainLocation?.x,
            y: data.mainLocation?.y,
            z: data.mainLocation?.z,
          }
        }
      }
    })
  }
}

export async function connectToDatabase() {
  FindShopLogger.logger.debug("Connecting to database...");
  const prisma = new PrismaClient({
    log: ["error", "info", "warn"],
  });

  await prisma.$connect();
  FindShopLogger.logger.debug("Connected to database!");
  return new DatabaseManager(prisma);
}
