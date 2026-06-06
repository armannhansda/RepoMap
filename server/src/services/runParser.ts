import {exec } from "child_process"
import { error } from "console"
import { resolve } from "dns"
import path from "path"
import { stderr, stdout } from "process"


export function runParser(
  repoPath:string
): Promise<any> {
  return new Promise(
    (resolve, reject) =>{
      //path to parser
      const parserPath = path.join(
        process.cwd(),
        "..",
        "parser",
      );

      //command
      const command = `npx tsx src/index.ts "${repoPath}"`;

      exec(
        command,{
          cwd:parserPath,
          maxBuffer: 1024*1024*20,
        },
        (
          error,
          stdout,
          stderr,
        ) => {
            if(error){
              console.error("parser error:", error);

              reject(error);
              return;
            }
            
            if(stderr){
              console.error(stderr);
            }

            try {
              const graph = JSON.parse(stdout);


              resolve(graph);


            } catch (parseError) {
              reject(parseError);
              
            }

        }
      );
    }
  );
}