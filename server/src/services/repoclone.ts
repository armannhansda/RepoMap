import { simpleGit } from "simple-git";
import fs from "fs";
import path from "path";


const git = simpleGit();

export async function cloneRepository(repoUrl:string) {

  try {
    //create unique repo folder name
    const repoName = repoUrl
      .split("/")
      .pop()
      ?.replace(".git", "")

      if(!repoName){
        throw new Error("invalid repository");
      }

      const repoPath = path.join(
        process.cwd(),
        "temp",
        repoName + "-" + Date.now()
      );

      fs.mkdirSync(path.dirname(repoPath), {
        recursive: true,
      })

      console.log("clonning into ", repoPath)
      
      await git.clone(repoUrl, repoPath);
      
      console.log("clonning complete")
      return {
        repoName,
        repoPath,
      }
    
  } catch (error) {
    console.error(error)
    throw error;
  }
  
}
