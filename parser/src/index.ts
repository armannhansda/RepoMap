import { extractCalls } from "./callExtractor.ts";
import { extractFunctions } from "./functionExtractor.ts";
import { buildGraph } from "./graphBuilder.ts";
import { extractImports } from "./importExtractor.ts";

async function main() {

  const repoPath = process.argv[2]
  
  if(!repoPath){
    console.log("repository path required");
    return;
  }

  // const files = await scannerRepository(repoPath);

  // console.log(files);

  const dependencies = await extractImports(repoPath);

  const functions = await extractFunctions(repoPath);
  
  const calls = await extractCalls(repoPath, functions);

  const graph = buildGraph(dependencies, functions, calls);


// console.log(JSON.stringify(functions, null, 2));
  
console.log(JSON.stringify(graph, null, 2));

// console.log(JSON.stringify(calls, null, 2));



}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
