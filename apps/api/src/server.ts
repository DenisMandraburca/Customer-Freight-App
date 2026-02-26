import { createRepository } from '@antigravity/db';

import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { createDevPortalSessionMiddleware } from './middleware/devSession.js';

async function main(): Promise<void> {
  const repository = await createRepository();
  const portalSessionMiddleware = createDevPortalSessionMiddleware();
  const app = createApp(repository, portalSessionMiddleware ? { portalSessionMiddleware } : {});

  app.listen(config.port, () => {
    logger.info({ port: config.port, apiBasePath: config.apiBasePath }, 'Customer Freight API listening');
  });
}

main().catch((error) => {
  logger.error({ err: error }, 'Failed to boot API');
  process.exit(1);
});
