import { parseRepository } from "./src/index.ts";

async function main() {
  const repoPath = process.argv[2] || process.cwd();
  console.log("Analyzing", repoPath);
  try {
    const graph = await parseRepository(repoPath);
    console.log(`Graph has ${graph.nodes?.length} nodes and ${graph.edges?.length} edges.`);
    if (!graph.nodes || graph.nodes.length === 0) {
      console.log("No nodes found!");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
