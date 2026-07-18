'use client'

import React, { useState, useMemo } from 'react';
import { Activity, Sparkles, Loader2, CheckCircle2, AlertTriangle, X, ArrowRight, Layers, Cpu, ShieldAlert, FileCode, Play, Terminal, Clock, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { runOrchestrationApi } from '@/services/api';
import { getRepoAgentQuicks } from '@/utils/repoQuicks';
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

  const sampleQueries = useMemo(() => getRepoAgentQuicks(graph, repoId), [graph, repoId]);

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

  const getAgentIcon = (name: string) => {
    switch (name) {
      case "Planner Agent":
        return <Layers className="w-3.5 h-3.5 text-purple-400" />;
      case "Graph Search Agent":
        return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
      case "Impact & Risk Simulator":
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <DraggableCard isOpen={isOpen} onClose={onClose} widthClass="w-[92vw] sm:w-[580px] md:w-[620px] lg:w-[640px] xl:w-[680px]">
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
                className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-white px-2.5 py-1 rounded-md transition-all cursor-pointer truncate max-w-[280px]"
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
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-14 h-14 rounded-full bg-purple-500/10 blur-xl animate-pulse pointer-events-none" />
                <Activity className="w-7 h-7 text-purple-400 animate-pulse relative z-10" />
                <div className="absolute w-12 h-12 border border-purple-500/25 rounded-full animate-[spin_4s_linear_infinite]" />
              </div>
              <div className="font-mono text-xs text-purple-300 flex items-center gap-2">
                <span>&gt; Orchestrating multi-agent graph search & impact simulation...</span>
                <span className="w-1.5 h-3 bg-purple-400 animate-pulse inline-block" />
              </div>
              <div className="text-[11px] font-mono text-gray-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                <span>Coordinating Planner, Search, and Simulator agents</span>
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
              {/* Minimal Header Overview (No Card Box, with Intent Color Badge) */}
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-400/30 font-bold shrink-0">
                      {report.intent}
                    </span>
                    <h3 className="text-sm font-semibold text-white truncate">
                      "{report.prompt}"
                    </h3>
                  </div>
                  <div className="text-xs text-text-muted flex items-center gap-3">
                    <span>Discovered <strong className="text-purple-300 font-mono">{report.discoveredSymbols?.length || 0}</strong> core AST symbols</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-purple-400/70" />
                      {report.totalExecutionTimeMs}ms total
                    </span>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Pipeline Trace (Clean Flat List with Agent Accents) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-white flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-purple-400" />
                    <span>Agent Execution Pipeline ({report.steps?.length || 0} steps)</span>
                  </div>
                </div>
                <div className="divide-y divide-white/10">
                  {(report.steps || []).map((step: any, idx: number) => (
                    <div key={idx} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 text-xs font-medium text-white">
                          {getAgentIcon(step.agentName)}
                          <span>{step.agentName}</span>
                          <span className="text-text-muted text-[11px] font-normal">— {step.title}</span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed">{step.summary}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
                        <span className="text-text-muted">{step.executionTimeMs}ms</span>
                        {step.status === "warning" ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">Warning</span>
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discovered AST Symbols (Clean Flat List with Risk Badges) */}
              {report.discoveredSymbols && report.discoveredSymbols.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <div className="flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-blue-400" />
                      <span>Targeted AST Symbols ({report.discoveredSymbols.length})</span>
                    </div>
                    <span className="text-text-muted font-normal text-[11px]">Click symbol to jump in graph</span>
                  </div>
                  <div className="divide-y divide-white/10 max-h-48 overflow-y-auto pr-1">
                    {report.discoveredSymbols.map((ds: any) => (
                      <div
                        key={ds.id}
                        onClick={() => {
                          if (onSelectNode) {
                            onSelectNode(ds.id);
                            onClose();
                          }
                        }}
                        className="py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors cursor-pointer group px-1"
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                            {ds.label}
                          </div>
                          <div className="text-[11px] text-text-muted font-mono truncate">
                            {ds.file} ({ds.type})
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex-shrink-0 ${
                          ds.riskScore >= 75
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : ds.riskScore >= 40
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}>
                          Risk: {ds.riskScore}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Synthesized Authoritative Report (No Card Container) */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5 pt-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Synthesized Architectural Roadmap & Mitigations</span>
                </div>
                <div className="text-xs text-gray-300 leading-relaxed prose prose-invert prose-xs max-w-none pt-1">
                  <ReactMarkdown>{report.finalSynthesis}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {!report && !loading && !error && (
            <div className="py-12 text-center space-y-3 text-text-muted max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-300">
                <Terminal className="w-6 h-6" />
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
