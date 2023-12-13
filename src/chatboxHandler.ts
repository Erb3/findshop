import { Client, User } from "switchchat";
import { DatabaseManager } from "./db";
import { configSchema } from "./types";
import { z } from "zod";

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
    output.push("=".repeat(this.config.CHAT_WIDTH));

    // items.forEach((v) => {
    //   output.push("yes");
    // });

    output.push("=".repeat(this.config.CHAT_WIDTH));
  }
}
