'use client'

import { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import RepoGraph from "@/components/RepoGraph";
import { analyzeRepo, explainRepo, generateArchitectureDiagram, getRepoProgressApi } from "@/services/api";
import { generateDrawioXml } from "@/utils/exportDrawio";
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import FileSidebar from "@/components/FileSidebar";
import LandingPage from "@/components/LandingPage";
import { Sparkles, Download, Loader2, BookOpen, Bot, ListTodo, Activity, ShieldCheck, GitBranch, Zap, CheckCircle2, File as FileIcon } from "lucide-react";
import { toast } from "sonner";

const RepoExplanationModal = dynamic(() => import("@/components/RepoExplanationModal"), { ssr: false });
const AiAgentsModal = dynamic(() => import("@/components/AiAgentsModal"), { ssr: false });
const HealthDashboardModal = dynamic(() => import("@/components/HealthDashboardModal"), { ssr: false });
const MultiAgentOrchestratorModal = dynamic(() => import("@/components/MultiAgentOrchestratorModal"), { ssr: false });

import { getRepository, saveRepository } from "@/lib/db/repositories";
import { getGraph, saveGraph } from "@/lib/db/graph";

function AnalysisProgressOverlay({ repoUrl }: { repoUrl?: string }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [totalSteps, setTotalSteps] = useState(5);
  const [stepDescription, setStepDescription] = useState("Initializing workspace...");
  const [nextStepDescription, setNextStepDescription] = useState<string | null>("Cloning repository...");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [estimatedDurationMs, setEstimatedDurationMs] = useState(32000);
  const [status, setStatus] = useState<"queued" | "in_progress" | "completed" | "failed">("in_progress");

  // Poll backend progress every 600ms
  useEffect(() => {
    if (!repoUrl) return;

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await getRepoProgressApi(repoUrl);
        if (res.success && res.progress && isMounted) {
          const prog = res.progress;
          setElapsedMs(prog.elapsedTimeMs || 0);
          setTotalSteps(prog.totalSteps || 5);
          setEstimatedDurationMs(prog.estimatedTotalDurationMs || 32000);
          setStatus(prog.status);

          // If backend moved to a new step index, trigger our buttery smooth upward fade-out transition!
          if (prog.stepIdx !== stepIdx && prog.stepDescription !== stepDescription) {
            setIsTransitioning(true);
            setTimeout(() => {
              if (isMounted) {
                setStepIdx(prog.stepIdx);
                setStepDescription(prog.stepDescription);
                setNextStepDescription(prog.nextStepDescription);
                setIsTransitioning(false);
              }
            }, 500);
          } else if (!isTransitioning) {
            setStepIdx(prog.stepIdx);
            setStepDescription(prog.stepDescription);
            setNextStepDescription(prog.nextStepDescription);
          }
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, 600);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [repoUrl, stepIdx, stepDescription, isTransitioning]);

  // Smooth local timer ticking every 100ms between backend polls for real-time progress feel
  useEffect(() => {
    const tickInterval = setInterval(() => {
      if (status !== "completed") {
        setElapsedMs((prev) => prev + 100);
      }
    }, 100);
    return () => clearInterval(tickInterval);
  }, [status]);

  const progressPercent = Math.min(96, Math.max(5, Math.floor((elapsedMs / estimatedDurationMs) * 100)));

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl animate-in fade-in duration-300 select-none px-4">
      {/* Clean centered container - ZERO CARDS OR BOXES */}
      <div className="flex flex-col items-center max-w-xl w-full text-center space-y-8">
        {/* Minimal Header */}
        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Analyzing Repository
        </h3>

        {/* Vertical Stream: Currently Processing & Upcoming (Smooth Upward Fade-Out) */}
        <div className="flex flex-col items-center justify-center min-h-[90px] w-full px-2 space-y-4 relative">
          {/* Currently Processing Step (fades upward smoothly on completion) */}
          <div
            key={`processing-${stepIdx}`}
            className={`flex items-center justify-center gap-3 transition-all duration-500 transform ${isTransitioning
                ? "opacity-0 -translate-y-6 scale-95 blur-[1px]"
                : "opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-bottom-3 duration-500"
              }`}
          >
            {isTransitioning || status === "completed" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-in zoom-in duration-200" />
            ) : (
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
            )}
            <span className={`font-mono text-xs sm:text-sm font-semibold tracking-wide truncate max-w-lg transition-colors duration-300 ${isTransitioning || status === "completed" ? "text-emerald-400/90 line-through" : "text-white"
              }`}>
              {stepDescription}
            </span>
            {!isTransitioning && status !== "completed" && (
              <span className="w-1.5 h-3 bg-emerald-400 animate-pulse inline-block flex-shrink-0" />
            )}
          </div>

          {/* Upcoming Step */}
          {nextStepDescription && (
            <div
              key={`upcoming-${stepIdx + 1}`}
              className={`flex items-center justify-center gap-2.5 font-mono text-xs sm:text-[13px] tracking-wide transition-all duration-500 transform ${isTransitioning
                  ? "opacity-100 -translate-y-6 text-white font-medium scale-100"
                  : "opacity-40 translate-y-0 text-gray-400 scale-95 animate-in fade-in slide-in-from-bottom-3 duration-500"
                }`}
            >
              <div className="w-3.5 h-3.5 rounded-full border border-white/25 flex-shrink-0" />
              <span className="truncate max-w-md">{nextStepDescription}</span>
            </div>
          )}
        </div>

        {/* Minimal status subtext & Live Time Duration Progress */}
        <div className="flex flex-col items-center w-full max-w-md space-y-2.5 pt-1">
          <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Step {stepIdx + 1} of {totalSteps} • Autonomous AST extraction in progress</span>
          </div>

          <div className="w-full space-y-1.5 px-2">
            <div className="flex items-center justify-between w-full text-[11px] font-mono text-gray-400 px-0.5">
              <span>Elapsed: {(elapsedMs / 1000).toFixed(1)}s</span>
              <span className="text-emerald-400/90 font-medium">
                {status === "completed" ? "100%" : `${progressPercent}%`}
              </span>
              <span>Estimated: ~{(estimatedDurationMs / 1000).toFixed(0)}s</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${status === "completed" ? 100 : progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [graph, setGraph] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [repoId, setRepoId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();

  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
  const [repoExplanation, setRepoExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalTab, setAiModalTab] = useState<'qa' | 'planner'>('qa');

  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [healthModalTab, setHealthModalTab] = useState<'health' | 'review' | 'git'>('health');

  const [orchestratorModalOpen, setOrchestratorModalOpen] = useState(false);

  const handleOpenAiTab = useCallback((tab: 'qa' | 'planner') => {
    if (aiModalOpen && aiModalTab === tab) {
      setAiModalOpen(false);
      return;
    }
    setIsExplainModalOpen(false);
    setOrchestratorModalOpen(false);
    setHealthModalOpen(false);
    setAiModalTab(tab);
    setAiModalOpen(true);
  }, [aiModalOpen, aiModalTab]);

  const handleOpenOrchestrator = useCallback(() => {
    if (orchestratorModalOpen) {
      setOrchestratorModalOpen(false);
      return;
    }
    setIsExplainModalOpen(false);
    setAiModalOpen(false);
    setHealthModalOpen(false);
    setOrchestratorModalOpen(true);
  }, [orchestratorModalOpen]);

  const handleOpenHealthTab = useCallback((tab?: 'health' | 'review' | 'git') => {
    const targetTab = tab || 'health';
    if (healthModalOpen && healthModalTab === targetTab) {
      setHealthModalOpen(false);
      return;
    }
    setIsExplainModalOpen(false);
    setAiModalOpen(false);
    setOrchestratorModalOpen(false);
    if (tab) setHealthModalTab(tab);
    setHealthModalOpen(true);
  }, [healthModalOpen, healthModalTab]);



  const handleNodeSelect = useCallback((node: any) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleSelectNodeId = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleExplainRepo = useCallback(async () => {
    if (isExplainModalOpen) {
      setIsExplainModalOpen(false);
      return;
    }
    setAiModalOpen(false);
    setOrchestratorModalOpen(false);
    setHealthModalOpen(false);
    setIsExplainModalOpen(true);
    if (repoExplanation) return;
    setIsExplaining(true);
    setExplainError(null);
    try {
      const files = graph?.nodes?.filter((n: any) => n.type === 'file').map((n: any) => ({ path: n.path || n.label })) || [];
      const response = await explainRepo(repoUrl.split("/").pop()?.replace(".git", "") || "Repository", files);
      if (response.error) {
        setExplainError(response.error);
      } else {
        setRepoExplanation(response.explanation);
      }
    } catch (err) {
      setExplainError("Failed to generate repository explanation. Please check your API key.");
    } finally {
      setIsExplaining(false);
    }
  }, [isExplainModalOpen, repoExplanation, graph, repoUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      if (e.key === 'Escape') {
        if (isExplainModalOpen || aiModalOpen || healthModalOpen || orchestratorModalOpen) {
          setIsExplainModalOpen(false);
          setAiModalOpen(false);
          setHealthModalOpen(false);
          setOrchestratorModalOpen(false);
        } else if (selectedNodeId) {
          setSelectedNodeId(undefined);
        }
      }

      if (!isTyping) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('focus-url-input'));
        }

        if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
          if (e.key === '1') {
            e.preventDefault();
            handleExplainRepo();
          } else if (e.key === '2') {
            e.preventDefault();
            handleOpenAiTab('qa');
          } else if (e.key === '3') {
            e.preventDefault();
            handleOpenOrchestrator();
          } else if (e.key === '4') {
            e.preventDefault();
            handleOpenHealthTab('health');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExplainModalOpen, aiModalOpen, healthModalOpen, orchestratorModalOpen, selectedNodeId, handleExplainRepo, handleOpenAiTab, handleOpenOrchestrator, handleOpenHealthTab]);

  const handleGenerateDiagram = useCallback(async () => {
    setIsGeneratingDiagram(true);
    setExplainError(null);
    try {
      const files = graph?.nodes?.filter((n: any) => n.type === 'file').map((n: any) => ({ path: n.path || n.label })) || [];
      const response = await generateArchitectureDiagram(repoUrl.split("/").pop()?.replace(".git", "") || "Repository", files);
      if (response.error) {
        setExplainError(response.error);
        setIsExplainModalOpen(true);
      } else if (response.nodes && response.edges) {
        generateDrawioXml(response.nodes, response.edges, `${repoUrl.split("/").pop()?.replace(".git", "")}-architecture.drawio`, response.groups || []);

        if (response.explanation) {
          setRepoExplanation(response.explanation);
          setExplainError(null);
          setIsExplainModalOpen(true);
        }
      } else {
        setExplainError("AI did not return a valid diagram structure.");
        setIsExplainModalOpen(true);
      }
    } catch (err: any) {
      console.error("Diagram error:", err);
      setExplainError(`Failed to generate architecture diagram: ${err.message || err}. Please check the console for details.`);
      setIsExplainModalOpen(true);
    } finally {
      setIsGeneratingDiagram(false);
    }
  }, [graph, repoUrl]);

  const handleAnalyze = useCallback(async () => {
    if (!repoUrl) return;
    try {
      setLoading(true);

      // 1. Check IndexedDB
      const existingRepo = await getRepository(repoUrl);
      if (existingRepo) {
        const existingGraph = await getGraph(repoUrl);
        if (existingGraph) {
          // Render instantly from cache
          setGraph({ nodes: existingGraph.nodes, edges: existingGraph.edges });
          setRepoId(existingRepo.id);
          setSelectedNodeId(existingRepo.lastOpenedFile);
          setLoading(false);
          return;
        }
      }

      // 2. Call backend if not cached
      const result = await analyzeRepo(repoUrl);

      // 3. Save new data to IndexedDB
      const newRepo = {
        id: repoUrl,
        repoUrl: repoUrl,
        repoName: repoUrl.split("/").pop()?.replace(".git", "") || repoUrl,
        branch: "main",
        commitHash: "unknown",
        analyzedAt: Date.now(),
        fileTree: [],
      };

      await saveRepository(newRepo);
      await saveGraph({
        repoId: repoUrl,
        nodes: result.graph.nodes,
        edges: result.graph.edges
      });

      // 4. Render UI
      setGraph(result.graph);
      setRepoId(result.repoId); // which is now also repoUrl
      setSelectedNodeId(undefined);
      toast.success("Repository loaded successfully!");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Could not find or analyze this repository.");
    } finally {
      setLoading(false);
    }
  }, [repoUrl]);

  const selectedNode = selectedNodeId === "__MEMORY__"
    ? { id: "__MEMORY__", label: "Repository Memory & Architecture", type: "memory" }
    : graph?.nodes?.find((n: any) => n.id === selectedNodeId);

  const [leftWidth, setLeftWidth] = useState(240);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [rightWidth, setRightWidth] = useState(360);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth <= 1280) {
          setLeftWidth(Math.min(220, Math.floor(window.innerWidth * 0.22)));
          setRightWidth(Math.min(340, Math.floor(window.innerWidth * 0.32)));
        } else if (window.innerWidth <= 1440) {
          setLeftWidth(240);
          setRightWidth(360);
        } else {
          setLeftWidth(256);
          setRightWidth(400);
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    const maxAllowed = typeof window !== 'undefined' ? Math.min(500, Math.floor(window.innerWidth * 0.4)) : 500;

    const onMouseMove = (e: MouseEvent) => {
      setLeftWidth(Math.max(160, Math.min(maxAllowed, startWidth + (e.clientX - startX))));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const startResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightWidth;
    const maxAllowed = typeof window !== 'undefined' ? Math.min(650, Math.floor(window.innerWidth * 0.45)) : 650;

    const onMouseMove = (e: MouseEvent) => {
      setRightWidth(Math.max(220, Math.min(maxAllowed, startWidth - (e.clientX - startX))));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-transparent text-white font-sans">
      {graph && (
        <Header
          repoUrl={repoUrl}
          setRepoUrl={setRepoUrl}
          onAnalyze={handleAnalyze}
          onNewAnalysis={() => {
            setGraph(null);
            setRepoUrl("");
            setSelectedNodeId(undefined);
          }}
          loading={loading}
          onExplainRepo={handleExplainRepo}
          onOpenMemory={() => {
            if (selectedNodeId === "__MEMORY__") {
              setSelectedNodeId(undefined);
              return;
            }
            setIsExplainModalOpen(false);
            setAiModalOpen(false);
            setOrchestratorModalOpen(false);
            setHealthModalOpen(false);
            setSelectedNodeId("__MEMORY__");
          }}
          onOpenAiTab={handleOpenAiTab}
          onOpenOrchestrator={handleOpenOrchestrator}
          onOpenHealthTab={handleOpenHealthTab}
          onExportDiagram={handleGenerateDiagram}
          isGeneratingDiagram={isGeneratingDiagram}
          activeFeatureTab={
            isExplainModalOpen
              ? 'explain'
              : selectedNodeId === '__MEMORY__'
                ? 'memory'
                : aiModalOpen
                  ? aiModalTab
                  : orchestratorModalOpen
                    ? 'engine'
                    : healthModalOpen
                      ? healthModalTab === 'health'
                        ? 'health'
                        : 'hotspots'
                      : null
          }
        />
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {graph && !isLeftSidebarCollapsed && (
          <div style={{ width: leftWidth }} className="flex-shrink-0 relative max-w-[80vw] sm:max-w-[320px] lg:max-w-[420px] transition-all duration-300">
            <LeftSidebar
              nodes={graph.nodes}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              repoName={repoUrl.split("/").pop()?.replace(".git", "") || "Project Explorer"}
              onToggleCollapse={() => setIsLeftSidebarCollapsed(true)}
            />
            <div
              className="absolute top-0 -right-1 w-2 h-full cursor-col-resize hover:bg-white/30 z-50 transition-colors"
              onMouseDown={startResizeLeft}
            />
          </div>
        )}

        {/* Top-Left Minimized Explorer Button with File Icon */}
        {graph && isLeftSidebarCollapsed && (
          <button
            onClick={() => setIsLeftSidebarCollapsed(false)}
            title="Open Project Explorer"
            className="absolute top-3 left-3 z-50 flex items-center gap-2 px-3 py-2 bg-black/85 hover:bg-black text-white/90 hover:text-white rounded-xl border border-white/15 backdrop-blur-md shadow-2xl transition-all duration-200 group animate-in fade-in zoom-in-95"
          >
            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <FileIcon className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold pr-1">Files</span>
          </button>
        )}

        <main className="flex-1 relative bg-transparent overflow-hidden">


          {loading && <AnalysisProgressOverlay repoUrl={repoUrl} />}

          {!graph ? (
            <LandingPage
              repoUrl={repoUrl}
              setRepoUrl={setRepoUrl}
              onAnalyze={handleAnalyze}
              loading={loading}
            />
          ) : (
            <>
              <RepoGraph
                graph={graph}
                repoId={repoId}
                selectedNodeId={selectedNodeId}
                onNodeSelect={handleNodeSelect}
              />

              {/* Feature Panels docked inside graph canvas under navbar */}
              <RepoExplanationModal
                isOpen={isExplainModalOpen}
                onClose={() => setIsExplainModalOpen(false)}
                repoName={repoUrl.split("/").pop()?.replace(".git", "") || "Repository"}
                explanation={repoExplanation}
                isLoading={isExplaining}
                error={explainError}
              />

              <AiAgentsModal
                isOpen={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                repoId={repoId || repoUrl}
                graph={graph}
                initialTab={aiModalTab}
                onSelectNode={handleSelectNodeId}
              />

              <HealthDashboardModal
                isOpen={healthModalOpen}
                onClose={() => setHealthModalOpen(false)}
                repoId={repoId || repoUrl}
                graph={graph}
                initialTab={healthModalTab}
                onSelectNode={handleSelectNodeId}
              />

              <MultiAgentOrchestratorModal
                isOpen={orchestratorModalOpen}
                onClose={() => setOrchestratorModalOpen(false)}
                repoId={repoId || repoUrl}
                graph={graph}
                onSelectNode={handleSelectNodeId}
              />
            </>
          )}
        </main>

        {graph && selectedNode && (
          <div style={{ width: rightWidth }} className="flex-shrink-0 relative max-w-[85vw] sm:max-w-[450px] lg:max-w-[600px]">
            <div
              className="absolute top-0 -left-1 w-2 h-full cursor-col-resize hover:bg-white/30 z-50 transition-colors"
              onMouseDown={startResizeRight}
            />
            <FileSidebar
              node={selectedNode}
              repoId={repoId}
              onClose={() => setSelectedNodeId(undefined)}
            />
          </div>
        )}
      </div>
    </div>
  );
}