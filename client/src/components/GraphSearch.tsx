"use client";

import { useState, useMemo } from "react";
import { Search, X, FileCode, Braces, Folder } from "lucide-react";

interface GraphSearchProps {
  nodes: any[]; // the FULL, raw graph.nodes list (not the locally-filtered/laid-out state)
  onSelectResult: (node: any) => void;
}

function getNodeIcon(type: string) {
  if (type === "folder") return <Folder className="w-3.5 h-3.5 text-node-file shrink-0" />;
  if (type === "function") return <Braces className="w-3.5 h-3.5 text-node-function shrink-0" />;
  return <FileCode className="w-3.5 h-3.5 text-node-component shrink-0" />;
}

export default function GraphSearch({ nodes, onSelectResult }: GraphSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter((n) => {
        const label = (n.label || "").toLowerCase();
        const path = (n.path || n.file || "").toLowerCase();
        return label.includes(q) || path.includes(q);
      })
      .slice(0, 20); // cap results so the dropdown stays usable
  }, [nodes, query]);

  return (
    <div className="absolute top-4 left-4 z-20 w-72">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search files or functions..."
          className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-lg pl-8 pr-7 py-2 text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-white/30 transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && query && (
        <div className="mt-1.5 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-text-muted italic">No matches found</div>
          ) : (
            results.map((node) => (
              <button
                key={node.id}
                onClick={() => {
                  onSelectResult(node);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
              >
                {getNodeIcon(node.type)}
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-white font-medium truncate">
                    {node.label}
                  </div>
                  {(node.path || node.file) && (
                    <div className="text-[10px] text-text-muted truncate font-mono">
                      {node.path || node.file}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}