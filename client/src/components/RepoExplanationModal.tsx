import { X, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import DraggableCard from "./DraggableCard";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  repoName: string;
  explanation: string | null;
  isLoading: boolean;
  error: string | null;
}

export default function RepoExplanationModal({ isOpen, onClose, repoName, explanation, isLoading, error }: Props) {
  if (!isOpen) return null;

  return (
    <DraggableCard isOpen={isOpen} onClose={onClose} widthClass="w-[640px]">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3 pr-8 cursor-move">
        <Sparkles className="w-4 h-4 text-white/80 shrink-0" />
        <h2 className="text-sm font-semibold text-white tracking-tight">Repository Overview</h2>
        <span className="text-[11px] font-mono text-text-muted">({repoName})</span>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
            <div className="w-7 h-7 border-2 border-white/60 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium text-white">Generating architectural overview for {repoName}...</p>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        ) : explanation ? (
          <div className="prose prose-invert prose-sm max-w-none text-gray-200 text-xs leading-relaxed font-sans">
            <ReactMarkdown>{explanation}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center text-text-muted text-xs py-12 flex items-center justify-center">
            No explanation generated.
          </div>
        )}
      </div>
    </DraggableCard>
  );
}
