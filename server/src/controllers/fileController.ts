import { type Request, type Response } from "express"
import fs from"fs"
import path from "path"
import { getRepository } from "../store/repoRegistry.ts"


export function getFileContent(req: Request, res: Response){


  const {repoId, filePath} = req.query

  const repoPath = getRepository(repoId as string);


  if(!repoPath){
    return res.status(404).json({
      error : "Repository not found"
    })
  }

  const fullPath = path.join(repoPath, filePath as string);

  const content = fs.readFileSync(fullPath, "utf-8");

  res.json({
    path: filePath,
    content,
  })

}