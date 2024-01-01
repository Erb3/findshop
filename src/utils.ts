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
  else if (description) output += ` (${description})`;
  if (dimension && output === "") output += `the ${dimension.toLowerCase()}`;
  else if (dimension) output += ` in the ${dimension.toLowerCase()}`;
  if (output === "") return "Unknown";

  return output;
}
