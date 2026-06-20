'use client'

import { useState } from "react";
import RepoGraph from "@/components/RepoGraph";
import { analyzeRepo } from "@/services/api";
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import FileSidebar from "@/components/FileSidebar";

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
      const result = await analyzeRepo(repoUrl);
      setGraph(result.graph);
      setRepoId(result.repoId);
      setSelectedNodeId(undefined);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const selectedNode = graph?.nodes?.find((n: any) => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-base text-text-main font-sans">
      <Header 
        repoUrl={repoUrl} 
        setRepoUrl={setRepoUrl} 
        onAnalyze={handleAnalyze} 
        loading={loading} 
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        {graph && (
          <LeftSidebar 
            nodes={graph.nodes} 
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            onNewAnalysis={() => {
              setGraph(null);
              setRepoUrl("");
              setSelectedNodeId(undefined);
            }}
          />
        )}
        
        <main className="flex-1 relative bg-surface overflow-hidden">
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
              selectedNodeId={selectedNodeId}
              onNodeSelect={(node) => setSelectedNodeId(node.id)}
            />
          )}
        </main>

        {graph && selectedNode && (
          <FileSidebar 
            node={selectedNode} 
            repoId={repoId} 
            onClose={() => setSelectedNodeId(undefined)} 
          />
        )}
      </div>
    </div>
  );
}