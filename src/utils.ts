import { Prisma } from "@prisma/client";
import { z as zod } from "zod";

const urlValidator = zod.string().url();

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
}: Prisma.LocationCreateInput) {
  description = description?.trim();

  if (urlValidator.safeParse(description).success) return `\`${description}\``;
  let output = "";

  if (x && y && z) output += `\`${x} ${y} ${z}\``;
  if (description && output === "") output += description;
  // else if (description) output += ` (${description})`;
  if (dimension && output === "") output += `the ${dimension.toLowerCase()}`;
  else if (dimension) output += ` in the ${dimension.toLowerCase()}`;
  if (output === "") return "Unknown";

  return output;
}

/*
export function paginate<T>(data: Array<T>, page: number) {
  const perPage = 6;
  return data.slice(perPage * (page - 1), perPage * page); // too much effort, ill try to make something not awful looking
}*/

interface ResponseGeneratorOptions {
  content: string[];
  page: number;
  args: string;
}

export function makeResponse(options: ResponseGeneratorOptions) {
  return paginate(options.content, options.args, options.page);
  /*
  const perPage = 5;
  const possiblePage = parseInt(options.args.split(" ").at(-1) || "a");
  let page = possiblePage;
  if (!possiblePage) page = 0;

  const output: string[] = [
    "Results:",
    "Page x of y"
  ];

  output.push(...options.content);


  output.push(`\`\\fs ${options.args} nextPage\` for more`)
  return output.join("\n");
  */
}

export function paginate(body: string[], args: string, page: number) {
  const maxChars = 1024;
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

  /*
  let bodyi = 0;
  let pgi = 0;
  while (pgi++) {
    let totalSize = 0;
    totalSize += header.replaceAll("{page}", "00")
                       .replaceAll("{pageCount}", "00")
                       .length;                              // header
    totalSize += 1                                           // newline
    totalSize += footer.replaceAll("{page}", "00")
                       .replaceAll("{pageCount}", "00")
                       .length;                              // footer
     
    for (let i=bodyi;i<body.length;i++) {

    }
  }
  */
}

export function sanitizeMarkdown(input: string | string[]) {
  const regex = /[\\`*|]|(krist:\/\/)/g;
  if (typeof input === "string") input = [input];
  return input.map((v) => v.replaceAll(regex, ""));
}
