export interface fileDependency {
  file: string;
  imports: string[];
}

export interface ApiEndpoint {
  httpMethod: string; // GET, POST, PUT, DELETE, PATCH, etc.
  routePath: string;
  handlerName?: string;
}

export interface FunctionNode {
  name: string;
  file: string;
  type: "function" | "arrow" | "method";
  line: number;
  endLine?: number;
  isExported?: boolean;
  apiEndpoint?: ApiEndpoint;
}

export interface ClassNode {
  name: string;
  file: string;
  type: "class";
  line: number;
  endLine: number;
  isExported?: boolean;
  extendsClass?: string;
  implementsInterfaces?: string[];
  methods?: string[];
}

export interface InterfaceNode {
  name: string;
  file: string;
  type: "interface" | "type" | "struct";
  line: number;
  endLine: number;
  isExported?: boolean;
}

export interface FolderNode {
  path: string;
  name: string;
  type: "folder";
  files: string[];
  subfolders: string[];
}

export interface TechStackMetadata {
  languages: string[];
  frameworks: string[];
  packageCount: number;
}

export interface FunctionCall {
  caller: string;
  callee: string;
  file: string;
}