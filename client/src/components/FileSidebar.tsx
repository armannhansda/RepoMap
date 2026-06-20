import { getFileContent } from "@/services/api";
import { getOpenedFile, saveOpenedFile } from "@/lib/db/openedFiles";
import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { X, FileText, Sparkles, FolderOpen, Copy, ChevronDown, ChevronRight, Code } from "lucide-react";

interface Props {
  node: any;
  repoId: string;
  onClose?: () => void;
}

export default function FileSidebar({ node, repoId, onClose }: Props) {
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("Details");
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());

  const filePath = node?.path ?? node?.file ?? "";

  useEffect(() => {
    async function load() {
      if (!node || !repoId || !filePath) {
        setContent("");
        return;
      }

      if (filePath === "external") {
        setContent("// This is an external dependency.\n// Source code is not available in this repository.");
        return;
      }
      
      // 1. Check IndexedDB cache
      const cachedFile = await getOpenedFile(repoId, filePath);
      if (cachedFile && cachedFile.content && cachedFile.content.trim() !== "") {
        setContent(cachedFile.content);
        return;
      }

      // 2. Call backend if not cached
      try {
        const file = await getFileContent(repoId, filePath);
        
        if (file.error) {
          console.error("Backend error:", file.error);
          setContent("");
          return;
        }

        const fileContent = file.content ?? "";
        setContent(fileContent);

        // 3. Save to IndexedDB cache
        if (fileContent.trim() !== "") {
          await saveOpenedFile({
            repoId,
            path: filePath,
            content: fileContent,
            updatedAt: Date.now()
          });
        }
      } catch (e) {
        console.error("Failed to fetch file:", e);
        setContent("");
      }
    }
    load();
  }, [node, repoId, filePath]);

  if (!node) return null;

  function getFunctionSource(content: string, functionLine: number, functionEndLine?: number) {
    const lines = content.split("\n");
    const start = Math.max(functionLine - 1, 0);
    if (functionEndLine) {
      return lines.slice(start, functionEndLine).join("\n");
    }
    return lines.slice(start, start + 10).join("\n") + "\n// ...";
  }

  const toggleFunction = (name: string) => {
    setExpandedFunctions(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const dependenciesCount = node.imports?.length || 0;
  const dependentsCount = node.importedBy?.length || 0;
  const locCount = content ? content.split("\n").length : 0;
  const commitsCount = Math.floor(Math.random() * 50) + 1; // Mock data

  return (
    <div className="w-[400px] border-l border-border-subtle bg-bg-surface flex flex-col h-full text-sm text-text-main shadow-2xl overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-base">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-surface-active border border-border-subtle flex items-center justify-center">
            <FileText className="w-4 h-4 text-brand" />
          </div>
          <div>
            <h2 className="font-semibold text-text-main">File Details</h2>
            <p className="text-xs text-text-muted">Selected Node</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle px-4 bg-bg-base shrink-0">
        {["Details", "Source", "Graph"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 border-b-2 font-medium transition-colors ${
              activeTab === tab 
                ? "border-brand text-text-main" 
                : "border-transparent text-text-muted hover:text-text-main"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-surface">
        {activeTab === "Details" && (
          <>
        {/* AI Summary */}
        {/* <div className="bg-bg-base border border-border-subtle rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2 text-brand font-medium">
            <Sparkles className="w-4 h-4" />
            <span>AI Summary</span>
          </div>
          <p className="text-text-muted leading-relaxed text-xs">
            This is the main component file. It relies on standard library tools to orchestrate application flow. High centrality suggests it is a critical node for the system.
          </p>
        </div> */}

        {/* Title & Path */}
        <div>
          <h1 className="text-2xl font-bold mb-3">{node.label}</h1>
          <div className="flex items-center justify-between bg-bg-base border border-border-subtle rounded-md px-3 py-2 text-xs font-mono text-text-muted">
            <div className="flex items-center gap-2 truncate">
              <FolderOpen className="w-4 h-4" />
              <span className="truncate">{filePath || node.label}</span>
            </div>
            <button className="p-1 hover:text-text-main transition-colors shrink-0 ml-2">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {node.type === "file" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-base border border-border-subtle rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-text-main">{locCount > 0 ? locCount : '-'}</div>
              <div className="text-xs text-text-muted">Lines of Code (LOC)</div>
            </div>
            <div className="bg-bg-base border border-border-subtle rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-node-component">{dependenciesCount}</div>
              <div className="text-xs text-text-muted">Dependencies</div>
            </div>
            <div className="bg-bg-base border border-border-subtle rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-orange-400">{dependentsCount}</div>
              <div className="text-xs text-text-muted">Dependents</div>
            </div>
            <div className="bg-bg-base border border-border-subtle rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-text-main">{commitsCount}</div>
              <div className="text-xs text-text-muted">Commits</div>
            </div>
          </div>
        )}

        {/* Function Node Details */}
        {node.type === "function" && (
          <div>
            {node.calls?.length > 0 && (
              <div className="mb-4 mt-3">
                <h4 className="text-[10px] uppercase font-bold text-text-muted tracking-wider mb-2">Calls</h4>
                <ul className="space-y-1">
                  {node.calls.map((c: string, i: number) => (
                    <li key={i} className="text-xs font-mono text-text-main flex items-center gap-2">
                      <span className="text-text-muted">→</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {node.calledBy?.length > 0 && (
              <div className="mb-4 mt-3">
                <h4 className="text-[10px] uppercase font-bold text-text-muted tracking-wider mb-2">Called By</h4>
                <ul className="space-y-1">
                  {node.calledBy.map((c: string, i: number) => (
                    <li key={i} className="text-xs font-mono text-text-main flex items-center gap-2">
                      <span className="text-text-muted">←</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {node.line !== undefined && (
              <div>
                <h4 className="text-[10px] uppercase font-bold text-text-muted tracking-wider mb-2 mt-3">Implementation Preview</h4>
                <div className="rounded-md overflow-hidden text-[11px] max-h-[300px] overflow-y-auto border border-border-subtle">
                  <SyntaxHighlighter
                    language="typescript"
                    style={oneDark}
                    customStyle={{ margin: 0, padding: '1rem', background: '#0a0a0a' }}
                  >
                    {getFunctionSource(content, node.line, node.endLine)}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Functions Accordion */}
        {node.functions && node.functions.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-text-main">Functions ({node.functions.length})</h3>
            </div>
            <div className="space-y-2">
              {node.functions.map((fn: any) => {
                const isExpanded = expandedFunctions.has(fn.name);
                const source = getFunctionSource(content, fn.line, fn.endLine);
                
                return (
                  <div key={fn.name} className="bg-bg-base border border-border-subtle rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-surface-hover transition-colors"
                      onClick={() => toggleFunction(fn.name)}
                    >
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <Code className="w-4 h-4 text-node-function" />
                        <span className="font-semibold text-text-main">{fn.name}</span>
                        {fn.calls?.length > 0 && (
                          <span className="text-[10px] bg-node-function/20 text-node-function px-1.5 py-0.5 rounded ml-2">
                            Calls ({fn.calls.length})
                          </span>
                        )}
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-border-subtle bg-bg-base/50">
                        {fn.calls?.length > 0 && (
                          <div className="mb-4 mt-3">
                            <h4 className="text-[10px] uppercase font-bold text-text-muted tracking-wider mb-2">Calls</h4>
                            <ul className="space-y-1">
                              {fn.calls.map((c: string, i: number) => (
                                <li key={i} className="text-xs font-mono text-text-main flex items-center gap-2">
                                  <span className="text-text-muted">→</span> {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {fn.calledBy?.length > 0 && (
                          <div className="mb-4 mt-3">
                            <h4 className="text-[10px] uppercase font-bold text-text-muted tracking-wider mb-2">Called By</h4>
                            <ul className="space-y-1">
                              {fn.calledBy.map((c: string, i: number) => (
                                <li key={i} className="text-xs font-mono text-text-main flex items-center gap-2">
                                  <span className="text-text-muted">←</span> {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="text-[10px] uppercase font-bold text-text-muted tracking-wider mb-2 mt-3">Implementation Preview</h4>
                          <div className="rounded-md overflow-hidden text-[11px] max-h-[300px] overflow-y-auto border border-border-subtle">
                            <SyntaxHighlighter
                              language="typescript"
                              style={oneDark}
                              customStyle={{ margin: 0, padding: '1rem', background: '#0a0a0a' }}
                            >
                              {source}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
          </>
        )}

        {activeTab === "Source" && (
          <div className="rounded-md overflow-hidden text-[11px] border border-border-subtle bg-bg-base">
            {content ? (
              <SyntaxHighlighter
                language={filePath.endsWith('.css') ? 'css' : filePath.endsWith('.json') ? 'json' : filePath.endsWith('.html') ? 'html' : 'typescript'}
                style={oneDark}
                customStyle={{ margin: 0, padding: '1rem', background: '#0a0a0a' }}
                showLineNumbers={true}
              >
                {content}
              </SyntaxHighlighter>
            ) : (
              <div className="p-4 text-text-muted text-center italic">No source available.</div>
            )}
          </div>
        )}

        {activeTab === "Graph" && (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted">
            <Sparkles className="w-8 h-8 mb-2 opacity-50" />
            <p>Graph view coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}
