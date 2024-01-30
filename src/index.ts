//FIXME: expire old data

import { connectToDatabase } from "./db";
import { FindShopLogger } from "./logger";
import { parseConfig } from "./config";
import { initChatbox } from "./chatboxHandler";
import { z } from "zod";

FindShopLogger.logger.info("Starting FindShop backend...");
const config = await parseConfig();
const db = await connectToDatabase();
await initChatbox(config, db);

export const websocketMessageSchema = z
  .object({
    type: z.literal("shop"),
    shopName: z.string(),
    shopDescription: z.string().optional(),
    owner: z.string().optional(),
    computerID: z.number(),
    multiShop: z.boolean(),
    softwareName: z.string().optional(),
    softwareVersion: z.string().optional(),
    mainLocation: z
      .object({
        x: z.number().optional(),
        y: z.number().optional(),
        z: z.number().optional(),
        description: z.string().optional(),
        dimension: z.enum(["overworld", "nether", "end"]).optional(),
      })
      .optional(),
    items: z.array(
      z.object({
        itemID: z.string(),
        kstPrice: z.number().optional(),
        tstPrice: z.number().optional(),
        displayName: z.string(),
        dynamicPrice: z.boolean(),
        madeOnDemand: z.boolean(),
        stock: z.number().optional(),
        requiresInteraction: z.boolean(),
        isBuyingItem: z.boolean(),
        noLimit: z.boolean(),
      })
    ),
  })
  .refine(
    (data) => !data.items.every((v) => {
      return v.kstPrice === undefined && v.tstPrice === undefined
    }),
    "All items must have either a KST or TST price"
  );

Bun.serve({
  fetch(req, server) {
    if (req.headers.get("Authorization") !== config.WEBSOCKET_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (server.upgrade(req)) {
      FindShopLogger.logger.debug("Client connected!");
      return;
    }

    return new Response("Upgrade failed :(", { status: 500 });
  },
  websocket: {
    message: async (ws, msg) => {
      const tryParse = websocketMessageSchema.safeParse(JSON.parse(msg.toString('utf8')));
      if (!tryParse.success) {
        FindShopLogger.logger.error(
          `Failed to parse websocket message: ${tryParse.error}`
        );
        ws.send(
          JSON.stringify({
            ok: false,
            error: `Failed to parse WebSocket message: ${tryParse.error}`,
          })
        );
        return;
      }

      FindShopLogger.logger.debug("Parsed WebSocket message");

      const data = tryParse.data;
      const shop = await db.prisma.shop.findFirst({
        where: {
          computerID: data.computerID,
          multiShop: data.multiShop,
        }
      })

      if (!shop) {
        await db.createShop(data);
        return;
      }

      await db.prisma.shop.update({
        where: {
          id: shop.id,
        },
        data: {
          description: data.shopDescription,
          multiShop: data.multiShop,
          name: data.shopName,
          owner: data.owner,
          softwareName: data.softwareName,
          softwareVersion: data.softwareVersion,
          mainLocation: {
            upsert: {
              create: {
                description: data.mainLocation?.description,
                dimension: data.mainLocation?.dimension,
                x: data.mainLocation?.x,
                y: data.mainLocation?.y,
                z: data.mainLocation?.z,
              },
              update: {
                description: data.mainLocation?.description,
                dimension: data.mainLocation?.dimension,
                x: data.mainLocation?.x,
                y: data.mainLocation?.y,
                z: data.mainLocation?.z,
              }
            }
          },
          items: {
            deleteMany: {},
            createMany: {
              data: data.items
            }
          }
        }
      });
    },
  },
  port: 8080,
});
