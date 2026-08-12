import React, { useState, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { 
  Search, CornerDownLeft, Plus, Sparkles, BookOpen, Bot, 
  ListTodo, Zap, Activity, ShieldCheck, Download, Loader2, X, Home, ChevronDown, FileImage, FileText
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
  onExportImage: (format: 'png' | 'pdf') => void;
  isGeneratingDiagram?: boolean;
  isExportingImage?: boolean;
  activeFeatureTab?: string | null;
}

function HeaderComponent({ 
  repoUrl, setRepoUrl, onAnalyze, onNewAnalysis, loading,
  onExplainRepo, onOpenMemory, onOpenAiTab, onOpenOrchestrator, 
  onOpenHealthTab, onExportDiagram, onExportImage, isGeneratingDiagram, isExportingImage, activeFeatureTab
}: HeaderProps) {
  const [showInputBox, setShowInputBox] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMenuPosition, setExportMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const exportTriggerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "Repository";

  const isExportBusy = !!isGeneratingDiagram || !!isExportingImage;

  // The Export button sits inside a horizontally-scrollable tab row
  // (overflow-x-auto). Per the CSS spec, setting overflow-x forces
  // overflow-y to compute as "auto" too, even though we never set it —
  // so a plain absolutely-positioned dropdown gets clipped by that
  // ancestor no matter how it's positioned. Rendering the menu through
  // a portal onto document.body, with `fixed` coordinates computed
  // from the button's real screen position, is the standard fix for a
  // dropdown trapped inside a scrollable/overflow-clipped container.
  const toggleExportMenu = () => {
    if (!showExportMenu && exportTriggerRef.current) {
      const rect = exportTriggerRef.current.getBoundingClientRect();
      setExportMenuPosition({
        top: rect.top,
        left: rect.right + 8,
      });
    }
    setShowExportMenu((prev) => !prev);
  };

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

  // Close the export dropdown when clicking anywhere outside it. Checks
  // both the trigger button and the menu itself, since the menu is now
  // portaled onto document.body (see toggleExportMenu above) — it's no
  // longer a DOM descendant of the trigger, so a single ref/contains
  // check wouldn't cover clicks inside the open menu.
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = exportTriggerRef.current?.contains(target);
      const clickedMenu = exportMenuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  return (
    <header className="flex items-center justify-between px-2 sm:px-4 lg:px-6 py-2 sm:py-2.5 border-b border-white/10 bg-black/60 backdrop-blur-2xl text-xs sm:text-sm relative z-50 min-h-[48px] sm:min-h-[52px]">
      {/* Left side: Logo & Repo Badge */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
        <div 
          onClick={onNewAnalysis}
          className="flex items-center gap-2 font-bold text-sm sm:text-base text-white cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Image src="/icon.svg" alt="RepoMap Logo" width={22} height={22} className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          <span className="hidden sm:inline">RepoMap</span>
        </div>
        <div className="h-4 w-px bg-white/15" />
        <span className="text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/90 truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[220px]" title={repoUrl}>
          {repoName}
        </span>
      </div>

      {/* Center: AI Feature Tabs OR Repo URL Input Box with Smooth Animation */}
      <div className="flex-1 flex items-center justify-center max-w-[720px] mx-2 sm:mx-4 h-[36px] sm:h-[40px] relative">
        {/* Repo URL Input Box Container */}
        <div 
          className={`absolute inset-0 w-full h-[36px] sm:h-[40px] flex items-center group bg-[#141419]/90 hover:bg-[#18181f] focus-within:bg-[#18181f] border border-white/10 focus-within:border-white/30 rounded-full shadow-inner transition-all duration-300 ease-out ${
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
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 sm:h-8 flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-[10px] sm:text-[11px] font-medium rounded-full border border-white/15 cursor-pointer disabled:opacity-30 disabled:pointer-events-none shadow-sm transition-all"
            title="Analyze Repository"
          >
            <span>Analyze</span>
            <CornerDownLeft className="w-3 h-3 text-white/70" />
          </button>
        </div>

        {/* AI Feature Tabs Container */}
        <div 
          className={`absolute inset-0 w-full h-[36px] sm:h-[40px] flex items-center justify-between gap-0.5 sm:gap-1 bg-[#141419]/90 border border-white/10 p-0.5 sm:p-1 rounded-full shadow-inner overflow-x-auto lg:overflow-x-hidden no-scrollbar transition-all duration-300 ease-out ${
            !showInputBox 
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto z-20' 
              : 'opacity-0 scale-95 translate-y-1.5 pointer-events-none z-0'
          }`}
        >
          <button 
            onClick={onExplainRepo}
            disabled={showInputBox}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 h-full px-1 sm:px-1.5 lg:px-2 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeFeatureTab === 'explain'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20 font-semibold scale-105'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06] active:scale-95'
            }`}
          >
            <Sparkles className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform duration-200 ${activeFeatureTab === 'explain' ? 'text-white scale-110' : 'text-white/60'}`} />
            <span>Explain</span>
          </button>

          <button 
            onClick={() => onOpenAiTab('qa')}
            disabled={showInputBox}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 h-full px-1 sm:px-1.5 lg:px-2 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeFeatureTab === 'qa'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20 font-semibold scale-105'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06] active:scale-95'
            }`}
          >
            <Bot className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform duration-200 ${activeFeatureTab === 'qa' ? 'text-white scale-110' : 'text-white/60'}`} />
            <span>Ask</span>
          </button>

          <button 
            onClick={() => onOpenAiTab('planner')}
            disabled={showInputBox}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 h-full px-1 sm:px-1.5 lg:px-2 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeFeatureTab === 'planner'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20 font-semibold scale-105'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06] active:scale-95'
            }`}
          >
            <ListTodo className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform duration-200 ${activeFeatureTab === 'planner' ? 'text-white scale-110' : 'text-white/60'}`} />
            <span>Planner</span>
          </button>

          <button 
            onClick={onOpenOrchestrator}
            disabled={showInputBox}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 h-full px-1 sm:px-1.5 lg:px-2 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeFeatureTab === 'engine'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20 font-semibold scale-105'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06] active:scale-95'
            }`}
          >
            <Zap className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform duration-200 ${activeFeatureTab === 'engine' ? 'text-white scale-110' : 'text-white/60'}`} />
            <span>Engine</span>
          </button>

          <button 
            onClick={() => onOpenHealthTab('health')}
            disabled={showInputBox}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 h-full px-1 sm:px-1.5 lg:px-2 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeFeatureTab === 'health'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20 font-semibold scale-105'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06] active:scale-95'
            }`}
          >
            <Activity className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform duration-200 ${activeFeatureTab === 'health' ? 'text-white scale-110' : 'text-white/60'}`} />
            <span>Health</span>
          </button>

          <button 
            onClick={() => onOpenHealthTab('review')}
            disabled={showInputBox}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 h-full px-1 sm:px-1.5 lg:px-2 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeFeatureTab === 'hotspots'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20 font-semibold scale-105'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06] active:scale-95'
            }`}
          >
            <ShieldCheck className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform duration-200 ${activeFeatureTab === 'hotspots' ? 'text-white scale-110' : 'text-white/60'}`} />
            <span>Hotspots</span>
          </button>

          {/* Export dropdown: existing .drawio diagram export, plus new
              PNG/PDF graph image export (#26). Kept as one pill-shaped
              trigger (matching the row's existing button style) that
              opens a small menu below it, rather than adding separate
              buttons that would crowd this already-tight row. */}
          <div ref={exportTriggerRef} className="relative flex-1 h-full">
            <button 
              onClick={toggleExportMenu}
              disabled={isExportBusy || showInputBox}
              className="w-full flex items-center justify-center gap-1 sm:gap-1.5 h-full px-1 sm:px-1.5 lg:px-2 rounded-full text-[11px] sm:text-xs font-medium bg-white/[0.03] text-text-muted hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {isExportBusy ? (
                <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-white/60 shrink-0" />
              ) : (
                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/60 shrink-0" />
              )}
              <span>{isExportBusy ? "Exporting..." : "Export"}</span>
              {!isExportBusy && (
                <ChevronDown className={`w-3 h-3 text-white/40 shrink-0 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
              )}
            </button>

            {showExportMenu && !isExportBusy && exportMenuPosition && createPortal(
              <div
                ref={exportMenuRef}
                style={{ position: 'fixed', top: exportMenuPosition.top, left: exportMenuPosition.left }}
                className="w-56 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportImage('png');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <FileImage className="w-4 h-4 text-white/50 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium">Export as PNG</span>
                    <span className="text-[10px] text-white/40">High-res image of the graph</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportImage('pdf');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs text-white/90 hover:bg-white/10 transition-colors cursor-pointer border-t border-white/5"
                >
                  <FileText className="w-4 h-4 text-white/50 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium">Export as PDF</span>
                    <span className="text-[10px] text-white/40">For docs & presentations</span>
                  </div>
                </button>
                <div className="px-3.5 py-2.5 border-t border-white/5 flex items-start gap-2">
                  <span className="text-amber-400 text-xs leading-none mt-0.5">💡</span>
                  <span className="text-[11px] text-amber-300 leading-relaxed">
                    Tip: zoom in a little on the canvas before exporting for the clearest labels.
                  </span>
                </div>
              </div>,
              document.body
            )}
          </div>
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
            className="flex items-center gap-1 sm:gap-1.5 text-white font-medium bg-white/10 border border-white/15 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-white/15 hover:border-white/25 transition-all duration-200 active:scale-95 text-[11px] sm:text-xs shadow-sm cursor-pointer"
          >
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand" />
            <span>New Analysis</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default memo(HeaderComponent);