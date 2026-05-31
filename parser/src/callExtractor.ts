/*
    Version 1 Strategy

We'll support:

function login() {
  validateUser();
  generateJWT();
}

and

const login = () => {
  validateUser();
}

We will NOT support:

auth.validateUser()
obj.method()
this.login()

yet.

*/

import {Project, SyntaxKind} from "ts-morph";
import path from "path";
import { scannerRepository } from "./scanner.ts";

export async function extractCalls(
  repoPath: string
){

  const project = new Project({
    skipAddingFilesFromTsConfig:true
  })

  const files = await scannerRepository(repoPath);

  for (const file of files) {
    project.addSourceFileAtPath(file.absolutePath);
  }

  const sourceFiles = project.getSourceFiles();
  const calls: any[] =[];

  for(const file of sourceFiles){
    const relativePath = path.relative(repoPath, file.getFilePath());
    
    // normal function
    for(const fn of file.getFunctions()){
      const caller = fn.getName();

      if(!caller) continue;

      const callExpressions = fn.getDescendantsOfKind(SyntaxKind.CallExpression)

      for(const call of callExpressions){
        const expression = call.getExpression();

        if(expression.getKindName() === "Identifier"){
          calls.push({
            caller,
            callee:expression.getText(),
            file:relativePath,
          })
        }
      }
    }

    // Arrow Function
    for(const variable of file.getVariableDeclarations()){
      const initializer = variable.getInitializer();

      if(initializer?.getKindName() !== "ArrowFunction"){
        continue;
      }

      const caller = variable.getName();

      const callExpressions = initializer.getDescendantsOfKind(
        SyntaxKind.CallExpression
      )

      for(const call of callExpressions){
        const expression = call.getExpression();

        if(expression.getKindName() === "Identifier")
        {
          calls.push({
            caller,
            callee:expression.getText(),
            file: relativePath,
          })
        }
      }
    }
  }
  return calls;
}
