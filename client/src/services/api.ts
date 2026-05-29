export async function analyzeRepo(repoUrl:string) {

  const response = await fetch (
    "http://localhost:5000/api/repo/analyze",
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