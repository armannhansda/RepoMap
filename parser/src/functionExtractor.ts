import {Project} from "ts-morph";
import path from "path";
import { scannerRepository } from "./scanner.ts";


export async function extractFunctions(repoPath:string) {

    const project = new Project({
        skipAddingFilesFromTsConfig:true
    })

   
    const files = await scannerRepository(repoPath);

    for (const file of files) {
        project.addSourceFileAtPath(file.absolutePath);
    }

    const sourceFiles = project.getSourceFiles();

    const functions: any[] = [];


    for(const file of sourceFiles){
        const relativePath = path.relative(repoPath, file.getFilePath())

        //nornal function\

        file.getFunctions().forEach((fn)=>{
            functions.push({
                name:fn.getName() || "anonymous",
                file: relativePath,
                type: "function",
                line: fn.getStartLineNumber(),
                endLine: fn.getEndLineNumber(),
            })
        })

        //arrow function
        file.getVariableDeclarations().forEach((variable)=>{
            const init = variable.getInitializer();

            if(init?.getKindName() === "ArrowFunction"){
                functions.push({
                    name:variable.getName(),
                    file: relativePath,
                    type: "arrow",
                    line: variable.getStartLineNumber(),
                    endLine: variable.getEndLineNumber(),
                })
            }
        })

        //class methods

        file.getClasses().forEach((cls)=>{
            cls.getMethods().forEach((method)=>{
                functions.push({
                    name: method.getName(),
                    file: relativePath,
                    type: "method",
                    line:method.getStartLineNumber(),
                    endLine: method.getEndLineNumber(),
                })
            })
        })
    };

    return functions



    
}