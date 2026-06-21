import { Search, CornerDownLeft, Plus } from "lucide-react";
import Image from "next/image";

interface HeaderProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  onAnalyze: () => void;
  onNewAnalysis: () => void;
  loading: boolean;
}

export default function Header({ repoUrl, setRepoUrl, onAnalyze, onNewAnalysis, loading }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/40 backdrop-blur-xl text-sm relative z-50">
      {/* Left side: Logo & Nav */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 font-bold text-lg text-white">
          <Image src="/icon.svg" alt="RepoMap Logo" width={24} height={24} className="w-6 h-6" />
          <span>RepoMap</span>
        </div>
      </div>

      {/* Middle: Search Bar */}
      <div className="flex-1 max-w-2xl mx-8">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="https://github.com/..."
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAnalyze();
            }}
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-10 pr-10 text-white placeholder-text-muted focus:outline-none focus:border-white/30 focus:bg-white/10 hover:bg-white/10 transition-all duration-300 disabled:opacity-50"
          />
          <button 
            onClick={onAnalyze}
            disabled={loading}
            className="absolute right-3 p-0.5 text-text-muted hover:text-text-main disabled:opacity-50"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onNewAnalysis}
          className="flex items-center gap-2 text-white font-medium bg-white/5 border border-white/10 px-4 py-1.5 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-300 active:scale-95 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Analysis</span>
        </button>
        {/* <button 
          onClick={onAnalyze}
          disabled={loading || !repoUrl}
          className="bg-brand hover:bg-brand-hover text-white px-4 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          Analyze
        </button> */}
      </div>
    </header>
  );
}
