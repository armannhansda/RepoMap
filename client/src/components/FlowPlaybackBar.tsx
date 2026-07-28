"use client";

import React, { useState } from "react";
import { FlowScenario, FlowStep } from "@/types/flowTypes";
import { 
  Play, Pause, SkipBack, SkipForward, RotateCcw, 
  Sparkles, Loader2, ChevronDown, Gauge, ListFilter 
} from "lucide-react";

interface Props {
  scenario: FlowScenario | null;
  presets: FlowScenario[];
  onSelectScenario: (scenario: FlowScenario) => void;
  onGenerateCustomFlow: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentStepIndex: number;
  onSeek: (stepIndex: number) => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  onReset: () => void;
}

export default function FlowPlaybackBar({
  scenario,
  presets,
  onSelectScenario,
  onGenerateCustomFlow,
  isGenerating,
  isPlaying,
  onTogglePlay,
  currentStepIndex,
  onSeek,
  speed,
  onChangeSpeed,
  onReset,
}: Props) {
  const [showPromptBox, setShowPromptBox] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showScenarioDropdown, setShowScenarioDropdown] = useState(false);

  const totalSteps = scenario?.steps?.length || 0;
  const hasSteps = totalSteps > 0;

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || isGenerating) return;
    await onGenerateCustomFlow(customPrompt.trim());
    setCustomPrompt("");
    setShowPromptBox(false);
  };

  return (
    <div className="w-full max-w-4xl flex flex-col justify-end gap-2 pointer-events-none">
      {/* Custom AI Flow Generator Prompt Popover */}
      {showPromptBox && (
        <form
          onSubmit={handleCustomSubmit}
          className="pointer-events-auto bg-[#141419]/95 backdrop-blur-2xl border border-emerald-500/40 p-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 ml-2 animate-pulse" />
          <input
            type="text"
            placeholder="Describe any workflow to simulate (e.g., 'Trace how user login credentials are validated and routed')..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            disabled={isGenerating}
            className="flex-1 bg-transparent border-none text-xs text-white placeholder:text-white/40 focus:outline-none px-2"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPromptBox(false)}
            className="text-white/50 hover:text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!customPrompt.trim() || isGenerating}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold text-xs px-4 py-1.5 rounded-xl shadow-lg transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            {isGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isGenerating ? "Tracing..." : "Simulate Flow"}</span>
          </button>
        </form>
      )}

      {/* Main Glassmorphism Controller Bar */}
      <div className="pointer-events-auto bg-[#141419] border border-white/10 px-4 py-2 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex items-center justify-between gap-3 transition-all">
        
        {/* Left: Scenario Selector & AI Prompt Toggle */}
        <div className="flex items-center gap-2 relative">
          <div className="relative">
            <button
              onClick={() => setShowScenarioDropdown(!showScenarioDropdown)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 px-3.5 py-1.5 rounded-full text-xs font-medium text-white transition-all max-w-[220px] sm:max-w-[280px] truncate"
            >
              <ListFilter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{scenario?.title || "Select Execution Flow..."}</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/60 shrink-0" />
            </button>

            {showScenarioDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#141419] border border-white/20 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/50 px-2.5 py-1">
                  Preset Workflows ({presets.length})
                </div>
                {presets.length === 0 ? (
                  <div className="text-xs text-white/40 px-2.5 py-2">No preset flows available. Try generating one!</div>
                ) : (
                  presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onSelectScenario(preset);
                        setShowScenarioDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex flex-col gap-0.5 ${
                        scenario?.id === preset.id
                          ? "bg-emerald-500/20 text-white border border-emerald-500/40 font-semibold"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="truncate font-medium">{preset.title}</div>
                      <div className="text-[10px] text-white/50 truncate font-mono">{preset.steps.length} steps</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowPromptBox(!showPromptBox)}
            disabled={isGenerating}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ask AI</span>
          </button>
        </div>

        {/* Center: Playback Controls (Video Player style) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSeek(Math.max(-1, currentStepIndex - 1))}
            disabled={!hasSteps || currentStepIndex <= -1}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Previous Step"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            disabled={!hasSteps}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-lg cursor-pointer disabled:opacity-30 disabled:pointer-events-none
              ${
                isPlaying
                  ? "bg-amber-500 hover:bg-amber-400 text-black ring-2 ring-amber-400/40"
                  : "bg-emerald-500 hover:bg-emerald-400 text-black ring-2 ring-emerald-400/40 pl-0.5"
              }
            `}
            title={isPlaying ? "Pause Flow" : "Play Flow"}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black" />}
          </button>

          <button
            onClick={() => onSeek(Math.min(totalSteps - 1, currentStepIndex + 1))}
            disabled={!hasSteps || currentStepIndex >= totalSteps - 1}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Next Step"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={onReset}
            disabled={!hasSteps && currentStepIndex === -1}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all ml-1"
            title="Reset to Start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Timeline Scrubber Slider & Speed Selector */}
        <div className="flex items-center gap-4 flex-1 min-w-[200px] justify-end">
          {/* Scrubbable Step Timeline */}
          <div className="flex items-center gap-2.5 flex-1 max-w-[240px]">
            <span className="text-[11px] font-mono text-white/60 whitespace-nowrap min-w-[55px] text-right">
              {currentStepIndex + 1} / {totalSteps}
            </span>
            <input
              type="range"
              min={-1}
              max={Math.max(0, totalSteps - 1)}
              value={currentStepIndex}
              onChange={(e) => onSeek(parseInt(e.target.value, 10))}
              disabled={!hasSteps}
              className="w-full accent-emerald-400 bg-white/10 rounded-lg h-1.5 cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Speed Selector Toggle */}
          <button
            onClick={() => {
              const nextSpeed = speed === 1 ? 2 : speed === 2 ? 0.5 : 1;
              onChangeSpeed(nextSpeed);
            }}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold text-emerald-300 transition-all min-w-[56px] justify-center"
            title="Toggle Playback Speed"
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>{speed}x</span>
          </button>
        </div>

      </div>
    </div>
  );
}
