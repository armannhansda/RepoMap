'use client'

import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, GitBranch, Flame, X, Loader2, CheckCircle2, AlertCircle, AlertTriangle, FileCode, Award, Layers, Cpu, Lock, BookOpen, CheckSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { calculateHealthScoreApi, performCodeReviewApi } from '@/services/api';
import DraggableCard from './DraggableCard';

interface HealthDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
  graph: any;
  initialTab?: 'health' | 'review' | 'git';
  onSelectNode?: (nodeId: string) => void;
}

export default function HealthDashboardModal({
  isOpen,
  onClose,
  repoId,
  graph,
  initialTab = 'health',
  onSelectNode
}: HealthDashboardModalProps) {
  const [activeTab, setActiveTab] = useState<'health' | 'review' | 'git'>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Health State
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Review State
  const [reviewData, setReviewData] = useState<any>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [selectedReviewNode, setSelectedReviewNode] = useState<string | null>(null);

  // Git State
  const [gitData, setGitData] = useState<any>(null);
  const [gitLoading, setGitLoading] = useState(false);
  const [gitError, setGitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !repoId) return;

    if (activeTab === 'health' && !healthData && !healthLoading) {
      handleCalculateHealth();
    } else if ((activeTab === 'review' || activeTab === 'git') && !reviewData && !reviewLoading) {
      handleCalculateReview();
    }
  }, [isOpen, activeTab, repoId]);

  const handleCalculateHealth = async () => {
    if (!repoId) return;
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await calculateHealthScoreApi({ repoId, graph });
      if (res.error) {
        setHealthError(res.error);
      } else {
        setHealthData(res.dashboard || res.report);
      }
    } catch (err: any) {
      setHealthError(err.message || 'Failed to calculate repository health.');
    } finally {
      setHealthLoading(false);
    }
  };

  const handleCalculateReview = async () => {
    if (!repoId) return;
    setReviewLoading(true);
    setReviewError(null);
    try {
      const res = await performCodeReviewApi({ repoId, graph });
      if (res.error) {
        setReviewError(res.error);
      } else {
        setReviewData(res.report);
      }
    } catch (err: any) {
      setReviewError(err.message || 'Failed to perform AI code review.');
    } finally {
      setReviewLoading(false);
    }
  };

  if (!isOpen) return null;

  const getGradeBadge = (grade?: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'B':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'C':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  const getMetricAttentionStyle = (score?: number, grade?: string) => {
    if (typeof score === 'number' && score < 60 || grade === 'D' || grade === 'F') {
      return {
        card: 'bg-rose-500/[0.03] border-l-2 border-rose-500/60 text-white hover:bg-rose-500/[0.06]',
        badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
        text: 'text-rose-200',
        needsAttention: true,
        label: 'Critical'
      };
    }
    if (typeof score === 'number' && score < 75 || grade === 'C') {
      return {
        card: 'bg-amber-500/[0.03] border-l-2 border-amber-500/50 text-white hover:bg-amber-500/[0.05]',
        badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
        text: 'text-amber-200',
        needsAttention: true,
        label: 'Attention'
      };
    }
    return {
      card: 'hover:bg-white/[0.02] text-white',
      badge: getGradeBadge(grade),
      text: 'text-text-muted',
      needsAttention: false,
      label: null
    };
  };

  const getDebtBadge = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'High':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
  };

  const getDebtCardStyle = (risk: string) => {
    if (risk === 'Critical') return 'bg-rose-500/[0.03] hover:bg-rose-500/[0.06] border-l-2 border-rose-500/50';
    if (risk === 'High') return 'bg-amber-500/[0.02] hover:bg-amber-500/[0.05] border-l-2 border-amber-500/40';
    return 'hover:bg-white/[0.02]';
  };

  return (
    <DraggableCard isOpen={isOpen} onClose={onClose} widthClass="w-[92vw] sm:w-[600px] md:w-[640px] lg:w-[680px] xl:w-[740px]">
      <div className="space-y-4 pt-1">
          
          {/* TAB 1: HEALTH DASHBOARD */}
          {activeTab === 'health' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {healthLoading && !healthData ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-14 h-14 rounded-full bg-emerald-500/10 blur-xl animate-pulse pointer-events-none" />
                    <Activity className="w-7 h-7 text-emerald-400 animate-pulse relative z-10" />
                    <div className="absolute w-12 h-12 border border-emerald-500/25 rounded-full animate-[spin_4s_linear_infinite]" />
                  </div>
                  <div className="font-mono text-xs text-emerald-300 flex items-center gap-2">
                    <span>&gt; AI agent auditing repository health metrics & dependencies...</span>
                    <span className="w-1.5 h-3 bg-emerald-400 animate-pulse inline-block" />
                  </div>
                </div>
              ) : healthError ? (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                  <div>{healthError}</div>
                </div>
              ) : healthData ? (
                <div className="space-y-5">
                  {/* Minimal Header */}
                  <div className="border-b border-white/10 pb-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        <Activity className="w-4 h-4 text-white/80" />
                        <span>Repository Health Overview</span>
                      </h3>
                      <p className="text-xs text-text-muted leading-relaxed max-w-md">
                        Weighted evaluation combining architecture, test suites, documentation, and maintainability.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-white">{healthData.overallScore} / 100</div>
                        <div className="text-[11px] font-mono text-text-muted uppercase">Grade {healthData.overallGrade}</div>
                      </div>
                      <button
                        onClick={handleCalculateHealth}
                        disabled={healthLoading}
                        className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/10 text-white text-xs font-medium rounded-lg border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {healthLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>

                  {/* 6 Metrics List (Minimal & Flat - No Individual Cards) */}
                  <div className="divide-y divide-white/10 bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
                    {/* Architecture */}
                    {(() => {
                      const style = getMetricAttentionStyle(healthData.metrics?.architecture?.score, healthData.metrics?.architecture?.grade);
                      return (
                        <div className={`p-3.5 sm:p-4 space-y-1 transition-colors ${style.needsAttention ? style.card : 'hover:bg-white/[0.02]'}`}>
                          <div className="flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-2">
                              <Layers className="w-3.5 h-3.5 opacity-80" />
                              <span>Architecture & Coupling</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              {style.needsAttention && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${style.badge}`}>
                                  {style.label}
                                </span>
                              )}
                              <span className="opacity-80 font-bold">{healthData.metrics?.architecture?.score}/100</span>
                            </div>
                          </div>
                          <p className={`text-xs ${style.text}`}>{healthData.metrics?.architecture?.summary}</p>
                        </div>
                      );
                    })()}

                    {/* Documentation */}
                    {(() => {
                      const style = getMetricAttentionStyle(healthData.metrics?.documentation?.score, healthData.metrics?.documentation?.grade);
                      return (
                        <div className={`p-3.5 sm:p-4 space-y-1 transition-colors ${style.needsAttention ? style.card : 'hover:bg-white/[0.02]'}`}>
                          <div className="flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5 opacity-80" />
                              <span>Documentation Coverage</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              {style.needsAttention && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${style.badge}`}>
                                  {style.label}
                                </span>
                              )}
                              <span className="opacity-80 font-bold">{healthData.metrics?.documentation?.score}/100</span>
                            </div>
                          </div>
                          <p className={`text-xs ${style.text}`}>{healthData.metrics?.documentation?.summary}</p>
                        </div>
                      );
                    })()}

                    {/* Testing */}
                    {(() => {
                      const style = getMetricAttentionStyle(healthData.metrics?.testing?.score, healthData.metrics?.testing?.grade);
                      return (
                        <div className={`p-3.5 sm:p-4 space-y-1 transition-colors ${style.needsAttention ? style.card : 'hover:bg-white/[0.02]'}`}>
                          <div className="flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-2">
                              <CheckSquare className="w-3.5 h-3.5 opacity-80" />
                              <span>Test Suites & Spec Presence</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              {style.needsAttention && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${style.badge}`}>
                                  {style.label}
                                </span>
                              )}
                              <span className="opacity-80 font-bold">{healthData.metrics?.testing?.score}/100</span>
                            </div>
                          </div>
                          <p className={`text-xs ${style.text}`}>{healthData.metrics?.testing?.summary}</p>
                        </div>
                      );
                    })()}

                    {/* Maintainability */}
                    {(() => {
                      const style = getMetricAttentionStyle(healthData.metrics?.maintainability?.score, healthData.metrics?.maintainability?.grade);
                      return (
                        <div className={`p-3.5 sm:p-4 space-y-1 transition-colors ${style.needsAttention ? style.card : 'hover:bg-white/[0.02]'}`}>
                          <div className="flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-2">
                              <Cpu className="w-3.5 h-3.5 opacity-80" />
                              <span>Maintainability & Length</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              {style.needsAttention && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${style.badge}`}>
                                  {style.label}
                                </span>
                              )}
                              <span className="opacity-80 font-bold">{healthData.metrics?.maintainability?.score}/100</span>
                            </div>
                          </div>
                          <p className={`text-xs ${style.text}`}>{healthData.metrics?.maintainability?.summary}</p>
                        </div>
                      );
                    })()}

                    {/* Security */}
                    {(() => {
                      const style = getMetricAttentionStyle(healthData.metrics?.security?.score, healthData.metrics?.security?.grade);
                      return (
                        <div className={`p-3.5 sm:p-4 space-y-1 transition-colors ${style.needsAttention ? style.card : 'hover:bg-white/[0.02]'}`}>
                          <div className="flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-2">
                              <Lock className="w-3.5 h-3.5 opacity-80" />
                              <span>Security & Safe Patterns</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              {style.needsAttention && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${style.badge}`}>
                                  {style.label}
                                </span>
                              )}
                              <span className="opacity-80 font-bold">{healthData.metrics?.security?.score}/100</span>
                            </div>
                          </div>
                          <p className={`text-xs ${style.text}`}>{healthData.metrics?.security?.summary}</p>
                        </div>
                      );
                    })()}

                    {/* Performance */}
                    {(() => {
                      const style = getMetricAttentionStyle(healthData.metrics?.performance?.score, healthData.metrics?.performance?.grade);
                      return (
                        <div className={`p-3.5 sm:p-4 space-y-1 transition-colors ${style.needsAttention ? style.card : 'hover:bg-white/[0.02]'}`}>
                          <div className="flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-2">
                              <Activity className="w-3.5 h-3.5 opacity-80" />
                              <span>Performance & Async I/O</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              {style.needsAttention && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${style.badge}`}>
                                  {style.label}
                                </span>
                              )}
                              <span className="opacity-80 font-bold">{healthData.metrics?.performance?.score}/100</span>
                            </div>
                          </div>
                          <p className={`text-xs ${style.text}`}>{healthData.metrics?.performance?.summary}</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: AI CODE REVIEW & HOTSPOTS */}
          {activeTab === 'review' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {reviewLoading && !reviewData ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-14 h-14 rounded-full bg-blue-500/10 blur-xl animate-pulse pointer-events-none" />
                    <ShieldCheck className="w-7 h-7 text-blue-400 animate-pulse relative z-10" />
                    <div className="absolute w-12 h-12 border border-blue-500/25 rounded-full animate-[spin_4s_linear_infinite]" />
                  </div>
                  <div className="font-mono text-xs text-blue-300 flex items-center gap-2">
                    <span>&gt; AI code review agent inspecting complexity & architectural hotspots...</span>
                    <span className="w-1.5 h-3 bg-blue-400 animate-pulse inline-block" />
                  </div>
                </div>
              ) : reviewError ? (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                  <div>{reviewError}</div>
                </div>
              ) : reviewData ? (
                <div className="space-y-5">
                  {/* Minimal Header */}
                  <div className="border-b border-white/10 pb-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-white/80" />
                        <span>Code Quality & Hotspots Assessment</span>
                      </h3>
                      <p className="text-xs text-text-muted leading-relaxed max-w-md">
                        Detected {reviewData.deadCodeCount} unreferenced symbols and {reviewData.codeSmells?.length || 0} coupling smells.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-white">{reviewData.overallQualityGrade} Grade</div>
                        <div className="text-[11px] font-mono text-text-muted">Assessment</div>
                      </div>
                    </div>
                  </div>

                  {/* AI SOLID Recommendations (Clean & Quiet) */}
                  {reviewData.solidRecommendations && reviewData.solidRecommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-white/70" />
                        <span>Key Architectural Recommendations</span>
                      </h4>
                      <div className="divide-y divide-white/5 bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden">
                        {reviewData.solidRecommendations.map((rec: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs p-3 text-text-muted hover:bg-white/[0.02] transition-colors">
                            <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-mono flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed text-gray-300">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dead Code Table (Minimal Differentiated Attention) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Unreferenced Symbols ({reviewData.deadCodeNodes?.length || 0})</span>
                      </div>
                      <span className="text-text-muted font-normal text-[11px]">Click symbol to jump in graph</span>
                    </div>
                    {reviewData.deadCodeNodes && reviewData.deadCodeNodes.length > 0 ? (
                      <div className="divide-y divide-white/10 bg-white/[0.02] border border-white/10 rounded-xl max-h-56 overflow-y-auto pr-1 no-scrollbar">
                        {reviewData.deadCodeNodes.map((dn: any) => (
                          <div
                            key={dn.id}
                            onClick={() => {
                              if (onSelectNode) {
                                onSelectNode(dn.id);
                                onClose();
                              }
                            }}
                            className="p-3 hover:bg-white/[0.04] flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileCode className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="font-mono text-xs text-white font-medium truncate group-hover:text-amber-300 transition-colors">
                                  {dn.label}
                                </div>
                                <div className="text-[11px] text-text-muted font-mono truncate">
                                  {dn.file}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                              {dn.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-white/[0.01] border border-white/5 rounded-lg text-center text-xs text-text-muted">
                        Zero unreferenced functions found across active code.
                      </div>
                    )}
                  </div>

                  {/* Code Smells Table (Minimal Differentiated Critical Attention) */}
                  {reviewData.codeSmells && reviewData.codeSmells.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Coupling & Architectural Smells ({reviewData.codeSmells.length})</span>
                      </h4>
                      <div className="divide-y divide-white/10 bg-white/[0.02] border border-white/10 rounded-xl max-h-56 overflow-y-auto pr-1 no-scrollbar">
                        {reviewData.codeSmells.map((cs: any) => (
                          <div
                            key={cs.id}
                            onClick={() => {
                              if (onSelectNode) {
                                onSelectNode(cs.id);
                                onClose();
                              }
                            }}
                            className="p-3 hover:bg-white/[0.04] space-y-1 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-medium text-white group-hover:text-rose-300 transition-colors truncate">
                                {cs.label} <span className="text-text-muted text-[11px] font-normal">({cs.file})</span>
                              </span>
                              <span className="text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                                {cs.issue}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-300 leading-relaxed">{cs.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 3: GIT INTELLIGENCE & CHURN HOTSPOTS */}
          {activeTab === 'git' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {healthLoading && !healthData ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-14 h-14 rounded-full bg-amber-500/10 blur-xl animate-pulse pointer-events-none" />
                    <Activity className="w-7 h-7 text-amber-400 animate-pulse relative z-10" />
                    <div className="absolute w-12 h-12 border border-amber-500/25 rounded-full animate-[spin_4s_linear_infinite]" />
                  </div>
                  <div className="font-mono text-xs text-amber-300 flex items-center gap-2">
                    <span>&gt; AI agent analyzing commit churn & technical debt hotspots...</span>
                    <span className="w-1.5 h-3 bg-amber-400 animate-pulse inline-block" />
                  </div>
                </div>
              ) : healthData?.gitIntelligence ? (
                <div className="space-y-6">
                  {/* Overview Card */}
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-inner">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-semibold text-white tracking-tight">
                          Git Intelligence & Technical Debt Map
                        </h3>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">
                        Analyzed {healthData.gitIntelligence.totalCommitsAnalyzed} recent commits across repository history to identify files with high churn and structural complexity.
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-amber-500/15 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-500/30 font-semibold flex-shrink-0">
                      {healthData.gitIntelligence.topHotspots?.length || 0} Hotspots Tracked
                    </span>
                  </div>

                  {/* Hotspots Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-amber-400" />
                        <span>Top Code Churn Hotspots & Debt Risk</span>
                      </h4>
                      <span className="text-text-muted text-xs">Files with high modification frequency should be prioritized for refactoring</span>
                    </div>
                    <div className="divide-y divide-white/10 bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden pt-0.5">
                      {(healthData.gitIntelligence.topHotspots || []).map((hs: any, idx: number) => {
                        const debtCard = getDebtCardStyle(hs.debtRisk);
                        return (
                          <div
                            key={idx}
                            className={`p-3.5 sm:p-4 flex items-center justify-between gap-4 transition-colors ${debtCard}`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-mono text-xs text-white font-bold truncate">
                                  {hs.file}
                                </div>
                                <div className="text-[11px] text-text-muted flex items-center gap-3 mt-0.5">
                                  <span>Commits / Modifications: <strong className="text-gray-200 font-mono">{hs.commits}</strong></span>
                                  <span>•</span>
                                  <span>Complexity: <strong className="text-gray-200">{hs.complexityScore}</strong></span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold border ${getDebtBadge(hs.debtRisk)}`}>
                                {hs.debtRisk} Debt Risk
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

        </div>
    </DraggableCard>
  );
}
