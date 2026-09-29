#!/usr/bin/env node
import { make } from "./commands/make.js";

make(process.argv.slice(2)).then((messages) => {
  for (const message of messages) console.log(message);
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Generation failed");
  process.exitCode = 1;
});
