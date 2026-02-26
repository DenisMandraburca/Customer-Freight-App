import { getDb } from './client.js';
import { resolveDbProvider } from './dbConfig.js';
import { runMigrations } from './migrations.js';
import { FreightRepository } from './repository.js';

export * from './client.js';
export * from './migrations.js';
export * from './repository.js';

export async function createRepository(): Promise<FreightRepository> {
  if (resolveDbProvider() === 'sqlite') {
    await runMigrations();
  }

  const db = await getDb();
  const repository = new FreightRepository(db);
  await repository.bootstrapDefaults();
  return repository;
}
