import { z as zod } from "zod";

const urlValidator = zod.string().url();

export enum Dimension {
    Overworld = 0,
    Nether = -1,
    End = 1,
}

// Formats the location of a shop
// Prioritises the description, if it is a URL.
// Otherwise, it formats the coordinates in the format of
// x y z (description) in the dimension
export function formatLocation({
    x,
    y,
    z,
    description,
    dimension,
}: {
    x?: number;
    y?: number;
    z?: number;
    description?: string;
    dimension?: string;
}) {
    description = description?.trim();

    if (urlValidator.safeParse(description).success)
        return `\`${description}\``;
    let output = "";

    if (x && y && z) output += `\`${x} ${y} ${z}\``;
    if (description && output === "") output += description;
    else if (description) output += ` (${description}) `;
    if (dimension && output === "") output += "the " + dimension;
    else if (dimension) output += `in the ${dimension}`;
    if (output === "") return "Unknown";

    return output;
}

interface ResponseGeneratorOptions {
    content: string[];
    page: number;
    args: string;
}

export function paginate(options: ResponseGeneratorOptions) {
    const { content: body, args, page } = options;
    const resultsPerPage = 6;
    const pageCount = Math.ceil(body.length / resultsPerPage);
    const header = `Results ${page}/${pageCount}:`;
    const footer = `\`\\fs ${args} <page>\``;

    if (pageCount == 0) return "No results matching search";

    if (page < 1) return "Page out of bounds";
    if (page > pageCount) return "Page out of bounds";

    const bodyText = body
        .slice(
            (page - 1) * resultsPerPage,
            (page - 1) * resultsPerPage + resultsPerPage
        )
        .reduce((acc, v) => {
            return acc + v + "\n";
        }, "")
        .substring(0, 1024 - header.length - footer.length - 2);

    return `${header}\n${bodyText}\n${footer}`;
}

export function sanitizeMarkdown(input: string | string[]) {
    const regex = /[\\`*|]|(krist:\/\/)/g;
    if (typeof input === "string") input = [input];
    return input.map((v) => v.replaceAll(regex, ""));
}

export function sliceArgs(str: string): string[] {
    const regex = /"([^"]*)"|'([^']*)'|\S+/g;
    const args: string[] = [];
    let match;

    while ((match = regex.exec(str)) !== null) {
        args.push(match[1] || match[2] || match[0]);
    }

    return args;
}
