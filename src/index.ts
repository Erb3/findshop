import { initChatbox } from "./chatboxHandler";
import { parseConfig } from "./config";
import { connectToDatabase } from "./db";
import { FindShopLogger } from "./logger";
import { websocketMessageSchema } from "./schemas";

FindShopLogger.logger.info("Starting FindShop backend...");
const config = await parseConfig();
const db = await connectToDatabase();
await initChatbox(config, db);

Bun.serve({
  async fetch(req, server) {
    const pathname = new URL(req.url).pathname;
    FindShopLogger.logger.info(
      `${req.headers.get("X-Forwarded-For") || "Non-proxied"} ${req.headers.get("User-Agent")} ${req.method} ${pathname}`,
    );

    if (pathname == "/ws") {
      if (req.headers.get("Authorization") !== config.WEBSOCKET_TOKEN) {
        return new Response("Unauthorized", { status: 401 });
      }

      if (server.upgrade(req)) {
        FindShopLogger.logger.debug("Client connected!");
        return;
      }

      return new Response("Upgrade failed :(", { status: 500 });
    } else if (pathname == "/metrics") {
      if (req.headers.get("Authorization") !== config.WEBSOCKET_TOKEN) {
        return new Response("Unauthorized", { status: 401 });
      }

      const lines = [];
      const statistics = await db.getStatistics();
      lines.push(`findshop_total_shops ${statistics.shopCount}`);
      lines.push(`findshop_total_locations ${statistics.locationCount}`);
      lines.push(`findshop_total_items ${statistics.itemCount}`);
      // Todo: HTTP endpoints with IPs
      // Todo: Chatbox endpoints with usernames
      // Todo: Prices for various items
      // Todo: Total stock for various items

      // it might be using mine? It usually effects immediently (it did for me)
      return new Response(lines.join("\n") + "\n");
    } else if (pathname.match("^/api/shop/([^/]+)$")) {
      const match = pathname.match("^/api/shop/([^/]+)$")![0];
      const [shopIdStr, multishopStr] = match.split(":");
      if (!shopIdStr || !multishopStr)
        return new Response("Bad Request", { status: 400 });
    }

    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    message: async (ws, msg) => {
      if (msg.length > 1 << 20) {
        FindShopLogger.logger.error("Received too long message");
        return;
      }

      const tryParse = websocketMessageSchema.safeParse(
        JSON.parse(msg.toString("utf8")),
      );

      if (!tryParse.success) {
        FindShopLogger.logger.error(
          `Failed to parse websocket message: ${msg}. Error: ${tryParse.error}`,
        );
        return;
      }

      FindShopLogger.logger.debug("Parsed WebSocket message");
      db.handlePacket(tryParse.data);
    },
  },
  port: 8080,
});

FindShopLogger.logger.info("Server running on http://0.0.0.0:8080");
