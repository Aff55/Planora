import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { closeRedis } from "./lib/redis.js";
import { assertSecureAuthConfiguration } from "./middleware/auth.js";
import { warmUpCompanionModel } from "./services/companion.js";

const port = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}
assertSecureAuthConfiguration();
const app = createApp();

const server = app.listen(port, () => {
  console.log(`Planora API listening on http://localhost:${port}`);
  // Load the local model now so the first companion question does not pay the
  // cold-start cost and time out into the deterministic fallback.
  warmUpCompanionModel();
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down Planora API.`);
  server.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), closeRedis()]);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
