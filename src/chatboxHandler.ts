import { Client, User } from "switchchat";
import { z } from "zod";
import { formatLocation } from "./utils";
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
    console.debug(`${cmd.user.name}: ${cmd.args.join(" ")}`);

    switch (cmd.args[0]) {
      case null:
      case "help":
        chatboxHandler.sendHelp(cmd.user);
        break;

      case "stats":
        chatboxHandler.sendDisabledFeature(cmd.user);
        break;

      case "list":
      case "l":
      case "ls":
        chatboxHandler.sendShopsList(cmd.user);
        break;

      case "sell":
      case "sl":
      case "s":
        chatboxHandler.sendDisabledFeature(cmd.user);
        break;

      case "shop":
      case "sh":
        chatboxHandler.sendDisabledFeature(cmd.user);
        break;

      default:
      case "buy":
      case "b":
        chatboxHandler.searchItems(cmd.args.join(" "), cmd.user);
        break;
    }
  });

  chatbox.on("ready", () => {
    FindShopLogger.logger.debug("Connected to chatbox!");
  });

  FindShopLogger.logger.debug("Connecting to chatbox...");
  chatbox.connect();
}

const short: string[] = ["l", "i", "t", "[", "]", " "];
interface ResponseGeneratorOptions {
  title?: string;
  footer?: string;
  content: string[] | string;
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

  generateLine(text?: string) {
    if (text) {
      let length = this.config.CHAT_WIDTH - 5;

      text
        .replace("`", "")
        .split("")
        .forEach((char) => {
          if (short.includes(char)) {
            length -= 0.4;
          } else {
            length--;
          }
        });

      const toRepeat = Math.round(length / 2);

      return `${"=".repeat(toRepeat)} ${text} ${"=".repeat(toRepeat)}`;
    } else {
      return "=".repeat(this.config.CHAT_WIDTH);
    }
  }

  generateResponse(options: ResponseGeneratorOptions) {
    const output: string[] = ["Result:"];
    output.push(this.generateLine(options.title));

    if (options.content instanceof Array) {
      output.push(...options.content);
    } else {
      output.push(options.content);
    }

    output.push(this.generateLine(options.footer));
    return output.join("\n");
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
    For more information, check [the GitHub](${this.config.GITHUB_LINK})`
    );
  }

  async sendDisabledFeature(user: User) {
    await this.chatbox.tell(
      user.uuid,
      `This feature is currently ~~unimplemented~~ disabled, check back later!`
    );
  }

  async sendShopsList(user: User) {
    const shops = await this.db.getAllShops();
    let output: string[] = [];

    shops.forEach((v) =>
      output.push(
        `  **${v.name}** at ${
          v.mainLocation?.description ||
          `\`${v.mainLocation.x} ${v.mainLocation.y} ${v.mainLocation.z}\``
        }`
      )
    );

    this.chatbox.tell(
      user.uuid,
      this.generateResponse({
        title: "Page 1 of 2",
        content: output,
        footer: "`\\fs ls 2` for the next page",
      })
    );
  }

  async searchItems(query: string, user: User) {
    const items = await this.db.searchItems(query);
    let output: string[] = [];

    items.forEach((v) => {
      if (!v.shop.mainLocation) {
        throw new Error("Missing location!");
      }

      output.push(
        `\`${v.itemId}\` at **${v.shop.name}** (\`${formatLocation(
          v.shop.mainLocation
        )}\`)`
      );
    });

    this.chatbox.tell(
      user.uuid,
      this.generateResponse({
        title: "Page 1 of 2",
        content: output,
        footer: "`\\fs ls 2` for the next page",
      })
    );
  }
}
