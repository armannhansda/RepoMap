import { getDB } from './db';
import { OpenedFile } from '@/types/repository';

/**
 * Saves or updates an opened file in the cache
 */
export async function saveOpenedFile(file: OpenedFile): Promise<void> {
  const db = await getDB();
  await db.put('openedFiles', file);
}

/**
 * Retrieves an opened file by composite key [repoId, path]
 */
export async function getOpenedFile(repoId: string, path: string): Promise<OpenedFile | undefined> {
  const db = await getDB();
  return await db.get('openedFiles', [repoId, path]);
}

/**
 * Deletes a cached opened file
 */
export async function deleteOpenedFile(repoId: string, path: string): Promise<void> {
  const db = await getDB();
  await db.delete('openedFiles', [repoId, path]);
}
