import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Repository, OpenedFile } from '@/types/repository';
import { GraphData } from '@/types/graph';

/**
 * Defines the strict schema for the repomap-db IndexedDB
 */
export interface RepoMapDB extends DBSchema {
  repositories: {
    key: string; // The primary key (repoUrl)
    value: Repository;
    indexes: {
      repoUrl: string; // Index to quickly lookup by repoUrl
    };
  };
  graph: {
    key: string; // The primary key (repoId)
    value: GraphData;
  };
  openedFiles: {
    key: [string, string]; // Composite primary key: [repoId, path]
    value: OpenedFile;
    indexes: {
      repoId: string; // Index to query all files belonging to a specific repo
    };
  };
}

const DB_NAME = 'repomap-db';
const DB_VERSION = 1;

// Cache the db promise so we don't open the connection multiple times
let dbPromise: Promise<IDBPDatabase<RepoMapDB>> | null = null;

/**
 * Initializes and returns the IndexedDB instance.
 * Automatically handles schema migrations and object store creation safely.
 */
export async function getDB(): Promise<IDBPDatabase<RepoMapDB>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB cannot be accessed on the server side.');
  }

  if (!dbPromise) {
    dbPromise = openDB<RepoMapDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // STORE 1: repositories
        if (!db.objectStoreNames.contains('repositories')) {
          const repoStore = db.createObjectStore('repositories', { keyPath: 'id' });
          repoStore.createIndex('repoUrl', 'repoUrl', { unique: true });
        }

        // STORE 2: graph
        if (!db.objectStoreNames.contains('graph')) {
          db.createObjectStore('graph', { keyPath: 'repoId' });
        }

        // STORE 3: openedFiles
        if (!db.objectStoreNames.contains('openedFiles')) {
          const filesStore = db.createObjectStore('openedFiles', { keyPath: ['repoId', 'path'] });
          filesStore.createIndex('repoId', 'repoId');
        }
      },
    });
  }
  return dbPromise;
}
