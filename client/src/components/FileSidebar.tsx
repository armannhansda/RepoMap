import { getFileContent } from "@/services/api";
import { useEffect, useState } from "react";

interface Props {
  node: any;
  repoId: string;
}

export default function FileSidebar({ node, repoId }: Props) {
  const [content, setContent] = useState("");

  useEffect(() => {
    async function load() {
      if (!node || !repoId) return;

      const file = await getFileContent(repoId, node.data.path);
      setContent(file.content ?? "");
    }

    load();
  }, [node, repoId]);

  if (!node) return null;

  return (
    <div className="w-96 border-l p-4 overflow-auto">
      <h2 className="font-bont text-xl mb-4">{node.data.label}</h2>

      <p className="mb-4">{node.data.path}</p>

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
        <h3 className="font-bold">Source Preview</h3>

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
      </div>
    </div>
  );
}
