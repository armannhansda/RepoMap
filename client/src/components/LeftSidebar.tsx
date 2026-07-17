import React, { useState, useMemo, memo } from "react";
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

function LeftSidebarComponent({ nodes, onNodeSelect, selectedNodeId, repoName }: LeftSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["packages", "src"]));
  const [searchQuery, setSearchQuery] = useState("");

  // Build a nested file tree from the flat nodes array
  const fileTree = useMemo(() => {
    const tree: FileTree = {};
    const fileNodes = nodes?.filter(n => n.type === "file" && (!searchQuery || (n.path || n.label || "").toLowerCase().includes(searchQuery.toLowerCase()))) || [];

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
              className="flex items-center gap-1.5 py-1 px-2 hover:bg-white/10 cursor-pointer rounded text-text-muted hover:text-white transition-all duration-200"
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
          className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer rounded transition-all duration-200 ${isSelected ? 'bg-white/15 text-white' : 'text-text-muted hover:bg-white/10 hover:text-white'}`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => node.nodeId && onNodeSelect(node.nodeId)}
        >
          {name.endsWith('.ts') || name.endsWith('.tsx') ? (
            <Code className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-text-muted'}`} />
          ) : (
            <FileIcon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-text-muted'}`} />
          )}
          <span className="truncate">{name}</span>
        </div>
      );
    });
  };

  return (
    <div className="w-full border-r border-white/10 bg-black/20 backdrop-blur-md flex flex-col h-full text-sm relative z-40">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
          <Folder className="w-4 h-4 text-white" />
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
          <div className="flex items-center justify-between px-4 py-2 text-white font-medium bg-white/5 border-l-2 border-white backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4" />
              <span>Explorer</span>
            </div>
          </div>

          {/* Search Input */}
          <div className="px-3 pt-2.5 pb-1.5">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search graph files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          <div className="py-2">
            {Object.keys(fileTree).length > 0 ? (
              renderTree(fileTree)
            ) : (
              <p className="px-4 text-text-muted text-xs italic">{searchQuery ? "No matching files found" : "No files to display"}</p>
            )}
          </div>
        </div>
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

export default memo(LeftSidebarComponent);
