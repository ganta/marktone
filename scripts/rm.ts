import { rm } from "node:fs/promises";
import { parseArgs } from "node:util";

const { positionals } = parseArgs({ allowPositionals: true });

for (const path of positionals) {
  await rm(path, { force: true, recursive: true });
}
