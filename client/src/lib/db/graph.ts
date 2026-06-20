import { getDB } from './db';
import { GraphData } from '@/types/graph';

/**
 * Saves or updates the React Flow graph for a specific repository
 */
export async function saveGraph(graph: GraphData): Promise<void> {
  const db = await getDB();
  await db.put('graph', graph);
}

/**
 * Retrieves the graph data for a repository
 */
export async function getGraph(repoId: string): Promise<GraphData | undefined> {
  const db = await getDB();
  return await db.get('graph', repoId);
}

/**
 * Deletes the graph data for a repository
 */
export async function deleteGraph(repoId: string): Promise<void> {
  const db = await getDB();
  await db.delete('graph', repoId);
}
