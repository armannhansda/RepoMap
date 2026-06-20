import { useState, useMemo } from "react";
import { Folder, ChevronRight, ChevronDown, Database, Route, Search, Settings, HelpCircle, File as FileIcon, Code } from "lucide-react";

interface LeftSidebarProps {
  nodes: any[];
  onNodeSelect: (nodeId?: string) => void;
  selectedNodeId?: string;
  repoName: string;
}

type FileTree = {
  [key: string]: {
    isFile: boolean;
    children: FileTree;
    nodeId?: string;
  };
};

export default function LeftSidebar({ nodes, onNodeSelect, selectedNodeId, repoName }: LeftSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["packages", "src"]));

  // Build a nested file tree from the flat nodes array
  const fileTree = useMemo(() => {
    const tree: FileTree = {};
    const fileNodes = nodes?.filter(n => n.type === "file") || [];

    for (const node of fileNodes) {
      const parts = node.path ? node.path.split("/") : [node.label];
      let currentLevel = tree;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;

        if (!currentLevel[part]) {
          currentLevel[part] = {
            isFile,
            children: {},
            nodeId: isFile ? node.id : undefined,
          };
        }
        currentLevel = currentLevel[part].children;
      }
    }
    return tree;
  }, [nodes]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const renderTree = (tree: FileTree, parentPath: string = "", level: number = 0) => {
    return Object.entries(tree).sort((a, b) => {
      if (a[1].isFile === b[1].isFile) return a[0].localeCompare(b[0]);
      return a[1].isFile ? 1 : -1; // Folders first
    }).map(([name, node]) => {
      const currentPath = parentPath ? `${parentPath}/${name}` : name;
      const isExpanded = expandedFolders.has(currentPath);
      const isSelected = selectedNodeId === node.nodeId || 
        (selectedNodeId && node.nodeId && selectedNodeId.startsWith(node.nodeId + '::'));

      if (!node.isFile) {
        return (
          <div key={currentPath}>
            <div 
              className="flex items-center gap-1.5 py-1 px-2 hover:bg-surface-hover cursor-pointer rounded text-text-muted hover:text-text-main transition-colors"
              style={{ paddingLeft: `${level * 12 + 8}px` }}
              onClick={() => {
                toggleFolder(currentPath);
                onNodeSelect(undefined);
              }}
            >
              <Folder className="w-4 h-4" />
              <span className="truncate">{name}</span>
            </div>
            {isExpanded && (
              <div>
                {renderTree(node.children, currentPath, level + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div 
          key={currentPath}
          className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer rounded transition-colors ${isSelected ? 'bg-surface-active text-brand' : 'text-text-muted hover:bg-surface-hover hover:text-text-main'}`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => node.nodeId && onNodeSelect(node.nodeId)}
        >
          {name.endsWith('.ts') || name.endsWith('.tsx') ? (
            <Code className={`w-4 h-4 ${isSelected ? 'text-brand' : 'text-text-muted'}`} />
          ) : (
            <FileIcon className={`w-4 h-4 ${isSelected ? 'text-brand' : 'text-text-muted'}`} />
          )}
          <span className="truncate">{name}</span>
        </div>
      );
    });
  };

  return (
    <div className="w-full border-r border-border-subtle bg-bg-base flex flex-col h-full text-sm">
      {/* Header */}
      <div className="p-4 border-b border-border-subtle flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-surface-active border border-border-subtle flex items-center justify-center">
          <Folder className="w-4 h-4 text-brand" />
        </div>
        <div className="overflow-hidden">
          <h2 className="font-semibold text-text-main truncate" title={repoName}>{repoName || "Project"}</h2>
          <p className="text-xs text-text-muted">main branch</p>
        </div>
      </div>

      {/* Accordions */}
      <div className="flex-1 overflow-y-auto py-2">
        
        {/* Explorer Section */}
        <div>
          <div className="flex items-center gap-2 px-4 py-2 text-text-main font-medium bg-surface-active border-l-2 border-brand">
            <Folder className="w-4 h-4" />
            <span>Explorer</span>
          </div>
          <div className="py-2">
            {Object.keys(fileTree).length > 0 ? (
              renderTree(fileTree)
            ) : (
              <p className="px-4 text-text-muted text-xs italic">No files to display</p>
            )}
          </div>
        </div>



        {/* Search Section */}
        {/* <div className="mt-4">
          <div className="flex items-center gap-2 px-4 py-2 text-text-muted">
            <Search className="w-4 h-4" />
            <span>Search</span>
          </div>
          <div className="px-4 pb-2">
            <input 
              type="text" 
              placeholder="Search files..." 
              className="w-full bg-surface border border-border-subtle rounded py-1 px-2 text-text-main placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors text-xs"
            />
          </div>
        </div> */}
      </div>

      {/* Footer */}
      {/* <div className="p-4 border-t border-border-subtle flex flex-col gap-4">
        <div className="flex justify-between items-center text-text-muted">
          <Settings className="w-4 h-4 hover:text-text-main cursor-pointer" />
          <HelpCircle className="w-4 h-4 hover:text-text-main cursor-pointer" />
        </div>
      </div> */}
    </div>
  );
}
