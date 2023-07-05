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
import Keys from "./keys.json" assert { type: "json" };

const aliases = ["fs", "find", "findshop"]
const sc = new Client(Keys.CB_KEY);
const help_link = "https://github.com/slimit75/FindShop/wiki/Why-are-shops-and-items-missing%3F";
const db_endpoint = "https://us-east-1.aws.data.mongodb-api.com/app/data-wcgdk/endpoint/data/v1";

sc.defaultName = "&6&lFindShop";
sc.defaultFormattingMode = "markdown";

/**
 * Generates human-readable coordinates
 * @param location Input coordinates from shop
 */
function genCoords(location) {
    let shopLocation = "Unknown";

    if (location) {
        if (location.coordinates) {
            shopLocation = `${location.coordinates[0]}, ${location.coordinates[1]}, ${location.coordinates[2]}`
        }
        else if (location.description) {
            shopLocation = location.description
        }
    }

    return shopLocation
}

/**
 * Generates human-readable prices
 * @param item Input item from shop
 */
function fmt_price(item) {
    if (item.dynamicPrice) {
        return `\`${ item.prices[0].value }*\` ${ item.prices[0].currency }`
    }
    else {
        return `\`${ item.prices[0].value }\` ${ item.prices[0].currency }`
    }
}

/**
 * Fetches data from the database
 */
async function fetchData() {
    const body = {
        dataSource: "Cluster0",
        database: "Main_DB",
        collection: "Main DB",
        filter: {}
    }

    const resp = await fetch(db_endpoint + "/action/find", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": Keys.DB_KEY,
        },
        body: JSON.stringify(body)
    });

    const temp = await resp.json();
    return temp.documents;
}

