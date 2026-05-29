import { type Request, type Response }  from "express";
import { cloneRepository } from "../services/repoclone.ts";
import { runParser } from "../services/runParser.ts";


export async function analyzeRepo(
  req:Request,
  res:Response,
): Promise<void> {

  try {

    console.log("request recieve")
    const {repoUrl} = req.body

    if(!repoUrl){
        res.status(400).json({
        error: "Repository url required",
      })
    }

    console.log("cloning Repository.....")

    const clonedRepo = await cloneRepository(repoUrl);

    console.log("Running Parser....");

    const graph = await runParser(
      clonedRepo.repoPath
    );

    console.log("Graph generated")

    res.json({
      success: true,
      graph,
    })
  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "failed to analyze repository",
    })
    
  }
  
}
