import { createRepository } from '@antigravity/db';

import { createApp } from './app.js';
import { config } from './config.js';

async function main(): Promise<void> {
  const repository = await createRepository();
  const app = createApp(repository);

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Antigravity API listening on http://localhost:${config.port}`);
  });
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to boot API:', error);
  process.exit(1);
});