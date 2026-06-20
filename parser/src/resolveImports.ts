import fs from "fs";

import path from "path"


const extension = [
  ".ts", ".tsx", ".js", ".jsx",
  ".py", ".go", ".java", ".cpp", ".c", ".h", ".hpp", ".rs", ".rb", ".php", ".cs", ".swift", ".kt"
];

export function resolveImportPath(
  currentPath: string,
  importPath: string,
  repoPath: string,
){
  //ignore package
  if(!importPath.startsWith(".")){return null};

  //base path
  const currentDir = path.dirname(currentPath);
  const absoluteImportPath = path.resolve(currentDir, importPath);

  // Check if the path already exists directly (e.g., explicit extension like .ts/.js)
  if (fs.existsSync(absoluteImportPath) && fs.statSync(absoluteImportPath).isFile()) {
    return path.relative(repoPath, absoluteImportPath);
  }

  //try extension
  for(const ext of extension){
    const fullPath = absoluteImportPath+ext;

    if(fs.existsSync(fullPath)){
      return path.relative(
        repoPath, fullPath
      );
    }
  }

  // try index file

  for(const ext of extension){
    const indexPath = path.join(absoluteImportPath,`index${ext}`);
    if(fs.existsSync(indexPath)){
      return path.relative(repoPath, indexPath);
    }
  }

  return null;
}