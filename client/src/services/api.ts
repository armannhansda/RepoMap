const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001").replace(/\/+$/, "");

export async function analyzeRepo(repoUrl:string) {
  const response = await fetch (
    `${API_BASE_URL}/api/repo/analyze`,
    {
      method:"POST",
      headers: {
        "Content-type": "application/json",
      },
      body:JSON.stringify({
        repoUrl,
      })
    }
  )
  return response.json()
}

export async function getFileContent(repoId:string, filePath:string) {
  const response = await fetch (
    `${API_BASE_URL}/api/repo/file?repoId=${encodeURIComponent(repoId)}&filePath=${encodeURIComponent(filePath)}`
  )
  return response.json();
}
  
export async function explainNode(nodeData: any) {
  const response = await fetch(`${API_BASE_URL}/api/ai/explain`, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify(nodeData)
  });
  return response.json();
}

export async function explainRepo(repoName: string, files: any[]) {
  const response = await fetch(`${API_BASE_URL}/api/ai/explain-repo`, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify({ repoName, files })
  });
  return response.json();
}

export async function generateArchitectureDiagram(repoName: string, files: any[]) {
  const response = await fetch(`${API_BASE_URL}/api/ai/generate-diagram`, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify({ repoName, files })
  });
  return response.json();
}

export async function getRepoMemory(repoId: string) {
  const response = await fetch(`${API_BASE_URL}/api/ai/memory?repoId=${encodeURIComponent(repoId)}`);
  return response.json();
}

export async function simulateImpactAnalysis(payload: { repoId: string; targetId: string; changeType: 'MODIFY' | 'DELETE'; graph?: any }) {
  const response = await fetch(`${API_BASE_URL}/api/ai/impact-analysis`, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function planTask(payload: { repoId: string; prompt: string; graph?: any }) {
  const response = await fetch(`${API_BASE_URL}/api/ai/plan-task`, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function queryArchitecture(payload: { repoId: string; question: string; graph?: any }) {
  const response = await fetch(`${API_BASE_URL}/api/ai/query-architecture`, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function performCodeReviewApi(payload: { repoId: string; graph?: any }) {
  const response = await fetch(`${API_BASE_URL}/api/ai/code-review`, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function calculateHealthScoreApi(payload: { repoId: string; graph?: any }) {
  const response = await fetch(`${API_BASE_URL}/api/ai/health-score`, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function runOrchestrationApi(payload: { repoId: string; prompt: string; graph?: any }) {
  const response = await fetch(`${API_BASE_URL}/api/ai/orchestrate`, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}
