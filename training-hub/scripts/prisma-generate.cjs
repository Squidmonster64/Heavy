"use strict";

/**
 * Railway/Nixpacks may run `npm ci` and `next build` before DATABASE_URL
 * is available (or while it is a private runtime-only variable).
 * `prisma generate` only needs a syntactically valid URL; it does not connect.
 * `prisma migrate deploy` stays on the start command and uses the real URL.
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://build:build@127.0.0.1:5432/build?schema=public";
}

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const prismaCli = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, "generate"], {
  stdio: "inherit",
  env: process.env,
  cwd: path.join(__dirname, ".."),
});

process.exit(result.status === null ? 1 : result.status);
