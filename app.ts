import { Client } from "npm:switchchat";
import Keys from "./keys.json" assert { type: "json" };

const aliases: string[] = ["fse", "finds", "findshop-exp"]
const sc: Client = new Client(Keys.CB_KEY);
const help_link = "https://github.com/slimit75/FindShop/wiki/Why-are-shops-and-items-missing%3F";
const db_endpoint = "https://us-east-1.aws.data.mongodb-api.com/app/data-wcgdk/endpoint/data/v1";

sc.defaultName = "&6&lFindShop Experimental";
sc.defaultFormattingMode = "markdown";

interface location_s {
    coordinates?: number[],
    description?: string,
    dimension?: string
}

interface item_s {
    prices: {
        value: number,
        currency: string,
        address: string,
        requiredMeta?: string
    }[],
    item: {
        name: string,
        displayName: string,
        nbt?: string
    }
    dynamicPrice?: boolean,
    stock?: number,
    madeOnDemand?: boolean,
    requiresInteraction?: boolean,
    shopBuysItem?: boolean,
    noLimit?: boolean
}

interface Shop {
    type: string,
    info: {
        name: string,
        description?: string,
        owner?: string,
        computerID?: number,
        multiShop?: number,
        software?: {
            name?: string,
            version?: string
        },
        location: location_s,
        otherLocations?: location_s[],

    }
    items: item_s[]
}

function genCoords(location: location_s): string {
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

function fmt_price(item: item_s): string {
    if (item.dynamicPrice)
        return `\`${ item.prices[0].value }*\` ${ item.prices[0].currency }`
    else
        return `\`${ item.prices[0].value }\` ${ item.prices[0].currency }`
}

async function fetchData() {
    const body = {
        dataSource: "Cluster0",
        database: "Main_DB",
        collection: "Main DB",
        filter: {}
    }

    const resp: Response = await fetch(db_endpoint + "/action/find", {
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

sc.on("command", async (cmd) => {
    if (aliases.includes(cmd.command)) {
        if ((cmd.args[0] == null) || (cmd.args[0] == "help")) {
            await sc.tell(cmd.user.name, "FindShop is a service to locate any shops buying or selling an item. We have a few subcommands, too: \n`\\fs list` - List detected shops\n`\\fs stats` - Statistics (currently only shop count)\n`\\fs buy <item>` - Finds shops selling *<item>*\n`\\fs sell <item>` - Finds shops buying *<item>*\n`\\fs shop <name>` - Finds shops named *<name>* and their info")
        }
        else if (cmd.args[0] == "stats") {
            await sc.tell(cmd.user.name, "Detailed shop statistics can be viewed [here](https://charts.mongodb.com/charts-findshop-lwmvk/public/dashboards/649f2873-58ae-45ef-8079-03201394a531).");
        }
        else if ((cmd.args[0] == "list") || (cmd.args[0] == "l")) {
            const shops: Array<Shop> = await fetchData();
            let printResults = "";

            for (const shop of shops) {
                printResults += `\n**${ shop.info.name }** at \`${ genCoords(shop.info.location) }\``;
            }

            await sc.tell(cmd.user.name, `FindShop found the following shops:\n${ printResults }`);
        }
        else if ((cmd.args[0] == "buy") || (cmd.args[0] == "b") || (cmd.args[1] == null)) {
            let search_item;
            if (cmd.args[1] == null)
                search_item = cmd.args[0];
            else
                search_item = cmd.args[1];

            const shops: Array<Shop> = await fetchData();
            let results = [];
            for (const shop of shops) {
                for (const item of shop.items) {
                    if (item.item.name == null) {
                        console.debug(`A shop (${shop.info.name}) is missing an item name!!`);
                    }
                    else if (((item.item.name.toLowerCase().includes(search_item.toLowerCase())) || (item.item.displayName.toLowerCase().includes(search_item.toLowerCase()))) && (!item.shopBuysItem) && ((item.stock != 0) || (item.madeOnDemand))) {
                        results.push({
                            shop: shop.info,
                            item: item
                        })
                    }
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
            const search_item: string = cmd.args[1];

            const shops: Array<Shop> = await fetchData();
            let results = [];
            for (const shop of shops) {
                for (const item of shop.items) {
                    if (item.item.name == null) {
                        console.debug(`A shop (${shop.info.name}) is missing an item name!!`);
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
            const search_name: string = cmd.args[1];

            const shops: Array<Shop> = await fetchData();
            let results: Array<Shop> = [];
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
                    for (var i = 0; i < results.length; i++) {
                        printResults += `\n(\`${ i + 1 }\`) ${ results[i].info.name }`
                    }

                    await sc.tell(cmd.user.name, `Multiple shops were found. Run \`\\fs sh ${ search_name } [number]\` to see specific information. ${ printResults }`);
                }
                else {
                    let display_shop_idx = 1;
                    if (cmd.args[2] != null) {
                        display_shop_idx = Number(cmd.args[2]);
                    }

                    const display_shop:Shop = results[display_shop_idx - 1];

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

                        if (display_shop.info.otherLocations) {
                            printResults += `+ \`${ display_shop.info.otherLocations.length }\` other locations`
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
});

sc.on("ready", () => {
    console.log("Started FindShop Chatbox Server");
});

sc.connect();