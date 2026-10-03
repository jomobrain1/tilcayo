#!/usr/bin/env node
import { make } from "./commands/make.js";
import { listRoutes } from "./commands/routes.js";
import { runApp } from "./commands/run.js";

const args = process.argv.slice(2);
(args[0] === "routes:list" ? listRoutes(args.slice(1)) : ["build", "start", "dev", "dev:serve"].includes(args[0]) ? runApp(args) : make(args)).then((messages) => {
  for (const message of messages) console.log(message);
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Command failed");
  process.exitCode = 1;
});
