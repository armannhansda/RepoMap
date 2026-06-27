export interface FileTreeNode {
  path: string;
  name: string;
  parent: string | null;
  type: "file" | "folder";
}

export interface Repository {
  id: string; // The repoUrl acts as the primary key id
  repoUrl: string;
  repoName: string;
  branch: string;
  commitHash: string;
  analyzedAt: number;
  
  fileTree: FileTreeNode[];
  lastOpenedFile?: string;
  expandedFolders?: string[];
  
  graphViewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface OpenedFile {
  repoId: string;
  path: string;
  content: string;
  updatedAt: number;
  commitsCount?: number;
}
