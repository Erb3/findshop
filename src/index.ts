import { FindShopLogger } from "./logger";
import { connectToDatabase } from "./db";
import { parseConfig } from "./config";
import { initChatbox } from "./chatboxHandler";
import { websocketMessageSchema } from "./schemas";

FindShopLogger.logger.info("Starting FindShop backend...");
const config = await parseConfig();
const db = await connectToDatabase();
await initChatbox(config, db);


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
            if (msg.length > 1<<20) {
                FindShopLogger.logger.error("Received too long message");
                return;
            }

            const tryParse = websocketMessageSchema.safeParse(JSON.parse(msg.toString("utf8")));
            if (!tryParse.success) {
                FindShopLogger.logger.error(`Failed to parse websocket message: ${tryParse.error}`);
                FindShopLogger.logger.error(msg)
                return;
            }
            FindShopLogger.logger.debug("Parsed WebSocket message");

            db.handlePacket(tryParse.data)
        },
    },
    port: 8080
})