const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

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
  
