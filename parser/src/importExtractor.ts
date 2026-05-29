import { Project } from "ts-morph";
import { scannerRepository } from "./scanner.ts";
import { resolveImportPath } from "./resolveImports.ts";
import path from "path"

function toDisplayPath(repoPath: string, absolutePath: string) {
  const normalizedRepoPath = repoPath.replace(/\\/g, "/");
  const normalizedAbsolutePath = absolutePath.replace(/\\/g, "/");

  if (normalizedAbsolutePath.startsWith(`${normalizedRepoPath}/`)) {
    return normalizedAbsolutePath.slice(normalizedRepoPath.length + 1);
  }

  return normalizedAbsolutePath;
}


export async function extractImports(repoPath:string) 
{
  const project = new Project({
    skipAddingFilesFromTsConfig:true
  });

  const files = await scannerRepository(repoPath);

  for (const file of files) {
    project.addSourceFileAtPath(file.absolutePath);
  }

  const sourceFile = project.getSourceFiles();

  const dependencyMap = [];

  for(const file of sourceFile){
    const imports = file.getImportDeclarations();

    const resolvedImports = [];

    for(const imp of imports) {
    
      const importVal = imp.getModuleSpecifierValue();

      const resolvedPath = resolveImportPath(file.getFilePath(),importVal, repoPath)

      if(resolvedPath){
        resolvedImports.push(resolvedPath);
      }
    }

    dependencyMap.push({
      file: path.relative(repoPath, file.getFilePath()),
      
      imports: resolvedImports
    })
  }

  return dependencyMap;
  
}
