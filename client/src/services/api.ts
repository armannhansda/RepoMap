import { isVSCode } from "../utils/vscode";
import { fetchVsCode } from "./vscodeApi";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001").replace(/\/+$/, "");

async function apiFetch(endpointPath: string, options?: RequestInit, vscodeEndpoint?: string, payload?: any) {
  if (isVSCode) {
    return await fetchVsCode(vscodeEndpoint || endpointPath.split('?')[0], payload);
  }

  const url = endpointPath.startsWith('http') ? endpointPath : `${API_BASE_URL}${endpointPath}`;
  const response = await fetch(url, options);
  
  // Some endpoints return the response directly, others return json.
  // The existing code manually does response.json(), so let's just return the response
  // object and let the callers do .json().
  // Wait, if it's VS Code, fetchVsCode already returns the parsed JSON/data.
  // We need to return a Response-like object if callers expect `response.json()`!
  // Actually, let's just make `apiFetch` return the JSON directly, and update all callers.
  // Wait, updating all callers is too much. Let's return an object with a `.json()` method.
  
  if (!response.ok && endpointPath === '/api/repo/analyze') {
    const data = await response.json();
    throw new Error(data?.error || data?.message || "Failed to analyze repository.");
  }
  return response;
}

export async function analyzeRepo(repoUrl: string) {
  if (isVSCode) {
    return await fetchVsCode("analyzeRepo", { repoUrl });
  }

  const response = await fetch(
    `${API_BASE_URL}/api/repo/analyze`,
    {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        repoUrl,
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Failed to analyze repository.");
  }

  return data;
}

export async function getFileContent(repoId:string, filePath:string) {
  if (isVSCode) {
    return await fetchVsCode("getFileContent", { repoId, filePath });
  }

  const response = await fetch (
    `${API_BASE_URL}/api/repo/file?repoId=${encodeURIComponent(repoId)}&filePath=${encodeURIComponent(filePath)}`
  )
  return response.json();
}
  
export async function explainNode(nodeData: any) {
  if (isVSCode) return await fetchVsCode("explainNode", nodeData);
  const response = await fetch(`${API_BASE_URL}/api/ai/explain`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(nodeData)
  });
  return response.json();
}

export async function explainRepo(repoName: string, files: any[]) {
  if (isVSCode) return await fetchVsCode("explainRepo", { repoName, files });
  const response = await fetch(`${API_BASE_URL}/api/ai/explain-repo`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ repoName, files })
  });
  return response.json();
}

export async function generateArchitectureDiagram(repoName: string, files: any[]) {
  if (isVSCode) return await fetchVsCode("generateArchitectureDiagram", { repoName, files });
  const response = await fetch(`${API_BASE_URL}/api/ai/generate-diagram`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ repoName, files })
  });
  return response.json();
}

export async function getRepoMemory(repoId: string) {
  if (isVSCode) return await fetchVsCode("getRepoMemory", { repoId });
  const response = await fetch(`${API_BASE_URL}/api/ai/memory?repoId=${encodeURIComponent(repoId)}`);
  return response.json();
}

export async function simulateImpactAnalysis(payload: { repoId: string; targetId: string; changeType: 'MODIFY' | 'DELETE'; graph?: any }) {
  if (isVSCode) return await fetchVsCode("simulateImpactAnalysis", payload);
  const response = await fetch(`${API_BASE_URL}/api/ai/impact-analysis`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function planTask(payload: { repoId: string; prompt: string; graph?: any }) {
  if (isVSCode) return await fetchVsCode("planTask", payload);
  const response = await fetch(`${API_BASE_URL}/api/ai/plan-task`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function queryArchitecture(payload: { repoId: string; question: string; graph?: any }) {
  if (isVSCode) return await fetchVsCode("queryArchitecture", payload);
  const response = await fetch(`${API_BASE_URL}/api/ai/query-architecture`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function performCodeReviewApi(payload: { repoId: string; graph?: any }) {
  if (isVSCode) return await fetchVsCode("performCodeReviewApi", payload);
  const response = await fetch(`${API_BASE_URL}/api/ai/code-review`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function calculateHealthScoreApi(payload: { repoId: string; graph?: any }) {
  if (isVSCode) return await fetchVsCode("calculateHealthScoreApi", payload);
  const response = await fetch(`${API_BASE_URL}/api/ai/health-score`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function runOrchestrationApi(payload: { repoId: string; prompt: string; graph?: any }) {
  if (isVSCode) return await fetchVsCode("runOrchestrationApi", payload);
  const response = await fetch(`${API_BASE_URL}/api/ai/orchestrate`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function getRepoProgressApi(repoUrl: string) {
  if (isVSCode) return await fetchVsCode("getRepoProgressApi", { repoUrl });
  const response = await fetch(`${API_BASE_URL}/api/repo/progress?repoUrl=${encodeURIComponent(repoUrl)}`);
  return response.json();
}
