"use client";

import React from "react";
import { FlowStep } from "@/types/flowTypes";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Zap, ArrowRight, Code2, Box, X } from "lucide-react";

interface Props {
  step: FlowStep | null;
  totalSteps: number;
  onClose?: () => void;
}

export default function FlowStepInspector({ step, totalSteps, onClose }: Props) {
  if (!step) return null;

  return (
    <div className="absolute right-4 top-16 z-40 w-80 sm:w-96 bg-[#141419]/95 backdrop-blur-2xl border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right duration-300 flex flex-col max-h-[82vh]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border-b border-emerald-500/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold shadow">
            {step.stepIndex + 1}
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/80 block">
              Execution Step {step.stepIndex + 1} of {totalSteps}
            </span>
            <h4 className="font-semibold text-white text-sm truncate max-w-[200px]" title={step.label}>
              {step.label}
            </h4>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs">
        {/* Node Transition Path */}
        <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-2 font-mono">
          <div className="text-[10px] uppercase text-white/50 tracking-wider">Flow Path</div>
          <div className="flex items-center gap-2 text-white/90">
            <span className="truncate bg-white/5 border border-white/10 px-2 py-1 rounded max-w-[120px] text-[11px]" title={step.fromNodeId}>
              {step.fromNodeId}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-1 rounded max-w-[120px] text-[11px]" title={step.toNodeId}>
              {step.toNodeId}
            </span>
          </div>
        </div>

        {/* Explanation / Description */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-white/80 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Step Details & Action</span>
          </div>
          <p className="text-white/70 leading-relaxed bg-white/[0.03] p-3 rounded-xl border border-white/5">
            {step.description}
          </p>
        </div>

        {/* Simulated Payload / Data Example */}
        {step.payloadExample && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-white/80 flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-blue-400" />
              <span>Passed Payload / Arguments</span>
            </div>
            <pre className="bg-black/70 border border-white/10 rounded-xl p-3 font-mono text-[11px] text-blue-300 overflow-x-auto">
              {typeof step.payloadExample === "string"
                ? step.payloadExample
                : JSON.stringify(step.payloadExample, null, 2)}
            </pre>
          </div>
        )}

        {/* Code Snippet Preview */}
        {step.codeSnippet && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-white/80 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Associated Code</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg text-[11px]">
              <SyntaxHighlighter
                language="typescript"
                style={oneDark}
                customStyle={{ margin: 0, padding: "12px", background: "#0d0d12" }}
              >
                {step.codeSnippet}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
