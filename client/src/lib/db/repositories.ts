import { getDB } from './db';
import { Repository } from '@/types/repository';

/**
 * Saves or updates a repository in IndexedDB
 */
export async function saveRepository(repo: Repository): Promise<void> {
  const db = await getDB();
  await db.put('repositories', repo);
}

/**
 * Retrieves a repository by its URL (which acts as its ID)
 */
export async function getRepository(repoUrl: string): Promise<Repository | undefined> {
  const db = await getDB();
  return await db.get('repositories', repoUrl);
}

/**
 * Retrieves all saved repositories
 */
export async function getAllRepositories(): Promise<Repository[]> {
  const db = await getDB();
  return await db.getAll('repositories');
}

/**
 * Deletes a repository
 */
export async function deleteRepository(repoUrl: string): Promise<void> {
  const db = await getDB();
  await db.delete('repositories', repoUrl);
}

/**
 * A comprehensive helper to delete the repository, its graph, and all associated opened files simultaneously using a transaction.
 */
export async function clearRepositoryData(repoUrl: string): Promise<void> {
  const db = await getDB();
  
  // Start a transaction across all 3 stores to ensure all deletions happen atomically
  const tx = db.transaction(['repositories', 'graph', 'openedFiles'], 'readwrite');
  
  // Delete the repository
  await tx.objectStore('repositories').delete(repoUrl);
  
  // Delete the graph
  await tx.objectStore('graph').delete(repoUrl);
  
  // Delete all opened files for this repo using the repoId index
  const openedFilesStore = tx.objectStore('openedFiles');
  const index = openedFilesStore.index('repoId');
  const keys = await index.getAllKeys(repoUrl);
  
  for (const key of keys) {
    await openedFilesStore.delete(key);
  }

  await tx.done;
}
