export interface fileDependency{
  file: string;
  import: string[];
}

export interface FunctionNode{
  name: string;
  file: string;
  types: | "function" | "arrow" | "method";
  line: number;
}

export interface FunctionCall{
  caller:string,
  callee:string,
  file:string
}