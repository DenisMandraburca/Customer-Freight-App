import { getDb } from './client.js';
import { FreightRepository } from './repository.js';

export * from './client.js';
export * from './migrations.js';
export * from './repository.js';

export async function createRepository(): Promise<FreightRepository> {
  const db = await getDb();
  const repository = new FreightRepository(db);
  await repository.bootstrapDefaults();
  return repository;
}
