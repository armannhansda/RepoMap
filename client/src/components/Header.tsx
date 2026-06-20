import { Moon, Search, Box, CornerDownLeft, User } from "lucide-react";

interface HeaderProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  onAnalyze: () => void;
  loading: boolean;
}

export default function Header({ repoUrl, setRepoUrl, onAnalyze, loading }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border-subtle bg-bg-base text-sm">
      {/* Left side: Logo & Nav */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 font-bold text-lg text-text-main">
          <Box className="w-5 h-5 text-brand" />
          <span>RepoMap</span>
        </div>
        
        <nav className="flex gap-6 text-text-muted font-medium">
          <button className="text-text-main border-b-2 border-brand pb-1 -mb-1">Explore</button>
          <button className="hover:text-text-main transition-colors">Docs</button>
          <button className="hover:text-text-main transition-colors">History</button>
        </nav>
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
            className="w-full bg-surface border border-border-subtle rounded-lg py-1.5 pl-10 pr-10 text-text-main placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
          />
          <button 
            onClick={onAnalyze}
            className="absolute right-3 p-0.5 text-text-muted hover:text-text-main"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-4">
        <button className="p-2 text-text-muted hover:text-text-main rounded-md hover:bg-surface-hover transition-colors">
          <Moon className="w-4 h-4" />
        </button>
        <button className="text-text-main font-medium hover:text-brand transition-colors">
          Sign In
        </button>
        <button 
          onClick={onAnalyze}
          disabled={loading}
          className="bg-brand hover:bg-brand-hover text-white px-4 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-active flex items-center justify-center border border-border-subtle overflow-hidden">
          <User className="w-5 h-5 text-text-muted" />
        </div>
      </div>
    </header>
  );
}
