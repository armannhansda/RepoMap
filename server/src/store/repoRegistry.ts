const repositories = new Map<string, string>();


export function saveRepository (repoId:string, repoPath:string){
  repositories.set(repoId, repoPath);

}

export function getRepository(repoId:string){
  return repositories.get(repoId);
}