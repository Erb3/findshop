import { Client, User } from "switchchat";
import { z } from "zod";
import { formatLocation, paginate } from "./utils";
import { configSchema } from "./config";
import { DatabaseManager } from "./db";
import { FindShopLogger } from "./logger";

export async function initChatbox(
  config: z.infer<typeof configSchema>,
  db: DatabaseManager
) {
  const chatbox = new Client(config.CHATBOX_TOKEN);
  const chatboxHandler = new ChatboxHandler(chatbox, db, config);

  chatbox.defaultName = config.CHATBOX_NAME;
  chatbox.defaultFormattingMode = "markdown";

  chatbox.on("command", async (cmd) => {
    if (!config.ALIASES.includes(cmd.command)) return;
    FindShopLogger.logger.debug(`${cmd.user.name}: ${cmd.args.join(" ")}`);

    switch (cmd.args[0]) {
      case null:
      case undefined:
      case "help":
        chatboxHandler.sendHelp(cmd.user);
        break;

      case "stats":
        chatboxHandler.sendDisabledFeature(cmd.user);
        break;

      case "list":
      case "l":
      case "ls": {
        await chatboxHandler.sendShopList(cmd.user, cmd.args);
        break;
      }

      case "sell":
      case "sl":
      case "s":
        chatboxHandler.sendDisabledFeature(cmd.user);
        break;

      case "shop":
      case "sh":
        chatboxHandler.sendDisabledFeature(cmd.user);
        break;

      case "buy":
      case "b": {
        chatboxHandler.sendItemSearch(
          cmd.user,
          cmd.args[1],
          parseInt(cmd.args[2])
        );
        break;
      }

      default: {
        chatboxHandler.sendItemSearch(
          cmd.user,
          cmd.args[0],
          parseInt(cmd.args[1])
        );
        break;
      }
    }
  });

  chatbox.on("ready", () => {
    FindShopLogger.logger.debug("Connected to chatbox!");
  });

  FindShopLogger.logger.debug("Connecting to chatbox...");
  chatbox.connect();
}

export class ChatboxHandler {
  chatbox: Client;
  db: DatabaseManager;
  config: z.infer<typeof configSchema>;

  constructor(
    chatbox: Client,
    db: DatabaseManager,
    config: z.infer<typeof configSchema>
  ) {
    this.chatbox = chatbox;
    this.db = db;
    this.config = config;
  }

  async sendHelp(user: User) {
    await this.chatbox.tell(
      user.uuid,
      `FindShop helps locate ShopSync-compatible shops buying or selling an item.
      \`\\fs list\` - List detected shops
      \`\\fs stats\` - Statistics (currently only shop count)
      \`\\fs buy [item]\` - Finds shops selling *[item]*
      \`\\fs sell [item]\` - Finds shops buying *[item]*
      \`\\fs shop [name]\` - Finds shops named *[name]* and their info
      For more information, check [the GitHub repository](${this.config.GITHUB_LINK})`
    );
  }

  async sendDisabledFeature(user: User) {
    await this.chatbox.tell(
      user.uuid,
      `This feature is currently ~~unimplemented~~ disabled, check back later!`
    );
  }

  async sendItemSearch(user: User, query: string, page: number | undefined) {
    const items = await this.db.searchItems(query);
    const output: string[] = [];

    items.forEach((item) => {
      if (!item.shop.mainLocation) return;
      const price = item.kstPrice ? `k${item.kstPrice}` : `t${item.tstPrice}`;

      output.push(
        `${price} \`${item.itemID}\` at **${item.shop.name}** (${formatLocation(
          item.shop.mainLocation
        )})`
      );
    });

    this.chatbox.tell(
      user.uuid,
      paginate({
        content: output,
        page: page || 1,
        args: "buy " + query,
      })
    );
  }

  async sendShopList(user: User, args: string[]) {
    const shops = await this.db.getAllShops();
    const output: string[] = [];

    shops.forEach((shop) => {
      if (!shop.mainLocation) return;
      output.push(`${shop.name} at ${formatLocation(shop.mainLocation)}`);
    });

    const page = parseInt(args[2]) || 1;
    this.chatbox.tell(
      user.uuid,
      paginate({
        content: output,
        page,
        args: "list ",
      })
    );
  }
}
