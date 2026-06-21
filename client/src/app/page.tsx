'use client'

import { useState } from "react";
import RepoGraph from "@/components/RepoGraph";
import { analyzeRepo } from "@/services/api";
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import FileSidebar from "@/components/FileSidebar";

import { getRepository, saveRepository } from "@/lib/db/repositories";
import { getGraph, saveGraph } from "@/lib/db/graph";

export default function Home(){
  const [repoUrl, setRepoUrl] = useState("");
  const [graph, setGraph] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [repoId, setRepoId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();

  async function handleAnalyze() {
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
  }

  const selectedNode = graph?.nodes?.find((n: any) => n.id === selectedNodeId);

  const [leftWidth, setLeftWidth] = useState(256);
  const [rightWidth, setRightWidth] = useState(400);

  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    
    const onMouseMove = (e: MouseEvent) => {
      setLeftWidth(Math.max(150, Math.min(600, startWidth + (e.clientX - startX))));
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
    
    const onMouseMove = (e: MouseEvent) => {
      setRightWidth(Math.max(200, Math.min(800, startWidth - (e.clientX - startX))));
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
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        {graph && (
          <div style={{ width: leftWidth }} className="flex-shrink-0 relative">
            <LeftSidebar 
              nodes={graph.nodes} 
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              repoName={repoUrl.split("/").pop()?.replace(".git", "") || "Project Explorer"}
            />
            <div 
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-white/30 z-10 transition-colors"
              onMouseDown={startResizeLeft}
            />
          </div>
        )}
        
        <main className="flex-1 relative bg-transparent overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md text-white">
              <div className="w-12 h-12 mb-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xl font-medium text-white">Analyzing Repository...</p>
              <p className="text-sm mt-2 text-text-muted">This may take a few moments depending on the repository size.</p>
            </div>
          )}
          
          {!graph ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
              <div className="w-16 h-16 mb-6 opacity-20 border-4 border-dashed border-text-muted rounded-full animate-[spin_3s_linear_infinite]"></div>
              <p className="text-lg font-medium">Enter a GitHub repository URL to begin</p>
              <p className="text-sm mt-2 max-w-sm text-center opacity-70">
                RepoMap will parse the codebase, map out dependencies, and extract function call graphs.
              </p>
            </div>
          ) : (
            <RepoGraph 
              graph={graph} 
              repoId={repoId}
              selectedNodeId={selectedNodeId}
              onNodeSelect={(node) => setSelectedNodeId(node.id)}
            />
          )}
        </main>

        {graph && selectedNode && (
          <div style={{ width: rightWidth }} className="flex-shrink-0 relative">
            <div 
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-white/30 z-10 transition-colors"
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