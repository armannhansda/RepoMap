import { getFileContent } from "@/services/api";
import { useEffect, useRef, useState } from "react";

interface Props {
  node: any;
  repoId: string;
}

export default function FileSidebar({ node, repoId }: Props) {
  const [content, setContent] = useState("");
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

  return (
    <div className="w-96 border-l p-4 overflow-auto">
      <h2 className="font-bont text-xl mb-4">label: {node.data.label}</h2>

      <p className="mb-4">Path: {filePath || "No file path available"}</p>

      <h3 className="font-semibold">imports</h3>

      <ul className="mb-4">
        {node.data.imports?.map((imp: string) => (
          <li key={imp}>{imp}</li>
        ))}
      </ul>

      <h3 className="font-semibold">imported By</h3>

      <ul className="mb-4">
        {node.data.importedBy?.map((imp: string) => (
          <li key={imp}>{imp}</li>
        ))}
      </ul>

      <div className="mt-6">
        <h3 className="font-bold">
          Functions
        </h3>

        {node.data.functions
          ?.length ? (
          <ul className="mt-2">
            {node.data.functions.map(
              (
                fn: any
              ) => (
                <li
                  key={fn.name}
                  className="
              cursor-pointer
              py-1
            "
                >
                  {fn.name}()
                  {" "}
                  (L{fn.line})
                </li>
              )
            )}
          </ul>
        ) : (
          <p>
            No functions
          </p>
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
          <p>
            Select a file node to preview source.
          </p>
        )}
      </div>
    </div>
  );
}
