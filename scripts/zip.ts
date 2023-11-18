import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import archiver from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

const archiveName = process.argv[2];
const targetDir = process.argv[3];

const output = createWriteStream(join(rootDir, archiveName));
const archive = archiver("zip", { zlib: { level: 9 } });

console.log(`Creating ${archiveName}...`);

output.on("close", () => {
  console.log(
    `The archive has been created (${archive.pointer()} total bytes)`,
  );
});

output.on("end", () => {
  console.log("Data has been drained");
});

archive.on("warning", (err) => {
  if (err.code === "ENOENT") {
    console.warn(err);
  } else {
    throw err;
  }
});

archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);

archive.directory(join(rootDir, targetDir), false);

await archive.finalize();
