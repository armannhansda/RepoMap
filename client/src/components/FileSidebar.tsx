import { getFileContent, explainNode } from "@/services/api";
import { getOpenedFile, saveOpenedFile } from "@/lib/db/openedFiles";
import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { X, FileText, Sparkles, FolderOpen, Copy, ChevronDown, ChevronRight, Code, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface Props {
  node: any;
  repoId: string;
  onClose?: () => void;
}

export default function FileSidebar({ node, repoId, onClose }: Props) {
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("Details");
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const filePath = node?.path ?? node?.file ?? "";

  useEffect(() => {
    setAiExplanation(null);
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

  const handleExplainNode = async () => {
    if (!node) return;
    setIsExplaining(true);
    try {
      const nodeData = {
        label: node.label,
        type: node.type,
        path: filePath,
        functionType: node.functionType,
        imports: node.imports,
        calls: node.calls,
        calledBy: node.calledBy,
        sourceCode: content && node.type === 'function' ? getFunctionSource(content, node.line || 1, node.endLine) : content
      };
      const response = await explainNode(nodeData);
      setAiExplanation(response.explanation || response.error);
    } catch (err) {
      console.error(err);
      setAiExplanation("Failed to generate explanation. Check if GEMINI_API_KEY or GROQ_API_KEY is configured.");
    } finally {
      setIsExplaining(false);
    }
  };

  const dependenciesCount = node.imports?.length || 0;
  const dependentsCount = node.importedBy?.length || 0;
  const locCount = content ? content.split("\n").length : 0;
  const commitsCount = Math.floor(Math.random() * 50) + 1; // Mock data

  return (
    <div className="w-full border-l border-white/10 bg-black/20 backdrop-blur-md flex flex-col h-full text-sm text-text-main shadow-2xl overflow-hidden shrink-0 relative z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
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
      <div className="flex border-b border-white/10 px-4 bg-transparent shrink-0">
        {["Details", "Source", "Graph"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 border-b-2 font-medium transition-colors ${
              activeTab === tab 
                ? "border-white text-white" 
                : "border-transparent text-text-muted hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-transparent">
        {activeTab === "Details" && (
          <>
        {/* AI Summary */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white font-medium">
              <Sparkles className="w-4 h-4 text-brand" />
              <span>AI Explanation</span>
            </div>
            {!aiExplanation && (
              <button 
                onClick={handleExplainNode} 
                disabled={isExplaining}
                className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded text-xs font-medium transition-all duration-300 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isExplaining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {isExplaining ? "Generating..." : "Explain Node"}
              </button>
            )}
          </div>
          
          {aiExplanation ? (
            <div className="text-text-muted leading-relaxed text-xs prose prose-invert prose-sm max-w-none prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
              <ReactMarkdown>{aiExplanation}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-text-muted text-xs italic">
              Click the button above to generate a high-level summary of what this node does and how it fits into the codebase.
            </p>
          )}
        </div>

        {/* Title & Path */}
        <div>
          <h1 className="text-2xl font-bold mb-3">{node.label}</h1>
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs font-mono text-text-muted backdrop-blur-sm hover:bg-white/10 transition-colors">
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
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="text-xl font-bold text-text-main">{locCount > 0 ? locCount : '-'}</div>
              <div className="text-xs text-text-muted">Lines of Code (LOC)</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="text-xl font-bold text-node-component">{dependenciesCount}</div>
              <div className="text-xs text-text-muted">Dependencies</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="text-xl font-bold text-orange-400">{dependentsCount}</div>
              <div className="text-xs text-text-muted">Dependents</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
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
                <div className="rounded-md overflow-hidden text-[11px] max-h-[300px] overflow-y-auto border border-white/10 bg-black/40">
                  <SyntaxHighlighter
                    language="typescript"
                    style={oneDark}
                    customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
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
                  <div key={fn.name} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm transition-all duration-300">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/10 transition-all duration-200"
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
                      <div className="p-4 pt-0 border-t border-white/10 bg-transparent">
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
                          <div className="rounded-md overflow-hidden text-[11px] max-h-[300px] overflow-y-auto border border-white/10 bg-black/40">
                            <SyntaxHighlighter
                              language="typescript"
                              style={oneDark}
                              customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
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
          <div className="rounded-md overflow-hidden text-[11px] border border-white/10 bg-black/40 backdrop-blur-sm">
            {content ? (
              <SyntaxHighlighter
                language={filePath.endsWith('.css') ? 'css' : filePath.endsWith('.json') ? 'json' : filePath.endsWith('.html') ? 'html' : 'typescript'}
                style={oneDark}
                customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
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
