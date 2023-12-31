import { connectToDatabase } from "./db";
import { FindShopLogger } from "./logger";
import { parseConfig } from "./config";
import { initChatbox } from "./chatboxHandler";
import { z } from "zod";

FindShopLogger.logger.info("Starting FindShop backend...");
const config = await parseConfig();
const db = await connectToDatabase();
await initChatbox(config, db);

const websocketMessageSchema = z
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
        dimension: z.enum(["OVERWORLD", "NETHER", "END"]).optional(),
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
    (data) => !data.items.every((v) => v.kstPrice || v.tstPrice),
    "All items must have either a KST or TST price"
  );

Bun.serve({
  fetch(req, server) {
    if (req.headers.get("Authorization") !== config.WEBSOCKET_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (server.upgrade(req)) {
      return;
    }

    return new Response("Upgrade failed :(", { status: 500 });
  },
  websocket: {
    message: (ws, msg) => {
      console.log(msg);
      const tryParse = websocketMessageSchema.safeParse(msg);
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
    },
  },
  port: 8080,
});
