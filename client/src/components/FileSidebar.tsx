import { getFileContent } from "@/services/api";
import { useEffect, useRef, useState, useMemo } from "react";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  node: any;
  repoId: string;
}

export default function FileSidebar({ node, repoId }: Props) {
  const [content, setContent] = useState("");
  const [selectedFunction, setSelectedFunction] = useState<any>();
  const filePath = node?.data.path ?? node?.data.file ?? "";

  useEffect(() => {
    async function load() {
      const currentKey = `${repoId}:${filePath}`;

      if (!node || !repoId || !filePath) {
        setContent("");
        return;
      }

      const file = await getFileContent(repoId, filePath);
      setContent(file.content ?? "");
    }

    load();
  }, [node, repoId, filePath]);

  if (!node) return null;

  function getFunctionSource(content: string, functionLine: number, functionEndLine?: number) {
    const lines = content.split("\n");

    const start = Math.max(functionLine - 1, 0);

    if (functionEndLine) {
      return lines.slice(start, functionEndLine).join("\n");
    }

    let braceCount = 0;
    let started = false;
    const result: string[] = [];

    for (let i = start; i < lines.length; i++) {
      const line = lines[i];

      result.push(line);

      for (const char of line) {
        if (char === "{") {
          braceCount++;
          started = true;
        }

        if (char === "}") {
          braceCount--;
        }
      }

      if (started && braceCount === 0) {
        break;
      }
    }

    return result.join("\n");
  }

  const functionSource = selectedFunction
    ? getFunctionSource(content, selectedFunction.line, selectedFunction.endLine)
    : node?.data?.line
      ? getFunctionSource(content, node.data.line, node.data.endLine)
      : "";

  const functionLookup = useMemo(() => {
    const map = new Map<string, any>();

    node?.data.functions?.forEach((fn: any) => {
      map.set(fn.name, fn);
    });

    return map;
  }, [node]);

  return (
    <div className="w-96 border-l p-4 overflow-auto">
      <h2 className="font-bont text-xl mb-4">label: {node.data.label}</h2>

      <p className="mb-4">Path: {filePath || "No file path available"}</p>

      <h3 className="font-semibold">imports</h3>

      <ul className="mb-4">
        {node.data.imports?.map((imp: string, i: number) => (
          <li key={`${imp}-${i}`}>{imp}</li>
        ))}
      </ul>

      <h3 className="font-semibold">imported By</h3>

      <ul className="mb-4">
        {node.data.importedBy?.map((imp: string, i: number) => (
          <li key={`${imp}-${i}`}>{imp}</li>
        ))}
      </ul>

      {node.data.functionType && (
        <div className="mt-6">
          <h3 className="font-bold">Function details</h3>

          <p>Name: {node.data.label}</p>

          <p>line: {node.data.line}</p>

          <p>Type: {node.data.functionType}</p>

          <div className="mt-4">
            <h4 className="font-semibold">Calls:</h4>
            {node.data.calls?.length ? (
              <ul>
                {node.data.calls.map((c: string, i: number) => (
                  <li
                    key={`${c}-${i}`}
                    className="
    cursor-pointer
    text-blue-500
  "
                    onClick={() => {
                      const target = functionLookup.get(c);

                      if (target) {
                        setSelectedFunction(target);
                      }
                    }}
                  >
                    {c}()
                  </li>
                ))}
              </ul>
            ) : (
              <p>no calls</p>
            )}
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">Called By:</h4>
            {node.data.calledBy?.length ? (
              <ul>
                {node.data.calledBy.map((c: string, i: number) => (
                  <li
                    key={`${c}-${i}`}
                    className="
    cursor-pointer
    text-blue-500
  "
                    onClick={() => {
                      const target = functionLookup.get(c);

                      if (target) {
                        setSelectedFunction(target);
                      }
                    }}
                  >
                    {c}()
                  </li>
                ))}
              </ul>
            ) : (
              <p>Not called</p>
            )}
          </div>
          <div className="mt-4">
            <h4 className="font-semibold">Source</h4>

            <pre
              className="
                              bg-black
                              text-white
                              p-3
                              rounded
                              overflow-auto
                              text-sm
                              max-h-[300px]
                            "
            >
              {functionSource}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-bold">Functions</h3>

        {node.data.functions?.length ? (
          <ul className="mt-2">
            {node.data.functions.map((fn: any) => (
              <li
                key={`${fn.name}-${fn.line}`}
                onClick={() => setSelectedFunction(fn)}
                className="cursor-pointer py-1"
              >
                {fn.name}

                {selectedFunction?.name === fn.name && (
                  <>
                    <div className="mt-2 ml-4">
                      <h3 className="font-bold">Function details</h3>

                      <p>Name: {selectedFunction.name}</p>

                      <p>line: {selectedFunction.line}</p>

                      <p>Type: {selectedFunction.type}</p>

                      <div className="mt-4">
                        <h4 className="font-semibold">Calls:</h4>

                        {selectedFunction.calls?.length ? (
                          <ul>
                            {selectedFunction.calls.map(
                              (c: string, i: number) => (
                                <li
                                  key={`${c}-${i}`}
                                  className="
    cursor-pointer
    text-blue-500
  "
                                  onClick={() => {
                                    const target = functionLookup.get(c);

                                    if (target) {
                                      setSelectedFunction(target);
                                    }
                                  }}
                                >
                                  {c}()
                                </li>
                              ),
                            )}
                          </ul>
                        ) : (
                          <p>no calls</p>
                        )}
                      </div>

                      <div className="mt-4">
                        <h4 className="font-semibold">Called By:</h4>

                        {selectedFunction.calledBy?.length ? (
                          <ul>
                            {selectedFunction.calledBy.map(
                              (c: string, i: number) => (
                                <li
                                  key={`${c}-${i}`}
                                  className="
    cursor-pointer
    text-blue-500
  "
                                  onClick={() => {
                                    const target = functionLookup.get(c);

                                    if (target) {
                                      setSelectedFunction(target);
                                    }
                                  }}
                                >
                                  {c}()
                                </li>
                              ),
                            )}
                          </ul>
                        ) : (
                          <p>Not called</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className="font-semibold">Source</h4>

                      <pre
                        className="
                              bg-black
                              text-white
                              p-3
                              rounded
                              overflow-auto
                              text-sm
                              max-h-[300px]
                            "
                      >
                        {functionSource}
                      </pre>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No functions</p>
        )}
      </div>

      <div className="mt-6">
        <h3 className="font-bold">Source Preview</h3>

        {filePath ? (
          <pre
            className="
      bg-black
      text-white
      p-4
      rounded
      overflow-auto
      text-sm
      max-h-125
    "
          >
            {content}
          </pre>
        ) : (
          <p>Select a file node to preview source.</p>
        )}
      </div>
    </div>
  );
}
