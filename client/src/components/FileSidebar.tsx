import { getFileContent, explainNode, simulateImpactAnalysis, getRepoMemory } from "@/services/api";
import { getOpenedFile, saveOpenedFile } from "@/lib/db/openedFiles";
import React, { useEffect, useState, memo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { X, FileText, Sparkles, FolderOpen, Copy, ChevronDown, ChevronRight, Code, Loader2, AlertTriangle, ShieldAlert, Zap, BookOpen, Layers, CheckCircle2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface Props {
  node: any;
  repoId: string;
  onClose?: () => void;
}

function FileSidebarComponent({ node, repoId, onClose }: Props) {
  const [content, setContent] = useState("");
  const [commitsCount, setCommitsCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState("Details");
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const [impactResult, setImpactResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [repoMemory, setRepoMemory] = useState<any>(null);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);

  const filePath = node?.path ?? node?.file ?? "";

  useEffect(() => {
    setAiExplanation(null);
    setImpactResult(null);

    if (node?.type === 'memory') {
      setActiveTab("Memory");
      handleLoadMemory();
      return;
    } else if (activeTab === "Memory" && node?.type !== 'memory') {
      setActiveTab("Details");
    }

    async function load() {
      if (!node || !repoId || !filePath) {
        setContent("");
        return;
      }

      if (node.type === "folder") {
        setContent(`// Directory: ${filePath}\n// Select an individual file inside this directory to inspect source code and commit history.`);
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
        setCommitsCount(cachedFile.commitsCount || 0);
        return;
      }

      // 2. Call backend if not cached
      try {
        const file = await getFileContent(repoId, filePath);
        
        if (file.error) {
          console.warn("Notice when loading file:", file.error);
          setContent(`// Could not display source for ${filePath}\n// Reason: ${file.error}`);
          setCommitsCount(0);
          return;
        }

        const fileContent = file.content ?? "";
        setContent(fileContent);
        setCommitsCount(file.commitsCount || 0);

        // 3. Save to IndexedDB cache
        if (fileContent.trim() !== "") {
          await saveOpenedFile({
            repoId,
            path: filePath,
            content: fileContent,
            updatedAt: Date.now(),
            commitsCount: file.commitsCount || 0
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

  const handleSimulateImpact = async (changeType: 'MODIFY' | 'DELETE') => {
    if (!node || !repoId) return;
    setIsSimulating(true);
    setImpactResult(null);
    try {
      const res = await simulateImpactAnalysis({
        repoId,
        targetId: node.id || node.label,
        changeType
      });
      if (res.success && res.result) {
        setImpactResult(res.result);
      } else {
        setImpactResult({ error: res.error || "Failed to calculate blast radius." });
      }
    } catch (err) {
      console.error(err);
      setImpactResult({ error: "Network or server error calculating blast radius." });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleLoadMemory = async () => {
    if (!repoId) return;
    setIsLoadingMemory(true);
    try {
      const res = await getRepoMemory(repoId);
      if (res.success && res.memory) {
        setRepoMemory(res.memory);
      } else {
        setRepoMemory({ error: res.error || "No repository memory found. Analyze repo first." });
      }
    } catch (err) {
      console.error(err);
      setRepoMemory({ error: "Failed to load repository memory." });
    } finally {
      setIsLoadingMemory(false);
    }
  };

  return (
    <div className="w-full border-l border-white/10 bg-black/20 backdrop-blur-md flex flex-col h-full text-sm text-text-main shadow-2xl overflow-hidden shrink-0 relative z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 bg-transparent">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-xs sm:text-sm text-text-main">File Details</h2>
            <p className="text-[10px] sm:text-xs text-text-muted">Selected Node</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 sm:p-1.5 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-md transition-colors">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-2 sm:px-4 bg-transparent shrink-0 overflow-x-auto no-scrollbar">
        {["Details", "Source", "Blast Radius", "Memory"].map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === "Memory" && !repoMemory && !isLoadingMemory) {
                handleLoadMemory();
              }
            }}
            className={`px-2.5 sm:px-4 py-2 sm:py-3 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab 
                ? "border-white text-white font-semibold" 
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
              <span>Explanation</span>
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
          <h1 className="text-base sm:text-lg lg:text-xl font-bold mb-2 break-words text-white">{node.label}</h1>
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-md px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-mono text-text-muted backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-1.5 sm:gap-2 truncate">
              <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">{filePath || node.label}</span>
            </div>
            <button className="p-1 hover:text-text-main transition-colors shrink-0 ml-1.5">
              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {node.type === "file" && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 sm:p-3 text-center backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="text-base sm:text-lg lg:text-xl font-bold text-text-main">{locCount > 0 ? locCount : '-'}</div>
              <div className="text-[10px] sm:text-xs text-text-muted">Lines of Code (LOC)</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 sm:p-3 text-center backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="text-base sm:text-lg lg:text-xl font-bold text-node-component">{dependenciesCount}</div>
              <div className="text-[10px] sm:text-xs text-text-muted">Dependencies</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 sm:p-3 text-center backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="text-base sm:text-lg lg:text-xl font-bold text-orange-400">{dependentsCount}</div>
              <div className="text-[10px] sm:text-xs text-text-muted">Dependents</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 sm:p-3 text-center backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="text-base sm:text-lg lg:text-xl font-bold text-text-main">{commitsCount}</div>
              <div className="text-[10px] sm:text-xs text-text-muted">Commits</div>
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

        {activeTab === "Blast Radius" && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-white font-medium mb-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Blast Radius & Impact Simulation</span>
              </div>
              <p className="text-xs text-text-muted mb-4 leading-relaxed">
                Simulate how modifying or deleting <span className="text-white font-semibold">{node.label}</span> ripples across N-hop upstream callers, interface implementations, and API endpoints.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSimulateImpact('MODIFY')}
                  disabled={isSimulating}
                  className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Simulate Modify
                </button>
                <button
                  onClick={() => handleSimulateImpact('DELETE')}
                  disabled={isSimulating}
                  className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  Simulate Delete
                </button>
              </div>
            </div>

            {isSimulating && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in duration-300">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-12 h-12 rounded-full bg-red-500/10 blur-xl animate-pulse" />
                  <ShieldAlert className="w-6 h-6 text-red-400 animate-pulse relative z-10" />
                </div>
                <div className="font-mono text-xs text-red-300/90 flex items-center gap-2">
                  <span>&gt; AI simulator tracing blast radius & dependency breakage...</span>
                  <span className="w-1.5 h-3 bg-red-400 animate-pulse inline-block" />
                </div>
              </div>
            )}

            {impactResult && !isSimulating && (
              impactResult.error ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                  {impactResult.error}
                </div>
              ) : (
                <div className="space-y-4 animate-fadeIn">
                  {/* Risk Score Card */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    impactResult.riskLevel === 'CRITICAL' ? 'bg-rose-950/40 border-rose-500/50 text-rose-200' :
                    impactResult.riskLevel === 'HIGH' ? 'bg-orange-950/40 border-orange-500/50 text-orange-200' :
                    impactResult.riskLevel === 'MEDIUM' ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' :
                    'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  }`}>
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Calculated Blast Radius</div>
                      <div className="text-2xl font-black mt-0.5">{impactResult.riskScore} <span className="text-xs font-normal opacity-75">/ 100</span></div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      impactResult.riskLevel === 'CRITICAL' ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' :
                      impactResult.riskLevel === 'HIGH' ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' :
                      impactResult.riskLevel === 'MEDIUM' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' :
                      'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    }`}>
                      {impactResult.riskLevel} RISK
                    </span>
                  </div>

                  {/* Breaking Changes Summary */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      Breaking Changes Summary
                    </h4>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {impactResult.aiAnalysis?.breakingChangesSummary || "No breaking summary generated."}
                    </p>
                  </div>

                  {/* Impacted API Endpoints */}
                  {impactResult.affectedApiEndpoints?.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-white mb-2">Impacted API Routes ({impactResult.affectedApiEndpoints.length})</h4>
                      <div className="space-y-1.5">
                        {impactResult.affectedApiEndpoints.map((api: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-black/40 p-2 rounded border border-white/5 text-xs font-mono">
                            <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">{api.method}</span>
                            <span className="text-white truncate flex-1">{api.route}</span>
                            <span className="text-text-muted text-[10px]">({api.handler})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Affected Upstream Nodes */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-white mb-2">Affected Upstream Dependents ({impactResult.affectedNodes?.length || 0})</h4>
                    {impactResult.affectedNodes?.length > 0 ? (
                      <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1">
                        {impactResult.affectedNodes.map((aff: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5 text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-text-muted font-mono">{aff.hopDistance} hop</span>
                              <span className="font-semibold text-white truncate">{aff.label}</span>
                            </div>
                            <span className="text-[11px] font-mono text-text-muted truncate ml-2 max-w-[120px]">{aff.file}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted italic">No upstream dependent nodes detected.</p>
                    )}
                  </div>

                  {/* Recommended Migration Strategy */}
                  <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Recommended Migration Strategy
                    </h4>
                    <p className="text-xs text-emerald-200/80 leading-relaxed">
                      {impactResult.aiAnalysis?.recommendedMigrationStrategy || "Follow safe refactoring steps and verify with tests."}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === "Memory" && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-medium">
                <BookOpen className="w-4 h-4 text-brand" />
                <span>Repository Memory</span>
              </div>
              <button
                onClick={handleLoadMemory}
                disabled={isLoadingMemory}
                className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoadingMemory ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layers className="w-3 h-3" />}
                {isLoadingMemory ? "Loading..." : "Refresh Memory"}
              </button>
            </div>

            {isLoadingMemory && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in duration-300">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-12 h-12 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
                  <Layers className="w-6 h-6 text-blue-400 animate-pulse relative z-10" />
                </div>
                <div className="font-mono text-xs text-blue-300/90 flex items-center gap-2">
                  <span>&gt; Indexing neural memory structure across repository modules...</span>
                  <span className="w-1.5 h-3 bg-blue-400 animate-pulse inline-block" />
                </div>
              </div>
            )}

            {repoMemory && !isLoadingMemory && (
              repoMemory.error ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                  {repoMemory.error}
                </div>
              ) : (
                <div className="space-y-4 animate-fadeIn">
                  {/* Tech Stack Overview */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-white mb-2">Tech Stack Overview</h4>
                    <p className="text-xs text-text-muted leading-relaxed">{repoMemory.techStackOverview || "No overview available."}</p>
                  </div>

                  {/* System Architecture */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-white mb-2">System Architecture</h4>
                    <p className="text-xs text-text-muted leading-relaxed whitespace-pre-line">{repoMemory.systemArchitecture || "No architecture narrative."}</p>
                  </div>

                  {/* Coding Conventions */}
                  {repoMemory.codingConventions?.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-white mb-2">Coding Conventions</h4>
                      <ul className="list-disc list-inside space-y-1 text-xs text-text-muted">
                        {repoMemory.codingConventions.map((conv: string, idx: number) => (
                          <li key={idx} className="leading-relaxed">{conv}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* API Documentation Catalog */}
                  {repoMemory.apiDocumentation?.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-white mb-2">API Route Catalog ({repoMemory.apiDocumentation.length})</h4>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {repoMemory.apiDocumentation.map((api: any, idx: number) => (
                          <div key={idx} className="bg-black/40 p-2.5 rounded border border-white/5 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">{api.method}</span>
                                <span className="font-mono text-white font-semibold">{api.route}</span>
                              </div>
                              <span className="text-text-muted text-[10px] font-mono">{api.handler}</span>
                            </div>
                            <p className="text-text-muted text-[11px] mt-1">{api.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(FileSidebarComponent);
