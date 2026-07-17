'use client'

import React, { useState } from 'react';
import { Bot, Sparkles, Loader2, CheckCircle2, AlertTriangle, X, ArrowRight, Layers, Cpu, ShieldAlert, FileCode, Play, Terminal, Clock, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { runOrchestrationApi } from '@/services/api';
import DraggableCard from './DraggableCard';

interface MultiAgentOrchestratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
  graph: any;
  onSelectNode?: (nodeId: string) => void;
}

export default function MultiAgentOrchestratorModal({
  isOpen,
  onClose,
  repoId,
  graph,
  onSelectNode
}: MultiAgentOrchestratorModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunOrchestrator = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || !repoId) return;

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await runOrchestrationApi({
        repoId,
        prompt: prompt.trim(),
        graph
      });
      if (res.error) {
        setError(res.error);
      } else {
        setReport(res.report);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute multi-agent orchestration.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    "Plan a refactor of our database layer and verify blast radius across controllers",
    "Audit authentication and session handling for security issues",
    "Trace and decouple circular dependencies in core services"
  ];

  const getAgentIcon = (name: string) => {
    switch (name) {
      case "Planner Agent":
        return <Layers className="w-4 h-4 text-purple-400" />;
      case "Graph Search Agent":
        return <FileCode className="w-4 h-4 text-blue-400" />;
      case "Impact & Risk Simulator":
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      default:
        return <Cpu className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <DraggableCard isOpen={isOpen} onClose={onClose} widthClass="w-[680px]">
      {/* Input Bar */}
      <form onSubmit={handleRunOrchestrator} className="space-y-2.5 pt-1">
        <div className="relative flex items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask the multi-agent team (e.g. 'Plan a refactor of user auth and verify blast radius')..."
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 pr-28 text-xs text-white placeholder-text-muted focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all disabled:opacity-50 font-sans"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Execute</span>
              </>
            )}
          </button>
        </div>

        {/* Quick suggestions */}
        {!loading && !report && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] text-text-muted font-medium">Quick:</span>
            {sampleQueries.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPrompt(q)}
                className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-white px-2.5 py-1 rounded-md transition-all cursor-pointer truncate max-w-[240px]"
                title={q}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Content Body */}
      <div className="space-y-4 pt-4">
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="p-5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between shadow-inner">
                <div className="space-y-2">
                  <div className="h-4 bg-purple-300/20 rounded w-48" />
                  <div className="h-3 bg-purple-300/15 rounded w-64" />
                </div>
                <div className="h-8 w-24 bg-purple-400/20 rounded-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Planner Agent', 'Graph Search Agent', 'Impact Simulator'].map((agentName, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/10" />
                      <div className="h-4 bg-white/15 rounded w-28" />
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="h-2.5 bg-white/10 rounded w-full" />
                      <div className="h-2.5 bg-white/10 rounded w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
              <div>{error}</div>
            </div>
          )}

          {report && !loading && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Intent & Timing Overview */}
              <div className="bg-gradient-to-r from-purple-500/10 via-white/5 to-indigo-500/10 border border-purple-500/25 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-inner">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30 font-bold">
                      {report.intent}
                    </span>
                    <h3 className="text-sm font-bold text-white truncate max-w-md">
                      "{report.prompt}"
                    </h3>
                  </div>
                  <p className="text-xs text-gray-300 flex items-center gap-3">
                    <span>Discovered <strong className="text-white">{report.discoveredSymbols?.length || 0}</strong> core AST symbols</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-text-muted">
                      <Clock className="w-3 h-3" />
                      {report.totalExecutionTimeMs}ms total execution
                    </span>
                  </p>
                </div>
              </div>

              {/* Step-by-Step Agent Execution Pipeline Trace */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span>Agent Execution Pipeline Trace ({report.steps?.length || 0} Steps)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {(report.steps || []).map((step: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 hover:border-purple-400/40 transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          {getAgentIcon(step.agentName)}
                          <span>{step.agentName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-text-muted">{step.executionTimeMs}ms</span>
                          {step.status === "warning" ? (
                            <span className="p-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">Warning</span>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-purple-200">{step.title}</div>
                      <p className="text-xs text-text-muted leading-relaxed">{step.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discovered AST Symbols & Blast Radius */}
              {report.discoveredSymbols && report.discoveredSymbols.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-blue-400" />
                      <span>Targeted AST Graph Symbols ({report.discoveredSymbols.length})</span>
                    </h4>
                    <span className="text-xs text-text-muted">Click symbol to highlight on live graph canvas</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {report.discoveredSymbols.map((ds: any) => (
                      <div
                        key={ds.id}
                        onClick={() => {
                          if (onSelectNode) {
                            onSelectNode(ds.id);
                            onClose();
                          }
                        }}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-white font-bold truncate group-hover:text-purple-300 transition-colors">
                            {ds.label}
                          </div>
                          <div className="text-[11px] text-text-muted font-mono truncate">
                            {ds.file} ({ds.type})
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex-shrink-0 ${
                          ds.riskScore >= 75
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : ds.riskScore >= 40
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                          Risk: {ds.riskScore}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Synthesized Authoritative Report */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Synthesized Architectural Roadmap & Safety Mitigations</span>
                </h4>
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-xs text-gray-200 leading-relaxed prose prose-invert prose-xs max-w-none shadow-inner">
                  <ReactMarkdown>{report.finalSynthesis}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {!report && !loading && !error && (
            <div className="py-12 text-center space-y-3 text-text-muted max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-purple-400">
                <Bot className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">Enter a task to initiate the multi-agent workflow</p>
              <p className="text-xs leading-relaxed">
                The Planner decomposes requirements, Graph Search indexes exact AST connections, and the Impact Simulator quantifies blast radius risk before any code is modified.
              </p>
            </div>
          )}
        </div>
    </DraggableCard>
  );
}
