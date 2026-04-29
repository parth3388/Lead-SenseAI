const { createServer } = require("./src/app");
const { connectDatabase } = require("./src/config/database");
const { logger } = require("./src/utils/logger");

async function start() {
  const PORT = Number(process.env.PORT) || 5000;

  await connectDatabase();

  const { server } = createServer();

  server.listen(PORT, () => {
    logger.info("Server started", {
      port: PORT,
    });
  });
}

start().catch((error) => {
  logger.error("Failed to start server", {
    error: error.message,
  });
  process.exit(1);
});
