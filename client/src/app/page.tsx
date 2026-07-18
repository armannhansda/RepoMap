'use client'

import { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import RepoGraph from "@/components/RepoGraph";
import { analyzeRepo, explainRepo, generateArchitectureDiagram } from "@/services/api";
import { generateDrawioXml } from "@/utils/exportDrawio";
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import FileSidebar from "@/components/FileSidebar";
import LandingPage from "@/components/LandingPage";
import { Sparkles, Download, Loader2, BookOpen, Bot, ListTodo, Activity, ShieldCheck, GitBranch, Zap } from "lucide-react";

const RepoExplanationModal = dynamic(() => import("@/components/RepoExplanationModal"), { ssr: false });
const AiAgentsModal = dynamic(() => import("@/components/AiAgentsModal"), { ssr: false });
const HealthDashboardModal = dynamic(() => import("@/components/HealthDashboardModal"), { ssr: false });
const MultiAgentOrchestratorModal = dynamic(() => import("@/components/MultiAgentOrchestratorModal"), { ssr: false });

import { getRepository, saveRepository } from "@/lib/db/repositories";
import { getGraph, saveGraph } from "@/lib/db/graph";

export default function Home(){
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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [repoUrl]);

  const selectedNode = selectedNodeId === "__MEMORY__" 
    ? { id: "__MEMORY__", label: "Repository Memory & Architecture", type: "memory" } 
    : graph?.nodes?.find((n: any) => n.id === selectedNodeId);

  const [leftWidth, setLeftWidth] = useState(240);
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
        {graph && (
          <div style={{ width: leftWidth }} className="flex-shrink-0 relative max-w-[80vw] sm:max-w-[320px] lg:max-w-[420px]">
            <LeftSidebar 
              nodes={graph.nodes} 
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              repoName={repoUrl.split("/").pop()?.replace(".git", "") || "Project Explorer"}
            />
            <div 
              className="absolute top-0 -right-1 w-2 h-full cursor-col-resize hover:bg-white/30 z-50 transition-colors"
              onMouseDown={startResizeLeft}
            />
          </div>
        )}
        
        <main className="flex-1 relative bg-transparent overflow-hidden">


          {loading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md p-6 animate-in fade-in duration-300">
              <div className="flex flex-col items-center gap-6 max-w-4xl w-full">
                <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-4 py-2 rounded-full shadow-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-white font-semibold text-xs sm:text-sm tracking-wide">Analyzing Repository Structure & Generating Interactive AST Map...</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 w-full">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="animate-pulse bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-3 shadow-xl backdrop-blur-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 shrink-0" />
                        <div className="flex-1 flex flex-col gap-1.5">
                          <div className="h-4 bg-white/15 rounded-md w-3/4" />
                          <div className="h-3 bg-white/10 rounded-md w-1/2" />
                        </div>
                      </div>
                      <div className="h-10 bg-white/[0.04] rounded-lg border border-white/5 p-2 mt-1 flex flex-col gap-1.5">
                        <div className="h-2.5 bg-white/10 rounded w-full" />
                        <div className="h-2.5 bg-white/10 rounded w-4/5" />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <div className="h-5 w-14 bg-white/10 rounded-full" />
                        <div className="h-5 w-16 bg-white/10 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
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