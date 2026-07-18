'use client'

import React, { useState, useMemo } from 'react';
import { Bot, Wand2, MessageSquare, ListTodo, Loader2, Sparkles, X, CheckCircle2, ArrowRight, Layers, FileCode, AlertCircle, HelpCircle, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { planTask, queryArchitecture } from '@/services/api';
import { getRepoAskQuicks, getRepoPlannerQuicks } from '@/utils/repoQuicks';
import DraggableCard from './DraggableCard';

interface AiAgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
  graph: any;
  initialTab?: 'qa' | 'planner';
  onSelectNode?: (nodeId: string) => void;
}

export default function AiAgentsModal({
  isOpen,
  onClose,
  repoId,
  graph,
  initialTab = 'qa',
  onSelectNode
}: AiAgentsModalProps) {
  const [activeTab, setActiveTab] = useState<'qa' | 'planner'>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Q&A State
  const [question, setQuestion] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState<any>(null);
  const [qaError, setQaError] = useState<string | null>(null);

  // Planner State
  const [prompt, setPrompt] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [planResult, setPlanResult] = useState<any>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const sampleQuestions = useMemo(() => getRepoAskQuicks(graph, repoId), [graph, repoId]);
  const samplePrompts = useMemo(() => getRepoPlannerQuicks(graph, repoId), [graph, repoId]);

  if (!isOpen) return null;

  const handleAskQuestion = async (qText?: string) => {
    const q = qText || question;
    if (!q.trim() || !repoId) return;
    setQuestion(q);
    setQaLoading(true);
    setQaError(null);
    try {
      const res = await queryArchitecture({ repoId, question: q, graph });
      if (res.error) {
        setQaError(res.error);
      } else {
        setQaResult(res.result);
      }
    } catch (err: any) {
      setQaError(err.message || 'Failed to query architecture agent.');
    } finally {
      setQaLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!prompt.trim() || !repoId) return;
    setPlanLoading(true);
    setPlanError(null);
    setCompletedSteps({});
    try {
      const res = await planTask({ repoId, prompt, graph });
      if (res.error) {
        setPlanError(res.error);
      } else {
        setPlanResult(res.plan);
      }
    } catch (err: any) {
      setPlanError(err.message || 'Failed to generate task plan.');
    } finally {
      setPlanLoading(false);
    }
  };

  const toggleStep = (idx: number) => {
    setCompletedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <DraggableCard isOpen={isOpen} onClose={onClose} widthClass="w-[92vw] sm:w-[580px] md:w-[620px] lg:w-[640px] xl:w-[680px]">
      {/* Content Area */}
      <div className="space-y-4 pt-1">
        
        {/* TAB 1: ARCHITECTURE Q&A */}
        {activeTab === 'qa' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Question Input Bar */}
            <div className="space-y-2.5">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                  placeholder="Ask a question about system architecture, paths, or data flow..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-xs text-white placeholder-text-muted focus:outline-none focus:border-white/30 focus:bg-white/[0.07] pr-24 transition-all"
                />
                <button
                  onClick={() => handleAskQuestion()}
                  disabled={qaLoading || !question.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {qaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Ask</span>
                </button>
              </div>

              {/* Sample chips */}
              <div className="flex flex-wrap gap-1.5 items-center pt-1">
                <span className="text-[11px] text-text-muted font-medium">Quick:</span>
                {sampleQuestions.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => handleAskQuestion(sq)}
                    className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-white px-2.5 py-1 rounded-md transition-all cursor-pointer truncate max-w-[280px]"
                    title={sq}
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {qaError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                <div>{qaError}</div>
              </div>
            )}

            {/* Loading - Clean & Minimal AI reasoning state without cards */}
            {qaLoading && (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-14 h-14 rounded-full bg-emerald-500/15 blur-xl animate-pulse pointer-events-none" />
                  <Bot className="w-7 h-7 text-emerald-400 animate-pulse relative z-10" />
                  <div className="absolute w-12 h-12 border border-emerald-500/20 rounded-full animate-[spin_4s_linear_infinite]" />
                </div>
                <div className="font-mono text-xs text-emerald-400/90 flex items-center gap-2">
                  <span>&gt; AI agent scanning code paths & synthesizing answer...</span>
                  <span className="w-1.5 h-3 bg-emerald-400 animate-pulse inline-block" />
                </div>
              </div>
            )}

            {/* Results */}
            {qaResult && !qaLoading && (
              <div className="space-y-4">
                {/* Answer Box */}
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <span className="text-xs font-medium text-white flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-white/80" />
                      <span>Analysis Answer</span>
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">Graph-Verified</span>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none text-gray-200 text-xs leading-relaxed font-sans">
                    <ReactMarkdown>{qaResult.answer}</ReactMarkdown>
                  </div>
                </div>

                {/* Traced Flow if present */}
                {qaResult.tracedFlow && qaResult.tracedFlow.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-white/70" />
                      <span>Execution Path ({qaResult.tracedFlow.length} steps)</span>
                    </h4>
                    <div className="divide-y divide-white/5 bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                      {qaResult.tracedFlow.map((step: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 text-xs hover:bg-white/[0.02] transition-colors">
                          <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center text-[10px] font-mono flex-shrink-0 mt-0.5">
                            {step.step}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white flex items-center justify-between">
                              <span className="font-mono text-white/90">{step.label}</span>
                              <span className="text-[10px] font-mono text-text-muted">{step.file}</span>
                            </div>
                            <p className="text-[11px] text-text-muted mt-0.5">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relevant Symbols */}
                {qaResult.relevantNodes && qaResult.relevantNodes.length > 0 && (
                  <div className="space-y-2 bg-white/[0.02] border border-white/10 rounded-xl p-3.5">
                    <h4 className="text-[11px] font-medium text-text-muted flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-white/70" />
                      <span>Discovered Symbols ({qaResult.relevantNodes.length}) — Click tag to highlight</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {qaResult.relevantNodes.map((rn: any) => (
                        <button
                          key={rn.id}
                          onClick={() => {
                            if (onSelectNode) {
                              onSelectNode(rn.id);
                              onClose();
                            }
                          }}
                          className="bg-white/5 hover:bg-white/15 border border-white/10 text-white text-[11px] px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span className="font-mono font-medium">{rn.label}</span>
                          <span className="text-[9px] text-text-muted bg-black/40 px-1 py-0.5 rounded border border-white/5">
                            {rn.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI TASK PLANNER */}
        {activeTab === 'planner' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Prompt Input Area */}
            <div className="space-y-2.5">
              <div className="relative bg-white/5 border border-white/10 rounded-xl focus-within:border-white/30 focus-within:bg-white/[0.07] transition-all p-3 pb-12">
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe a feature or refactoring goal you want to plan..."
                  className="w-full bg-transparent border-none text-xs text-white placeholder-text-muted focus:outline-none resize-none"
                />
                <button
                  onClick={handleGeneratePlan}
                  disabled={planLoading || !prompt.trim()}
                  className="absolute right-2.5 bottom-2.5 px-3.5 py-1.5 bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  {planLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  <span>Generate Plan</span>
                </button>
              </div>

              {/* Sample chips */}
              <div className="flex flex-wrap gap-1.5 items-center pt-1">
                <span className="text-[11px] text-text-muted font-medium">Quick:</span>
                {samplePrompts.map((sp, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(sp)}
                    className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-white px-2.5 py-1 rounded-md transition-all cursor-pointer truncate max-w-[280px]"
                    title={sp}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {planError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                <div>{planError}</div>
              </div>
            )}

            {/* Loading - Clean & Minimal AI planning state without cards */}
            {planLoading && (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-14 h-14 rounded-full bg-purple-500/15 blur-xl animate-pulse pointer-events-none" />
                  <Wand2 className="w-7 h-7 text-purple-400 animate-pulse relative z-10" />
                  <div className="absolute w-12 h-12 border border-purple-500/20 rounded-full animate-[spin_4s_linear_infinite]" />
                </div>
                <div className="font-mono text-xs text-purple-300/90 flex items-center gap-2">
                  <span>&gt; AI planner analyzing architectural blast radius & steps...</span>
                  <span className="w-1.5 h-3 bg-purple-400 animate-pulse inline-block" />
                </div>
              </div>
            )}

            {/* Results */}
            {planResult && !planLoading && (
              <div className="space-y-4">
                {/* Overview Card */}
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <span className="text-xs font-medium text-white flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-white/80" />
                      <span>Architectural Assessment</span>
                    </span>
                    <div className="prose prose-invert prose-sm max-w-none text-gray-200 text-xs leading-relaxed">
                      <ReactMarkdown>{planResult.understanding}</ReactMarkdown>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-1.5 flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
                    <span className="text-[10px] font-mono text-text-muted uppercase">Complexity</span>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/10 border border-white/15 text-white">
                      {planResult.complexityScore || 'Medium'}
                    </span>
                  </div>
                </div>

                {/* Step by Step Checklist */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <ListTodo className="w-3.5 h-3.5 text-white/80" />
                      <span>Checklist ({planResult.steps?.length || 0} steps)</span>
                    </span>
                    <span className="text-text-muted text-[11px]">Click to mark done</span>
                  </div>
                  <div className="divide-y divide-white/10 bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
                    {(planResult.steps || []).map((step: any, idx: number) => {
                      const isDone = completedSteps[idx];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleStep(idx)}
                          className={`p-3.5 sm:p-4 transition-all cursor-pointer flex items-start gap-3 ${
                            isDone
                              ? 'bg-black/20 opacity-60'
                              : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isDone ? 'bg-white border-white text-black' : 'border-white/30 bg-black/40'
                          }`}>
                            <CheckCircle className="w-3 h-3" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs text-white font-medium bg-black/40 px-2 py-0.5 rounded border border-white/10">
                                {step.file}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/90 border border-white/10">
                                {step.action}
                              </span>
                            </div>
                            <div className={`text-xs leading-relaxed ${isDone ? 'line-through text-text-muted' : 'text-gray-200'}`}>
                              <ReactMarkdown>{step.instruction}</ReactMarkdown>
                            </div>
                            {step.rationale && (
                              <p className="text-[11px] text-text-muted italic">
                                {step.rationale}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Technical Considerations */}
                {planResult.technicalConsiderations && planResult.technicalConsiderations.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-2">
                    <span className="text-xs font-medium text-white flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-white/80" />
                      <span>Technical Considerations</span>
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-text-muted leading-relaxed">
                      {planResult.technicalConsiderations.map((tc: string, i: number) => (
                        <li key={i}>{tc}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </DraggableCard>
  );
}
