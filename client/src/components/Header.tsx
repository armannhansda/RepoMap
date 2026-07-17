import React, { useState, useEffect, useRef, memo } from "react";
import { 
  Search, CornerDownLeft, Plus, Sparkles, BookOpen, Bot, 
  ListTodo, Zap, Activity, ShieldCheck, Download, Loader2, X, Home 
} from "lucide-react";
import Image from "next/image";

interface HeaderProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  onAnalyze: () => void;
  onNewAnalysis: () => void;
  loading: boolean;
  onExplainRepo: () => void;
  onOpenMemory: () => void;
  onOpenAiTab: (tab: 'qa' | 'planner') => void;
  onOpenOrchestrator: () => void;
  onOpenHealthTab: (tab: 'health' | 'review') => void;
  onExportDiagram: () => void;
  isGeneratingDiagram?: boolean;
  activeFeatureTab?: string | null;
}

function HeaderComponent({ 
  repoUrl, setRepoUrl, onAnalyze, onNewAnalysis, loading,
  onExplainRepo, onOpenMemory, onOpenAiTab, onOpenOrchestrator, 
  onOpenHealthTab, onExportDiagram, isGeneratingDiagram, activeFeatureTab
}: HeaderProps) {
  const [showInputBox, setShowInputBox] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "Repository";

  useEffect(() => {
    if (showInputBox) {
      inputRef.current?.focus();
    }
  }, [showInputBox]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowInputBox(prev => !prev);
      } else if (e.key === 'Escape' && showInputBox) {
        setShowInputBox(false);
      }
    };
    const handleFocusEvent = () => {
      setShowInputBox(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('focus-url-input', handleFocusEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focus-url-input', handleFocusEvent);
    };
  }, [showInputBox]);

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-white/10 bg-black/60 backdrop-blur-2xl text-sm relative z-50 min-h-[52px]">
      {/* Left side: Logo & Repo Badge */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div 
          onClick={onNewAnalysis}
          className="flex items-center gap-2 font-bold text-base text-white cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Image src="/icon.svg" alt="RepoMap Logo" width={22} height={22} className="w-5.5 h-5.5" />
          <span className="hidden sm:inline">RepoMap</span>
        </div>
        <div className="h-4 w-px bg-white/15" />
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/90 truncate max-w-[120px] sm:max-w-[180px]" title={repoUrl}>
          {repoName}
        </span>
      </div>

      {/* Center: AI Feature Tabs OR Repo URL Input Box with Smooth Animation */}
      <div className="flex-1 flex items-center justify-center max-w-[720px] mx-4 h-[40px] relative">
        {/* Repo URL Input Box Container */}
        <div 
          className={`absolute inset-0 w-full h-[40px] flex items-center group bg-[#141419]/90 hover:bg-[#18181f] focus-within:bg-[#18181f] border border-white/10 focus-within:border-white/30 rounded-full shadow-inner transition-all duration-300 ease-out ${
            showInputBox 
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto z-20' 
              : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none z-0'
          }`}
        >
          <Search className="absolute left-3.5 w-4 h-4 text-white/40 group-focus-within:text-white/80 transition-colors pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Paste GitHub repository URL or folder path to analyze..."
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setShowInputBox(false);
                onAnalyze();
              }
            }}
            disabled={loading || !showInputBox}
            className="w-full h-full bg-transparent rounded-full pl-10 pr-28 text-white placeholder:text-white/35 text-xs font-mono focus:outline-none focus:ring-4 focus:ring-white/[0.04] transition-all duration-200 disabled:opacity-50"
          />
          <button 
            onClick={() => {
              setShowInputBox(false);
              onAnalyze();
            }}
            disabled={loading || !repoUrl || !showInputBox}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 flex items-center gap-1.5 px-3.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-[11px] font-medium rounded-full border border-white/15 cursor-pointer disabled:opacity-30 disabled:pointer-events-none shadow-sm transition-all"
            title="Analyze Repository"
          >
            <span>Analyze</span>
            <CornerDownLeft className="w-3 h-3 text-white/70" />
          </button>
        </div>

        {/* AI Feature Tabs Container */}
        <div 
          className={`absolute inset-0 w-full h-[40px] flex items-center justify-between gap-1 bg-[#141419]/90 border border-white/10 p-1 rounded-full shadow-inner overflow-x-auto no-scrollbar transition-all duration-300 ease-out ${
            !showInputBox 
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto z-20' 
              : 'opacity-0 scale-95 translate-y-1.5 pointer-events-none z-0'
          }`}
        >
          <button 
            onClick={onExplainRepo}
            disabled={showInputBox}
            className={`flex-1 flex items-center justify-center gap-1.5 h-full px-2.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeFeatureTab === 'explain'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20 font-semibold scale-105'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06] active:scale-95'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${activeFeatureTab === 'explain' ? 'text-white scale-110' : 'text-white/60'}`} />
            <span>Explain</span>
          </button>

          <button 
            onClick={() => onOpenAiTab('qa')}
            disabled={showInputBox}
            className={`flex-1 flex items-center justify-center gap-1.5 h-full px-2.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeFeatureTab === 'qa'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20 font-semibold scale-105'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06] active:scale-95'
            }`}
          >
            <Bot className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${activeFeatureTab === 'qa' ? 'text-white scale-110' : 'text-white/60'}`} />
            <span>Ask</span>
          </button>

          <button 
            onClick={() => onOpenAiTab('planner')}
            disabled={showInputBox}
            className={`flex-1 flex items-center justify-center gap-1.5 h-full px-2.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeFeatureTab === 'planner'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20 font-semibold scale-105'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06] active:scale-95'
            }`}
          >
            <ListTodo className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${activeFeatureTab === 'planner' ? 'text-white scale-110' : 'text-white/60'}`} />
            <span>Planner</span>
          </button>

          <button 
            onClick={onOpenOrchestrator}
            disabled={showInputBox}
            className={`flex-1 flex items-center justify-center gap-1.5 h-full px-2.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeFeatureTab === 'engine'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20 font-semibold scale-105'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06] active:scale-95'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${activeFeatureTab === 'engine' ? 'text-white scale-110' : 'text-white/60'}`} />
            <span>Engine</span>
          </button>

          <button 
            onClick={() => onOpenHealthTab('health')}
            disabled={showInputBox}
            className={`flex-1 flex items-center justify-center gap-1.5 h-full px-2.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeFeatureTab === 'health'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20 font-semibold scale-105'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06] active:scale-95'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${activeFeatureTab === 'health' ? 'text-white scale-110' : 'text-white/60'}`} />
            <span>Health</span>
          </button>

          <button 
            onClick={() => onOpenHealthTab('review')}
            disabled={showInputBox}
            className={`flex-1 flex items-center justify-center gap-1.5 h-full px-2.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeFeatureTab === 'hotspots'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20 font-semibold scale-105'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06] active:scale-95'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${activeFeatureTab === 'hotspots' ? 'text-white scale-110' : 'text-white/60'}`} />
            <span>Hotspots</span>
          </button>

          <button 
            onClick={onExportDiagram}
            disabled={isGeneratingDiagram || showInputBox}
            className="flex-1 flex items-center justify-center gap-1.5 h-full px-2.5 rounded-full text-xs font-medium bg-white/[0.03] text-text-muted hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {isGeneratingDiagram ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white/60 shrink-0" />
            ) : (
              <Download className="w-3.5 h-3.5 text-white/60 shrink-0" />
            )}
            <span>{isGeneratingDiagram ? "Exporting..." : "Export"}</span>
          </button>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {showInputBox ? (
          <>
            <button 
              onClick={() => setShowInputBox(false)}
              className="flex items-center gap-1.5 text-text-muted hover:text-white font-medium px-2.5 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button 
              onClick={onNewAnalysis}
              className="flex items-center gap-1.5 text-white/80 hover:text-white font-medium px-2.5 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-all cursor-pointer border border-white/10"
              title="Return to Home / Clear Analysis"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </button>
          </>
        ) : (
          <button 
            onClick={() => setShowInputBox(true)}
            className="flex items-center gap-1.5 text-white font-medium bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg hover:bg-white/15 hover:border-white/25 transition-all duration-200 active:scale-95 text-xs shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-brand" />
            <span>New Analysis</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default memo(HeaderComponent);
