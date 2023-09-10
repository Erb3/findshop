/**
 * FindShop Chatbox Server
 * Copyright (C) 2023  slimit75
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Client } from "switchchat";
import { MongoClient } from "mongodb";
import { shop_loc_t, shop_t, shop_item_t, search_results_t } from "./types";

const sc: Client = new Client(<string>process.env.CB_KEY);
const db_client: MongoClient = new MongoClient(<string>process.env.DB_URI);
const database = db_client.db(`SC3`);
const db_shops = database.collection<shop_t>(`RawShops`);

const aliases: string[] = ["fsd"]; // Temporary development/testing alias
const resultsPerPage: number = 7;
const help_link: string = "https://github.com/slimit75/FindShop/wiki/Why-are-shops-and-items-missing%3F";

sc.defaultName = "&6&lFindShop";
sc.defaultFormattingMode = "markdown";

/**
 * Generates human-readable coordinates
 * @param location Input coordinates from shop
 */
function fmt_loc(location: shop_loc_t): string {
	let shopLocation: string = "Unknown";

	if (location) {
		if ((location.coordinates) && (location.coordinates.length === 3)) {
			shopLocation = `\`${Math.round(location.coordinates[0])} ${Math.round(location.coordinates[1])} ${Math.round(location.coordinates[2])}\``;
		}
		else if (location.description) {
			if (location.description.startsWith("http")) {
				shopLocation = location.description
			}
			else {
				shopLocation = `\`${location.description}\``
			}
		}
	}

	return shopLocation
}

/**
 * Generates human-readable prices
 * @param item Input item from shop
 */
function fmt_price(item: shop_item_t): string {
	let prefix: string = "";
	let suffix: string = "";

	if (item.prices[0].currency === "KST") {
		prefix = "\uE000";
	}
	else {
		suffix = ` ${item.prices[0].currency}`;
	}

	if (item.dynamicPrice) {
		return prefix + `\`${item.prices[0].value}*\`` + suffix;
	}
	else {
		return prefix + `\`${item.prices[0].value}\`` + suffix;
	}
}

/**
 * Formats shop names in results
 * @param shop Shop to format
 */
function fmt_name(shop: shop_t): string {
	let base_str: string = shop.info.name;

	if (shop.findShop.lastSeen <= Date.now() - 604800000) {
		base_str += "🕐";
	}

	return `**${base_str}**`;
}

/**
 * Handles different pages
 * @param input
 * @param pageNum
 */
function pg_handler(input: Array<search_results_t>, pageNum?: string): { pageNumber: number, results: search_results_t[] } {
	let pageNumber: number = 1;
	if (pageNum) {
		pageNumber = Number(pageNum);
		input.splice(0, resultsPerPage * (pageNumber - 1));
	}

	if (input.length > resultsPerPage) {
		input.length = resultsPerPage;
	}

	return {
		pageNumber: pageNumber,
		results: input
	};
}

/**
 * Format header & footer lines in chatbox messages
 * @param input_str String to place in the middle of the header/footer
 */
function fmt_header(input_str: string): string {
	let barSize: number = 50 - 1;
	const short: string[] = ["l", "i", "t", "[", "]", " "];

	for (let i: number = 0; i < input_str.length; i++) {
		if (short.includes(input_str[i])) {
			barSize -= 0.4;
		}
		else {
			barSize--;
		}
	}

	barSize = Math.ceil(barSize / 2);

	let barText: string = "";

	for (let i = 0; i < barSize; i++) {
		barText += "=";
	}

	return `${barText} ${input_str} ${barText}`;
}

