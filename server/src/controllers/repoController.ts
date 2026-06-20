import { type Request, type Response }  from "express";
import {randomUUID} from "crypto";


import { cloneRepository } from "../services/repoclone.ts";
import { runParser } from "../services/runParser.ts";
import { saveRepository } from "../store/repoRegistry.ts";



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
      });
      return;
    }

    console.log("cloning Repository.....")

    const clonedRepo = await cloneRepository(repoUrl);

    const repoId = repoUrl;

    saveRepository(repoId, clonedRepo.repoPath);

    console.log("Running Parser....");

    const graph = await runParser(
      clonedRepo.repoPath
    );

    console.log("Graph generated")

    res.json({
      success: true,
      repoId,
      graph,
    })
  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "failed to analyze repository",
    })
    
  }
  
}
