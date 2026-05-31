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