// Chatbox Command Handler
sc.on("command", async (cmd) => {
    if (aliases.includes(cmd.command)) {
        console.debug(`${ cmd.user.name }: ${cmd.args.join(" ")}`);
        try {
            if ((cmd.args[0] == null) || (cmd.args[0] == "help")) {
                // Help message
                await sc.tell(cmd.user.name, `FindShop helps locate ShopSync-compatible shops buying or selling an item.\n\`\\fs list\` - List detected shops\n\`\\fs stats\` - Statistics (currently only shop count)\n\`\\fs buy [item]\` - Finds shops selling *[item]*\n\`\\fs sell [item]\` - Finds shops buying *[item]*\n\`\\fs shop [name]\` - Finds shops named *[name]* and their info`)
            }
            else if (cmd.args[0] == "stats") {
                // Link to stats dashboard
                await sc.tell(cmd.user.name, `Detailed shop statistics can be viewed [here](https://charts.mongodb.com/charts-findshop-lwmvk/public/dashboards/649f2873-58ae-45ef-8079-03201394a531).`);
            }
            else if ((cmd.args[0] == "list") || (cmd.args[0] == "l")) {
                // List shops
                const shops = await fetchData();
                let printResults = "";

                for (const shop of shops) {
                    printResults += `\n**${ shop.info.name }** at \`${ genCoords(shop.info.location) }\``;
                }

                await sc.tell(cmd.user.name, `FindShop found the following shops:\n${ printResults }`);
            }
            else if ((cmd.args[0] == "buy") || (cmd.args[0] == "b") || (cmd.args[1] == null)) {
                // Find shops selling search_item
                let search_item = cmd.args[1];
                if (cmd.args[1] == null) {
                    search_item = cmd.args[0];
                }

                const shops = await fetchData();
                const results = [];
                for (const shop of shops) {
                    // Check item length because if this is zero, it will crash!!! Thanks books.kst
                    if (shop.items.length > 0) {
                        for (const item of shop.items) {
                            if (item.item.name == null) {
                                console.warn(`A shop (${shop.info.name}) is missing an item name!!`);
                            }
                            else if (((item.item.name.toLowerCase().includes(search_item.toLowerCase())) || (item.item.displayName.toLowerCase().includes(search_item.toLowerCase()))) && (!item.shopBuysItem) && ((item.stock != 0) || (item.madeOnDemand))) {
                                results.push({
                                    shop: shop.info,
                                    item: item
                                })
                            }
                        }
                    }
                    else {
                        console.warn(`A shop (${shop.info.name}) is broadcasting an empty items array!!`)
                    }
                }

                if (results.length == 0) {
                    await sc.tell(cmd.user.name, `**Error!** FindShop was unable to find any shops with \`${ search_item }\` in stock. [Why are shops and items missing?](${help_link})`);
                }
                else {
                    let printResults = "";

                    if (results.length > 5) {
                        await sc.tell(cmd.user.name, "**Note:** Too many results found. Shorting the list to the first 5 results.");
                        results.length = 5;
                    }

                    for (const result of results) {
                        printResults += `\n\`${ result.item.item.name }\` at **${ result.shop.name }** (\`${ genCoords(result.shop.location) }\`) for ${ fmt_price(result.item) } (\`${ result.item.stock }\` in stock)`;
                    }

                    await sc.tell(cmd.user.name, `Here's what we found for \`${ search_item }\`: ${ printResults }`);
                }
            }
            else if ((cmd.args[0] == "sell") || (cmd.args[0] == "sl")) {
                // Find shops buying search_item
                const search_item = cmd.args[1];

                const shops = await fetchData();
                const results = [];
                for (const shop of shops) {
                    for (const item of shop.items) {
                        if (item.item.name == null) {
                            console.warn(`A shop (${shop.info.name}) is missing an item name!!`);
                        }
                        else if ((item.item.name.toLowerCase().includes(search_item.toLowerCase()) || item.item.displayName.toLowerCase().includes(search_item.toLowerCase())) && item.shopBuysItem) {
                            results.push({
                                shop: shop.info,
                                item: item
                            })
                        }
                    }
                }

                if (results.length == 0) {
                    await sc.tell(cmd.user.name, `**Error!** FindShop was unable to find any shops buying \`${ search_item }\`. [Why are shops and items missing?](${help_link})`);
                }
                else {
                    let printResults = "";

                    if (results.length > 5) {
                        await sc.tell(cmd.user.name, "**Note:** Too many results found. Shorting the list to the first 5 results.");
                        results.length = 5;
                    }

                    for (const result of results) {
                        printResults += `\n\`${ result.item.item.name }\` at **${ result.shop.name }** (\`${ genCoords(result.shop.location) }\`) for ${ fmt_price(result.item) }`;
                    }

                    await sc.tell(cmd.user.name, `Here's what we found for \`${ search_item }\`: ${ printResults }`);
                }
            }
            else if ((cmd.args[0] == "shop") || (cmd.args[0] == "sh")) {
                // Find shop named search_name
                const search_name = cmd.args[1];

                const shops = await fetchData();
                const results = [];
                for (const shop of shops) {
                    if (shop.info.name.toLowerCase().includes(search_name.toLowerCase())) {
                        results.push(shop)
                    }
                }

                if (results.length == 0) {
                    await sc.tell(cmd.user.name, `**Error!** FindShop was unable to find any shops named \`${ search_name }\`. [Why are shops and items missing?](${help_link})`);
                }
                else {
                    let printResults = "";
                    if (((results.length > 1) && (cmd.args[2] == null)) || ((cmd.args[2] != null) && (Number(cmd.args[2]) > results.length))) {
                        for (let i = 0; i < results.length; i++) {
                            printResults += `\n(\`${ i + 1 }\`) ${ results[i].info.name }`
                        }

                        await sc.tell(cmd.user.name, `Multiple shops were found. Run \`\\fs sh ${ search_name } [number]\` to see specific information. ${ printResults }`);
                    }
                    else {
                        let display_shop_idx = 1;
                        if (cmd.args[2] != null) {
                            display_shop_idx = Number(cmd.args[2]);
                        }
                        const display_shop = results[display_shop_idx - 1];

                        printResults = `**${ display_shop.info.name }**`;
                        if (display_shop.info.owner) {
                            printResults += ` *by ${ display_shop.info.owner }*`;
                        }
                        printResults += `\n`;

                        if (display_shop.info.location) {
                            printResults += `Located at \`${ genCoords(display_shop.info.location) }\``
                            if (display_shop.info.location.dimension) {
                                printResults += ` in the \`${ display_shop.info.location.dimension }\``
                            }
                            if ((display_shop.info.otherLocations) && (display_shop.info.otherLocations.length > 0)) {
                                printResults += ` +\`${ display_shop.info.otherLocations.length }\` other locations`
                            }
                            printResults += `\n`;
                        }

                        if (display_shop.info.software) {
                            printResults += `Running \`${ display_shop.info.software.name }\``;
                            if (display_shop.info.software.version) {
                                printResults += ` v\`${ display_shop.info.software.version }\``;
                            }
                            printResults += `\n`;
                        }

                        printResults += `Selling \`${ display_shop.items.length }\` items`;
                        await sc.tell(cmd.user.name, printResults);
                    }
                }
            }
        }
        catch(err) {
            console.error(err);
            await sc.tell(cmd.user.name, `An error occurred!\n\`\`\`${ err }\`\`\``);
        }
    }
});

sc.on("ready", () => {
    console.log("Started FindShop Chatbox Server!");
});

sc.connect();