import { Client } from "switchchat";
import { configSchema } from "./types";
import { DatabaseManager } from "./db";
import { ChatboxHandler } from "./chatboxHandler";

const config = await configSchema.parseAsync(Bun.env);
const chatbox = new Client(config.CHATBOX_TOKEN);
const db = new DatabaseManager();
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
      chatboxHandler.sendList(cmd.user);
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
      chatboxHandler.sendDisabledFeature(cmd.user);
      break;
  }
});

chatbox.on("ready", () => {
  console.log("Successfully connected to chatbox!");
});

chatbox.connect();
