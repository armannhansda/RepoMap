import { X, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';

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
    <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
      <div 
        className="bg-black/90 backdrop-blur-md border-l border-white/10 shadow-2xl w-full max-w-md h-full flex flex-col overflow-hidden text-text-main animate-in slide-in-from-right duration-300 pointer-events-auto"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-brand/20 border border-brand/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Repository Overview</h2>
              <p className="text-xs text-text-muted">{repoName}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-text-muted hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-black/40">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4 text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
              <p className="animate-pulse">Generating architectural overview for {repoName}...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          ) : explanation ? (
            <div className="prose prose-invert prose-sm max-w-none text-text-muted">
              <ReactMarkdown>{explanation}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center text-text-muted h-48 flex items-center justify-center">
              No explanation generated.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