// Chatbox Command Handler
sc.on("command", async (cmd) => {
	if (aliases.includes(cmd.command)) {
		console.debug(`${cmd.user.name}: ${ cmd.args.join(" ")}`);
		try {
			const shops: Array<shop_t> = await db_shops.find({}, { collation: { locale: "en_US", strength: 2 }}).sort({ "info.name": 1 }).toArray();
			if ((cmd.args[0] == null) || (cmd.args[0] === "help")) {
				// Help message
				await sc.tell(cmd.user.name, `FindShop helps locate ShopSync-compatible shops buying or selling an item.\n\`\\fs list\` - List detected shops\n\`\\fs stats\` - Statistics (currently only shop count)\n\`\\fs buy [item]\` - Finds shops selling *[item]*\n\`\\fs sell [item]\` - Finds shops buying *[item]*\n\`\\fs shop [name]\` - Finds shops named *[name]* and their info`)
			}
			else if (cmd.args[0] === "stats") {
				// Link to stats dashboard
				await sc.tell(cmd.user.name, `Detailed shop statistics can be viewed [here](https://charts.mongodb.com/charts-findshop-lwmvk/public/dashboards/649f2873-58ae-45ef-8079-03201394a531).`);
			}
			else if ((cmd.args[0] === "list") || (cmd.args[0] === "l")) {
				// List shops
				const resultsLength: number = shops.length;

				let pageNumber: number = 1;
				if (cmd.args[1]) {
					pageNumber = Number(cmd.args[1]);
					shops.splice(0, 10 * (pageNumber - 1));
				}

				if (shops.length > 10) {
					shops.length = 10;
				}

				let printResults: string = "";
				for (const shop of shops) {
					printResults += `\n${fmt_name(shop)} at ${fmt_loc(shop.info.location)}`;
				}

				await sc.tell(cmd.user.name, `Results:\n${fmt_header(`Page ${pageNumber} of ${Math.ceil(resultsLength / 10)}`)} ${printResults}\n ${fmt_header("`\\fs list [page]` for more")}`);
			}
			else if ((cmd.args[0] === "buy") || (cmd.args[0] === "b") || (cmd.args[1] == null)) {
				// Find shops selling search_item
				let search_item: string = cmd.args[1];
				if (cmd.args[1] == null) {
					search_item = cmd.args[0];
				}

				let results: Array<search_results_t> = [];
				for (const shop of shops) {
					// Check item length because if this is zero, it will crash!!! Thanks books.kst
					if (shop.items.length > 0) {
						for (const item of shop.items) {
							if (item.item.name == null) {
								console.warn(`A shop (${shop.info.name}) is missing an item name!!`);
							}
							else if (((item.item.name.toLowerCase().includes(search_item.toLowerCase())) || (item.item.displayName.toLowerCase().includes(search_item.toLowerCase()))) && (!item.shopBuysItem) && ((item.stock !== 0) || (item.madeOnDemand))) {
								item.item.name = item.item.name.replace('minecraft:','');
								results.push({
									shop: shop,
									item: item
								})
							}
						}
					}
					else {
						console.warn(`A shop (${shop.info.name}) is broadcasting an empty items array!!`)
					}
				}

				if (results.length === 0) {
					await sc.tell(cmd.user.name, `**Error!** FindShop was unable to find any shops with \`${search_item}\` in stock. [Why are shops and items missing?](${help_link})`);
				}
				else {
					const resultsLength: number = results.length;

					const handler_out = pg_handler(results, cmd.args[2]);
					results = handler_out.results;
					const pageNumber = handler_out.pageNumber;

					let printResults: string = "";
					for (const result of results) {
						printResults += `\n\`${result.item.item.name}\` at ${fmt_name(result.shop)} (${fmt_loc(result.shop.info.location)}) for ${fmt_price(result.item)} (\`${result.item.stock}\` in stock)`;
					}

					await sc.tell(cmd.user.name, `Results:\n${fmt_header(`Page ${pageNumber} of ${Math.ceil(resultsLength / resultsPerPage)}`)} ${printResults}\n${fmt_header("`\\fs buy [item] [page]` for more")}`);
				}
			}
			else if ((cmd.args[0] === "sell") || (cmd.args[0] === "sl")) {
				// Find shops buying search_item
				const search_item: string = cmd.args[1];

				let results: Array<search_results_t> = [];
				for (const shop of shops) {
					for (const item of shop.items) {
						if (item.item.name == null) {
							console.warn(`A shop (${shop.info.name}) is missing an item name!!`);
						}
						else if ((item.item.name.toLowerCase().includes(search_item.toLowerCase()) || item.item.displayName.toLowerCase().includes(search_item.toLowerCase())) && item.shopBuysItem) {
							item.item.name = item.item.name.replace('minecraft:','');
							results.push({
								shop: shop,
								item: item
							})
						}
					}
				}

				if (results.length === 0) {
					await sc.tell(cmd.user.name, `**Error!** FindShop was unable to find any shops buying \`${search_item}\`. [Why are shops and items missing?](${help_link})`);
				}
				else {
					const resultsLength: number = results.length;

					const handler_out = pg_handler(results, cmd.args[2]);
					results = handler_out.results;
					const pageNumber: number = handler_out.pageNumber;

					let printResults: string = "";
					for (const result of results) {
						printResults += `\n\`${ result.item.item.name }\` at ${fmt_name(result.shop)} (${fmt_loc(result.shop.info.location)}) for ${fmt_price(result.item)}`;
					}

					await sc.tell(cmd.user.name, `Results:\n${fmt_header(`Page ${pageNumber} of ${ Math.ceil(resultsLength / resultsPerPage) }`)}${printResults}\n${fmt_header("`\\fs sell [item] [page]` for more")}`);
				}
			}
			else if ((cmd.args[0] === "shop") || (cmd.args[0] === "sh")) {
				// Find shop named search_name
				const search_name: string = cmd.args[1];

				const results: Array<shop_t> = [];
				for (const shop of shops) {
					if (shop.info.name.toLowerCase().includes(search_name.toLowerCase())) {
						results.push(shop)
					}
				}

				if (results.length == 0) {
					await sc.tell(cmd.user.name, `**Error!** FindShop was unable to find any shops named \`${ search_name }\`. [Why are shops and items missing?](${help_link})`);
				}
				else {
					let printResults: string = "";
					if (((results.length > 1) && (cmd.args[2] == null)) || ((cmd.args[2] != null) && (Number(cmd.args[2]) > results.length))) {
						for (let i: number = 0; i < results.length; i++) {
							printResults += `\n(\`${ i + 1 }\`) ${ fmt_name(results[i]) }`
						}

						await sc.tell(cmd.user.name, `Multiple shops were found. Run \`\\fs sh ${search_name} [number]\` to see specific information. ${printResults}`);
					}
					else {
						let display_shop_idx: number = 1;
						if (cmd.args[2] != null) {
							display_shop_idx = Number(cmd.args[2]);
						}
						const display_shop: shop_t = results[display_shop_idx - 1];

						printResults = fmt_name(display_shop);
						if (display_shop.info.owner) {
							printResults += ` *by ${display_shop.info.owner}*`;
						}
						printResults += `\n`;

						if (display_shop.info.location) {
							printResults += `Located at ${ fmt_loc(display_shop.info.location) }`
							if (display_shop.info.location.dimension) {
								printResults += ` in the \`${ display_shop.info.location.dimension }\``
							}
							if ((display_shop.info.otherLocations) && (display_shop.info.otherLocations.length > 0)) {
								printResults += ` +\`${ display_shop.info.otherLocations.length }\` other locations`
							}
							printResults += `\n`;
						}

						printResults += `Last seen \`${new Date(display_shop.findShop.lastSeen).toUTCString()}\`\n`;

						if (display_shop.info.software) {
							printResults += `Running \`${display_shop.info.software.name}\``;
							if (display_shop.info.software.version) {
								printResults += ` \`${display_shop.info.software.version}\``;
							}
							printResults += `\n`;
						}

						printResults += `Selling \`${display_shop.items.length}\` items`;
						await sc.tell(cmd.user.name, printResults);
					}
				}
			}
		}
		catch(err) {
			console.error(err);
			await sc.tell(cmd.user.name, `An error occurred!\n\`\`\`${err}\`\`\``);
		}
	}
});

sc.on("ready", () => {
	console.info(`FindShop - ${Date()}\nChatbox registered to ${sc.owner}`);
});

process.on("exit", async () => {
	await db_client.close();
});

sc.connect();