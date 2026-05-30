'use client'

import { useState } from "react";
import RepoGraph from "@/components/RepoGraph";
import { analyzeRepo } from "@/services/api";

export default function Home(){
  const [repoUrl, setRepoUrl] = useState("");

  const [graph, setGraph] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const [repoId, setRepoId] = useState("")

  async function handleAnalyze() {

    try {
      
      setLoading(true);

      const result = await analyzeRepo(repoUrl);

      setGraph(result.graph);

      setRepoId(result.repoId);


    } catch (error) {
      console.error(error)
    }finally{
      setLoading(false);
    }
    
  }


  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-6">
        RepoMap
      </h1>

      <div className="flex gap-4 mb-6">
        <input 
          type="text"
          placeholder="GitHub Repo Url"
          value={repoUrl}
          onChange={(e) =>
            setRepoUrl(
              e.target.value
            )
          } 
          className="barder p-3 w-full rounded-lg" 
        />

        <button
          onClick={handleAnalyze}
          className="bg-black text-white px-6 rounded-lg"
        >
          {loading
            ?"Analyzing...."
            :"Analyzed"
          }
        </button>
      </div>

      {graph && (
        <RepoGraph graph={graph} repoId={repoId} />
      )}
    </main>
  )
}