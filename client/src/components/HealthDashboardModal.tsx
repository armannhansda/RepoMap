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
        card: 'bg-rose-500/[0.07] border border-rose-500/35 text-rose-100 hover:border-rose-500/50',
        badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
        text: 'text-rose-200',
        needsAttention: true,
        label: 'Critical Attention'
      };
    }
    if (typeof score === 'number' && score < 75 || grade === 'C') {
      return {
        card: 'bg-amber-500/[0.06] border border-amber-500/35 text-amber-100 hover:border-amber-500/50',
        badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
        text: 'text-amber-200',
        needsAttention: true,
        label: 'Needs Attention'
      };
    }
    return {
      card: 'bg-white/[0.02] border border-white/5 text-white hover:border-white/15',
      badge: getGradeBadge(grade),
      text: 'text-text-muted',
      needsAttention: false,
      label: null
    };
  };

  const getDebtBadge = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'High':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const getDebtCardStyle = (risk: string) => {
    if (risk === 'Critical') return 'bg-rose-500/[0.07] border-rose-500/35 hover:border-rose-500/50';
    if (risk === 'High') return 'bg-amber-500/[0.06] border-amber-500/35 hover:border-amber-500/50';
    return 'bg-white/[0.02] border-white/5 hover:border-white/15';
  };

  return (
    <DraggableCard isOpen={isOpen} onClose={onClose} widthClass="w-[740px]">
      <div className="space-y-4 pt-1">
          
          {/* TAB 1: HEALTH DASHBOARD */}
          {activeTab === 'health' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {healthLoading && !healthData ? (
                <div className="space-y-4 animate-pulse">
                  <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-3 shadow-inner">
                    <div className="h-4 bg-white/15 rounded-md w-1/3" />
                    <div className="h-3 bg-white/10 rounded-md w-2/3" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((item) => (
                      <div key={item} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2 shadow-sm">
                        <div className="h-3 bg-white/10 rounded w-16" />
                        <div className="h-6 bg-white/15 rounded w-12" />
                      </div>
                    ))}
                  </div>
                  <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="h-4 bg-white/15 rounded w-36" />
                    <div className="space-y-2">
                      <div className="h-3 bg-white/10 rounded w-full" />
                      <div className="h-3 bg-white/10 rounded w-4/5" />
                    </div>
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

                  {/* 6 Metrics Grid (Minimal & Clean with Attention Differentiation) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Architecture */}
                    {(() => {
                      const style = getMetricAttentionStyle(healthData.metrics?.architecture?.score, healthData.metrics?.architecture?.grade);
                      return (
                        <div className={`rounded-xl p-4 space-y-1.5 transition-colors ${style.card}`}>
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
                              <span className="opacity-80">{healthData.metrics?.architecture?.score}/100</span>
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
                        <div className={`rounded-xl p-4 space-y-1.5 transition-colors ${style.card}`}>
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
                              <span className="opacity-80">{healthData.metrics?.documentation?.score}/100</span>
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
                        <div className={`rounded-xl p-4 space-y-1.5 transition-colors ${style.card}`}>
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
                              <span className="opacity-80">{healthData.metrics?.testing?.score}/100</span>
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
                        <div className={`rounded-xl p-4 space-y-1.5 transition-colors ${style.card}`}>
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
                              <span className="opacity-80">{healthData.metrics?.maintainability?.score}/100</span>
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
                        <div className={`rounded-xl p-4 space-y-1.5 transition-colors ${style.card}`}>
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
                              <span className="opacity-80">{healthData.metrics?.security?.score}/100</span>
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
                        <div className={`rounded-xl p-4 space-y-1.5 transition-colors ${style.card}`}>
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
                              <span className="opacity-80">{healthData.metrics?.performance?.score}/100</span>
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
                <div className="space-y-4 animate-pulse">
                  <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="h-4 bg-white/15 rounded-md w-2/5" />
                    <div className="h-3 bg-white/10 rounded-md w-3/4" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((item) => (
                      <div key={item} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 shadow-inner">
                        <div className="flex items-center justify-between">
                          <div className="h-4 bg-white/15 rounded w-1/3" />
                          <div className="h-5 bg-white/10 rounded-full w-16" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-2.5 bg-white/10 rounded w-full" />
                          <div className="h-2.5 bg-white/10 rounded w-5/6" />
                        </div>
                      </div>
                    ))}
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
                      <div className="space-y-1.5">
                        {reviewData.solidRecommendations.map((rec: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs bg-white/[0.02] border border-white/5 rounded-lg p-2.5 text-text-muted">
                            <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-mono flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed text-gray-300">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dead Code Table (Differentiated Attention) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Unreferenced Symbols ({reviewData.deadCodeNodes?.length || 0})</span>
                      </div>
                      <span className="text-amber-300/80 font-normal text-[11px]">Click symbol to jump in graph</span>
                    </div>
                    {reviewData.deadCodeNodes && reviewData.deadCodeNodes.length > 0 ? (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                        {reviewData.deadCodeNodes.map((dn: any) => (
                          <div
                            key={dn.id}
                            onClick={() => {
                              if (onSelectNode) {
                                onSelectNode(dn.id);
                                onClose();
                              }
                            }}
                            className="bg-amber-500/[0.06] hover:bg-amber-500/[0.1] border border-amber-500/30 rounded-lg p-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileCode className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="font-mono text-xs text-amber-200 font-medium truncate group-hover:underline">
                                  {dn.label}
                                </div>
                                <div className="text-[11px] text-amber-300/60 font-mono truncate">
                                  {dn.file}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold shrink-0">
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

                  {/* Code Smells Table (Differentiated Critical Attention) */}
                  {reviewData.codeSmells && reviewData.codeSmells.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Coupling & Architectural Smells ({reviewData.codeSmells.length})</span>
                      </h4>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                        {reviewData.codeSmells.map((cs: any) => (
                          <div
                            key={cs.id}
                            onClick={() => {
                              if (onSelectNode) {
                                onSelectNode(cs.id);
                                onClose();
                              }
                            }}
                            className="bg-rose-500/[0.06] hover:bg-rose-500/[0.1] border border-rose-500/30 rounded-lg p-2.5 space-y-1 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-medium text-rose-200 group-hover:underline truncate">
                                {cs.label} <span className="text-rose-300/60 text-[11px] font-normal">({cs.file})</span>
                              </span>
                              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                                {cs.issue}
                              </span>
                            </div>
                            <p className="text-[11px] text-rose-200/80 leading-relaxed">{cs.recommendation}</p>
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
                <div className="space-y-4 animate-pulse">
                  <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-inner">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-white/15 rounded w-1/3" />
                      <div className="h-3 bg-white/10 rounded w-2/3" />
                    </div>
                    <div className="h-9 w-28 bg-white/10 rounded-full" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((item) => (
                      <div key={item} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <div className="h-4 bg-white/15 rounded w-2/5" />
                        <div className="h-2.5 bg-white/10 rounded w-full" />
                        <div className="h-2.5 bg-white/10 rounded w-4/5" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : healthData?.gitIntelligence ? (
                <div className="space-y-6">
                  {/* Overview Card */}
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-inner">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-semibold text-amber-300">
                          Git Intelligence & Technical Debt Map
                        </h3>
                      </div>
                      <p className="text-xs text-gray-300">
                        Analyzed {healthData.gitIntelligence.totalCommitsAnalyzed} recent commits across repository history to identify files with high churn and structural complexity.
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-500/30 font-bold flex-shrink-0">
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
                    <div className="space-y-2.5 pt-1">
                      {(healthData.gitIntelligence.topHotspots || []).map((hs: any, idx: number) => {
                        const debtCard = getDebtCardStyle(hs.debtRisk);
                        return (
                          <div
                            key={idx}
                            className={`border rounded-xl p-4 flex items-center justify-between gap-4 transition-colors ${debtCard}`}
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
