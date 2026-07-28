"use client";

import React from 'react';
import { Link2, ArrowRight, Map, Layers, Zap, GitMerge, Eye, Sparkles, Users, BookOpen, HelpCircle, Code, ShieldCheck, Cpu, Download, Terminal, Compass, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import ReactFlow, { Edge, Node, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';

const initialNodes: Node[] = [
  { id: '1', type: 'custom', position: { x: 80, y: 80 }, data: { label: 'schema.prisma', path: 'prisma/schema.prisma' } },
  { id: '2', type: 'custom', position: { x: 290, y: 220 }, data: { label: 'GET /api/users', path: 'routes/users.ts', functionType: 'export function' } },
  { id: '3', type: 'custom', position: { x: 500, y: 60 }, data: { label: 'UserProfile.tsx', path: 'components/Profile.tsx' } },
  { id: '4', type: 'custom', position: { x: 710, y: 240 }, data: { label: 'verifySession', path: 'lib/auth.ts', functionType: 'export function' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, type: 'smoothstep', style: { stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1.5 } },
  { id: 'e2-3', source: '2', target: '3', animated: true, type: 'smoothstep', style: { stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1.5 } },
  { id: 'e3-4', source: '3', target: '4', animated: true, type: 'smoothstep', style: { stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1.5 } },
  { id: 'e1-3', source: '1', target: '3', animated: true, type: 'smoothstep', style: { stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1.5 } },
];

const initialNodeTypes = { custom: CustomNode };

function ScrollReveal({
  children,
  className = "",
  direction = "up",
  delay = 0,
  threshold = 0.15
}: {
  children: React.ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "zoom" | "fade";
  delay?: number;
  threshold?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  const baseStyles = "transition-all duration-[800ms] cubic-bezier(0.16, 1, 0.3, 1) will-change-transform";
  const transformMap = {
    up: isVisible ? "opacity-100 translate-y-0 blur-none" : "opacity-0 translate-y-12 blur-[2px]",
    down: isVisible ? "opacity-100 translate-y-0 blur-none" : "opacity-0 -translate-y-12 blur-[2px]",
    left: isVisible ? "opacity-100 translate-x-0 blur-none" : "opacity-0 translate-x-12 blur-[2px]",
    right: isVisible ? "opacity-100 translate-x-0 blur-none" : "opacity-0 -translate-x-12 blur-[2px]",
    zoom: isVisible ? "opacity-100 scale-100 blur-none" : "opacity-0 scale-95 blur-[2px]",
    fade: isVisible ? "opacity-100 blur-none" : "opacity-0 blur-[2px]",
  };

  return (
    <div
      ref={ref}
      className={`${baseStyles} ${transformMap[direction]} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function SectionConnector({ number, label }: { number: string; label: string }) {
  return (
    <ScrollReveal direction="zoom" className="w-full flex flex-col items-center justify-center my-6 sm:my-8 relative z-10 select-none">
      <div className="w-px h-6 sm:h-8 bg-gradient-to-b from-transparent via-white/20 to-white/40" />
      <div className="flex items-center gap-3 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-black/90 border border-white/15 shadow-[0_0_40px_rgba(255,255,255,0.06)] text-xs font-mono text-gray-300 backdrop-blur-xl hover:border-white/30 transition-colors my-1">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-white font-bold tracking-wider">{number}</span>
        <span className="text-gray-600">/</span>
        <span className="uppercase tracking-widest text-gray-200 font-semibold">{label}</span>
      </div>
      <div className="w-px h-6 sm:h-8 bg-gradient-to-b from-white/40 via-white/20 to-transparent" />
    </ScrollReveal>
  );
}

interface LandingPageProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  onAnalyze: () => void;
  loading: boolean;
}

export default function LandingPage({ repoUrl, setRepoUrl, onAnalyze, loading }: LandingPageProps) {
  const [nodeTypes] = React.useState(initialNodeTypes);
  const [proOptions] = React.useState({ hideAttribution: true });
  const defaultViewport = React.useMemo(() => ({ x: 0, y: 50, zoom: 0.8 }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [mousePos, setMousePos] = React.useState({ x: -1000, y: -1000 });
  const [graphMousePos, setGraphMousePos] = React.useState({ x: -1000, y: -1000 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const graphContainerRef = React.useRef<HTMLDivElement>(null);
  const [activePersonaTab, setActivePersonaTab] = React.useState(0);
  const [activeStepTab, setActiveStepTab] = React.useState(0);

  const personasData = [
    {
      role: "Onboarding Engineers & New Hires",
      badge: "Fast-Track Mastery",
      icon: <Compass className="w-5 h-5 text-white" />,
      color: "from-white/10 via-white/5 to-transparent border-white/20",
      accent: "text-white font-mono",
      headline: "Understand system architecture in hours, not weeks.",
      description: "Eliminate 'tab fatigue' from opening hundreds of files blindly during onboarding. Get a crystal-clear bird's-eye view of high-level system boundaries immediately and autonomously trace data flows from UI to database schemas.",
      previewTitle: "Simulated Onboarding Navigation",
      previewCode: "src/components/LandingPage.tsx -> src/services/api.ts -> server/routes/analyze.ts",
      previewTag: "AST Path: Verified Connected Nodes"
    },
    {
      role: "Software Architects & Tech Leads",
      badge: "System Governance",
      icon: <Cpu className="w-5 h-5 text-white" />,
      color: "from-white/10 via-white/5 to-transparent border-white/20",
      accent: "text-white font-mono",
      headline: "Audit architectural boundaries and export presentation diagrams.",
      description: "Visualize module dependencies and detect structural drift across microservices. Enforce clean separation of concerns, spot tight coupling hotspots, and instantly export presentation-ready Draw.io (.drawio) XML diagrams for technical specs.",
      previewTitle: "Simulated Architecture Audit",
      previewCode: "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>",
      previewTag: "One-Click Draw.io XML Ready"
    },
    {
      role: "Code Reviewers & Core Maintainers",
      badge: "Blast Radius Analysis",
      icon: <ShieldCheck className="w-5 h-5 text-white" />,
      color: "from-white/10 via-white/5 to-transparent border-white/20",
      accent: "text-white font-mono",
      headline: "Assess the true structural impact of pull requests before merging.",
      description: "Understand the exact blast radius of modified functions by tracing upstream callers and downstream dependencies instantly. Pinpoint git churn hotspots and inspect complex function chains side-by-side with full source code previews.",
      previewTitle: "Simulated PR Impact Map",
      previewCode: "Function 'verifySession()' modified -> 14 Upstream Callers affected across 6 files",
      previewTag: "Health Score: 94/100 (Safe to Merge)"
    },
    {
      role: "AI Engineers & Full-Stack Developers",
      badge: "Multi-Agent Intelligence",
      icon: <Terminal className="w-5 h-5 text-white" />,
      color: "from-white/10 via-white/5 to-transparent border-white/20",
      accent: "text-white font-mono",
      headline: "Collaborate with context-aware AI agents across the graph.",
      description: "Leverage a multi-agent AI orchestrator (Planner, Q&A, and Code Reviewer) that reasons over the real AST dependency map. Ask natural language questions about complex functions or multi-file workflows and get exact answers anchored to graph nodes.",
      previewTitle: "Simulated Multi-Agent Q&A",
      previewCode: "? 'How does authentication flow?' -> AI Agent highlights routes/auth.ts & lib/jwt.ts",
      previewTag: "Orchestrator: Active Context Linked"
    }
  ];

  const workflowData = [
    {
      title: "Spatial Code Memory (Miller's Law)",
      badge: "Cognitive Psychology",
      description: "Human working memory holds only ~7 items at once. Linear tab browsing forces continuous mental re-indexing. By pinning files and modules across a deterministic spatial grid, your brain naturally taps physical spatial memory to remember where core logic, database models, and utilities reside.",
      visualBadge: "Persistent 2D Grid",
      visualStat: "0 Tab Switching",
      visualText: "Files remain in fixed coordinates so you instinctively navigate directly to auth, API, and schema layers every time."
    },
    {
      title: "Progressive Disclosure (Shneiderman's Mantra)",
      badge: "Visual Hierarchy",
      description: "'Overview first, zoom and filter, then details-on-demand.' Never get overwhelmed by 10,000 files at once. Start from macro-level directory clusters to understand overall system architecture, then click to expand directory nodes or zoom into exported functions right when needed.",
      visualBadge: "Smooth Zoom Layers",
      visualStat: "Macro to AST Depth",
      visualText: "Directory Cluster -> Single File -> AST Exported Function. Expand only what your brain needs right at that moment."
    },
    {
      title: "Flow State Protection (Split-Screen AI)",
      badge: "Integrated Intelligence",
      description: "Every tab switch drains cognitive focus and breaks your train of thought. Click any node on the graph to open the interactive file panel right alongside the canvas. Read full source code, trace callers, check git churn hotspots, or query multi-agent AI without ever leaving your visual context.",
      visualBadge: "Split-Screen Canvas",
      visualStat: "100% In-Browser",
      visualText: "Full TypeScript/JSX syntax highlighting and AST node inspection synchronized right beside your spatial graph."
    }
  ];

  const stepData = [
    {
      step: 1,
      title: "Paste Any GitHub URL",
      description: "Enter any public GitHub repository link (e.g., https://github.com/expressjs/express) into the search bar above and click Analyze. Or press Cmd/Ctrl + K anytime to focus the URL bar instantly.",
      mockupHeader: "Input Action",
      mockupCommand: "https://github.com/expressjs/express",
      mockupStatus: "Ready for AST Extraction"
    },
    {
      step: 2,
      title: "Navigate & Zoom the Graph",
      description: "Once the AST graph generates, drag the canvas to pan across directories. Scroll to zoom out for a high-level system overview, or zoom in to inspect connected files and function definitions.",
      mockupHeader: "Canvas Interaction",
      mockupCommand: "Pan: Drag Canvas | Zoom: Scroll Wheel / Pinch",
      mockupStatus: "Real-Time Spatial Rendering"
    },
    {
      step: 3,
      title: "Inspect Source Code Side-by-Side",
      description: "Click any node on the map (`file` or `function`) to open the right sidebar. View inline source code, trace imports, check callers, or close the sidebar with Esc to continue exploring.",
      mockupHeader: "Node Selection",
      mockupCommand: "Selected: CustomNode.tsx (Line 39) -> View Source Panel",
      mockupStatus: "AST Dependencies Highlighted"
    },
    {
      step: 4,
      title: "Query AI & Export Diagrams",
      description: "Use top navigation shortcuts (`1-4`) to open AI Q&A, Multi-Agent Orchestrator, or Health Hotspots. Click Export Draw.io to download an XML architecture diagram instantly.",
      mockupHeader: "Superpowers & Shortcuts",
      mockupCommand: "Key [1]: Explain | [2]: AI Q&A | [3]: Engine | [4]: Hotspots",
      mockupStatus: "Draw.io (.drawio) XML Generated"
    }
  ];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left + containerRef.current.scrollLeft,
      y: e.clientY - rect.top + containerRef.current.scrollTop,
    });
  };

  const handleGraphMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!graphContainerRef.current) return;
    const rect = graphContainerRef.current.getBoundingClientRect();
    setGraphMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos({ x: -1000, y: -1000 })}
      className="relative w-full h-full flex flex-col items-center overflow-y-auto overflow-x-hidden bg-[#000000] text-white font-sans selection:bg-white/30 scroll-smooth"
    >

      {/* Dot Grid Background */}
      <div className="absolute top-0 left-0 w-full h-[1200px] overflow-hidden pointer-events-none z-0" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Highlighted Dot Grid following mouse */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 100%)`,
            WebkitMaskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 100%)`
          }}
        />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-white rounded-full blur-[250px] opacity-[0.04]" />
      </div>

      {/* Main Content (Hero + Search + Quick Try + Hook Strip) */}
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 pt-10 sm:pt-14 lg:pt-16 pb-8 sm:pb-12 mx-auto flex flex-col items-center z-10">

        {/* Branding */}
        <div className="flex items-center gap-2.5 font-bold text-base sm:text-lg text-white mb-6 sm:mb-8 lg:mb-10">
          <Image src="/icon.svg" alt="RepoMap Logo" width={28} height={28} className="w-6 h-6 sm:w-7 sm:h-7 opacity-90" />
          <span className="text-lg sm:text-xl tracking-wider font-mono">RepoMap</span>
        </div>

        {/* Hero */}
        <div className="text-center mb-8 sm:mb-10 max-w-[1400px] mx-auto relative px-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] sm:text-xs font-mono tracking-wide text-gray-300 mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>AST-Driven Interactive Knowledge Graph</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight mb-5 sm:mb-6 text-white drop-shadow-2xl">
            Google Maps for <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-500">Source Code.</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-400 max-w-2xl xl:max-w-3xl mx-auto font-normal leading-relaxed drop-shadow-md">
            Turn dense repositories into explorable 2D spatial maps. Zoom effortlessly from macro architecture down to AST function calls with zero configuration.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="w-full max-w-2xl lg:max-w-3xl 2xl:max-w-4xl mb-6 sm:mb-8 relative z-20 px-2">
          <div className="relative flex items-center bg-black/60 border border-white/15 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-[0_0_50px_rgba(255,255,255,0.05)] transition-all hover:border-white/25 focus-within:border-white/40 focus-within:bg-black/90">
            <div className="pl-3 sm:pl-5 pr-2 sm:pr-3 text-gray-400">
              <Link2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Enter any public GitHub repository URL..."
              className="flex-1 bg-transparent border-none outline-none text-white text-xs sm:text-sm md:text-base lg:text-base 2xl:text-lg font-mono placeholder-gray-500 py-2 sm:py-3 lg:py-3.5 px-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAnalyze();
              }}
            />
            <button
              onClick={onAnalyze}
              disabled={loading || !repoUrl}
              className="bg-white hover:bg-gray-200 text-black font-semibold py-2 sm:py-2.5 lg:py-3 px-4 sm:px-6 lg:px-8 rounded-lg sm:rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm lg:text-base ml-1.5 sm:ml-2 shrink-0 shadow-md"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing</span>
                </div>
              ) : (
                <>
                  Analyze <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Try Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-400 mb-8 sm:mb-10 lg:mb-12 z-20 px-4">
          <span className="font-mono text-gray-500 uppercase tracking-wider font-semibold mr-1">Quick Try:</span>
          <button
            onClick={() => setRepoUrl("https://github.com/developit/mitt")}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white transition-all flex items-center gap-2 font-mono shadow-sm text-xs sm:text-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
            developit/mitt
          </button>
          <button
            onClick={() => setRepoUrl("https://github.com/expressjs/express")}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white transition-all flex items-center gap-2 font-mono shadow-sm text-xs sm:text-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
            expressjs/express
          </button>
          <button
            onClick={() => setRepoUrl("https://github.com/sindresorhus/ky")}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white transition-all flex items-center gap-2 font-mono shadow-sm text-xs sm:text-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
            sindresorhus/ky
          </button>
        </div>

        {/* 3-Second Psychology & Value Hook Strip (Open Cardless Editorial Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 w-full max-w-[1500px] mx-auto mb-10 sm:mb-14 z-20 pt-6 border-t border-white/10">
          <div className="border-l-2 border-red-500/30 pl-5 sm:pl-6 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-red-400 font-bold">
                  THE PAIN // MILLER&apos;S LAW
                </span>
                <Compass className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Linear Tab Disorientation</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-sans">
                Human working memory holds only ~7 items. Tracing code across dozens of open tabs forces continuous cognitive re-indexing and mental fatigue.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span>Cognitive Load: Overwhelmed</span>
              <span className="text-red-400 font-bold">45+ Tabs</span>
            </div>
          </div>

          <div className="border-l-2 border-blue-500/30 pl-5 sm:pl-6 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-blue-400 font-bold">
                  THE SOLUTION // SPATIAL GRID
                </span>
                <Map className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Deterministic 2D Cartography</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-sans">
                Human spatial memory recalls physical coordinates effortlessly. Mapping AST modules onto a persistent 2D grid makes navigation instinctive.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span>Spatial Accuracy: 100%</span>
              <span className="text-blue-400 font-bold">Fixed Layout</span>
            </div>
          </div>

          <div className="border-l-2 border-emerald-500/30 pl-5 sm:pl-6 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                  THE PAYOFF // FLOW STATE
                </span>
                <Zap className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Split-Screen Code & AI Mastery</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-sans">
                Onboard in hours instead of weeks. Inspect function call chains and query multi-agent AI side-by-side without leaving your visual context.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span>Context Switching: Zero</span>
              <span className="text-emerald-400 font-bold">0 Tabs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side: How It Works & ReactFlow Graph */}
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 mx-auto mb-12 sm:mb-16 lg:mb-20 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center max-w-[1500px] mx-auto">

          {/* Left Side: How It Works Steps */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="mb-8 text-left">
              <span className="text-[11px] font-mono uppercase tracking-widest text-gray-400 font-bold mb-2 block">QUICK ONBOARDING</span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3">How it works</h2>
              <p className="text-xs sm:text-sm lg:text-base text-gray-400 leading-relaxed">From a standard GitHub URL to an interactive knowledge graph in seconds.</p>
            </div>

            <div className="space-y-6 sm:space-y-8 relative before:absolute before:inset-0 before:ml-6 sm:before:ml-7 before:-translate-x-px before:h-full before:w-px before:bg-gradient-to-b before:from-transparent before:via-white/15 before:to-transparent">
              <div className="relative flex items-start gap-4 sm:gap-5 z-10">
                <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-black border border-white/15 flex items-center justify-center shadow-xl text-xs sm:text-sm font-mono font-bold text-white">
                  01
                </div>
                <div className="pt-1 text-left">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1 flex items-center gap-2">
                    Connect Repo <Link2 className="w-4 h-4 text-gray-400" />
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">Paste any public GitHub repository URL. No manifest files or configuration required.</p>
                </div>
              </div>

              <div className="relative flex items-start gap-4 sm:gap-5 z-10">
                <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-black border border-white/15 flex items-center justify-center shadow-xl text-xs sm:text-sm font-mono font-bold text-white">
                  02
                </div>
                <div className="pt-1 text-left">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1 flex items-center gap-2">
                    Map Dependencies <GitMerge className="w-4 h-4 text-gray-400" />
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">Our engine parses the AST, maps imports, and builds a comprehensive dependency graph.</p>
                </div>
              </div>

              <div className="relative flex items-start gap-4 sm:gap-5 z-10">
                <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-black border border-white/15 flex items-center justify-center shadow-xl text-xs sm:text-sm font-mono font-bold text-white">
                  03
                </div>
                <div className="pt-1 text-left">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1 flex items-center gap-2">
                    Explore Visually <Eye className="w-4 h-4 text-gray-400" />
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">Navigate your codebase spatially. Zoom in to read inline code, zoom out for architecture.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Graph Canvas */}
          <div
            ref={graphContainerRef}
            onMouseMove={handleGraphMouseMove}
            onMouseLeave={() => setGraphMousePos({ x: -1000, y: -1000 })}
            className="lg:col-span-7 w-full h-[380px] sm:h-[440px] lg:h-[480px] relative rounded-3xl border border-white/15 bg-black/40 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden pointer-events-auto select-none"
          >
            {/* Inner Dot Grid for Graph Canvas */}
            <div className="absolute inset-0 z-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            {/* Highlighted Inner Dot Grid following mouse */}
            <div
              className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300"
              style={{
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                maskImage: `radial-gradient(circle 200px at ${graphMousePos.x}px ${graphMousePos.y}px, black 0%, transparent 100%)`,
                WebkitMaskImage: `radial-gradient(circle 200px at ${graphMousePos.x}px ${graphMousePos.y}px, black 0%, transparent 100%)`
              }}
            />

            <div className="absolute inset-0 opacity-95 cursor-grab active:cursor-grabbing z-10">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                proOptions={proOptions}
                zoomOnScroll={false}
                panOnScroll={false}
                panOnDrag={true}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                preventScrolling={false}
                defaultViewport={defaultViewport}
              />
            </div>
            <div className="absolute bottom-4 right-4 z-20 bg-black/80 border border-white/15 px-3 py-1.5 rounded-full text-[11px] font-mono text-gray-400 backdrop-blur-md">
              Drag to Pan • Click Nodes to Inspect
            </div>
          </div>
        </div>
      </div>



      <SectionConnector number="01" label="Why & All About RepoMap" />

      {/* Section 1: Why RepoMap & All About The Tool */}
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 mx-auto z-10 pb-8 sm:pb-12">
        <ScrollReveal direction="up" className="max-w-[1500px] mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-6 sm:mb-8 gap-4 sm:gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] sm:text-xs font-mono uppercase tracking-wider text-gray-300 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Why RepoMap & All About The Tool</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl font-extrabold text-white tracking-tight">
                Escape Tab Fatigue & Mental Overload
              </h2>
            </div>
            <div className="text-gray-400 text-xs sm:text-sm lg:text-base max-w-xl font-normal">
              See the immediate difference between linear file browsing and spatial 2D AST graph cartography.
            </div>
          </div>

          {/* Split-Screen Terminal / IDE Comparison (Open Cardless Side-by-Side Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 mb-10 sm:mb-12 items-start border-y border-white/15 py-6 sm:py-8">
            {/* Before: Traditional Browsing */}
            <div className="font-mono space-y-6">
              <div className="flex items-center justify-between border-b border-white/15 pb-4 text-xs text-gray-400">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span className="text-gray-300 font-bold font-sans">VS Code — Linear Directory Tree</span>
                </div>
                <span className="text-red-400 font-bold bg-red-500/10 px-2.5 py-1 rounded border border-red-500/20 text-[11px]">45 Tabs Open</span>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-gray-400 pl-2">
                <div className="text-gray-500">├── controllers/</div>
                <div className="pl-4 text-gray-300 flex items-center justify-between">
                  <span>├── UserController.ts</span>
                  <span className="text-red-400 text-[10px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">! Memory limit</span>
                </div>
                <div className="pl-4 text-gray-300 flex items-center justify-between">
                  <span>├── AuthController.ts</span>
                  <span className="text-amber-400 text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">? Where called?</span>
                </div>
                <div className="text-gray-500">├── services/</div>
                <div className="pl-4 text-gray-300 flex items-center justify-between">
                  <span>├── BillingService.ts</span>
                  <span className="text-red-400 text-[10px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">! Circular import</span>
                </div>
                <div className="text-gray-500">└── models/</div>
                <div className="pl-4 text-gray-500">└── UserSchema.prisma</div>
              </div>

              <div className="pt-4 border-t border-white/10 text-xs text-gray-400 leading-relaxed font-sans">
                <strong className="text-white">The Problem:</strong> Linear reading forces your working memory to hold thousands of lines. Tracing an API call requires jumping across dozens of disconnected tabs, causing severe disorientation.
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 uppercase tracking-wider font-mono pt-2">
                <span>Cognitive Load: <strong className="text-red-400">Critical</strong></span>
                <span>Context: <strong className="text-red-400">Lost</strong></span>
              </div>
            </div>

            {/* After: RepoMap Spatial Graph */}
            <div className="font-mono space-y-6">
              <div className="flex items-center justify-between border-b border-white/15 pb-4 text-xs text-gray-400">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-white font-bold font-sans">RepoMap — Spatial 2D Knowledge Graph</span>
                </div>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 text-[11px]">0 Tab Switching</span>
              </div>

              <div className="text-xs sm:text-sm space-y-3 pl-2">
                <div className="flex items-center justify-between text-white bg-white/[0.03] p-3 rounded-xl border border-white/15">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <strong className="text-white">[Entry]</strong> routes/users.ts
                  </span>
                  <span className="text-[10px] text-gray-300 bg-white/10 border border-white/20 px-2 py-0.5 rounded font-mono">Line 42</span>
                </div>
                <div className="flex items-center justify-center text-gray-500 text-[11px] font-mono">
                  ├── (AST Verified Call) ──►
                </div>
                <div className="flex items-center justify-between text-white bg-white/[0.03] p-3 rounded-xl border border-white/15">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <strong className="text-white">[Auth]</strong> lib/jwt.ts : verifySession()
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">14 Callers</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 text-xs text-gray-300 leading-relaxed font-sans">
                <strong className="text-white">The Solution:</strong> RepoMap extracts exact Abstract Syntax Tree (AST) imports right in your browser and maps them onto a deterministic spatial grid. You instantly see how modules connect without losing context.
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400 uppercase tracking-wider font-mono pt-2">
                <span>Cognitive Load: <strong className="text-emerald-400">Zero</strong></span>
                <span>Spatial Clarity: <strong className="text-emerald-400">100%</strong></span>
              </div>
            </div>
          </div>

          {/* Floating HUD Strip (Open Typographic Columns - Zero Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 pt-4">
            <div className="border-l-2 border-white/20 pl-4 sm:pl-6">
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight font-mono">100% In-Browser</div>
              <div className="text-xs text-gray-400 mt-1 font-sans">Zero Backend Indexing or Cloning Required</div>
            </div>
            <div className="border-l-2 border-white/20 pl-4 sm:pl-6">
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight font-mono">0s Setup Time</div>
              <div className="text-xs text-gray-400 mt-1 font-sans">Paste Any Standard GitHub Repository Link</div>
            </div>
            <div className="border-l-2 border-white/20 pl-4 sm:pl-6">
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight font-mono">AST + AI Linked</div>
              <div className="text-xs text-gray-400 mt-1 font-sans">Multi-Agent Orchestrator & Q&A Assistant</div>
            </div>
            <div className="border-l-2 border-white/20 pl-4 sm:pl-6">
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight font-mono">Draw.io XML</div>
              <div className="text-xs text-gray-400 mt-1 font-sans">Export Presentation Architecture Diagrams</div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      <SectionConnector number="02" label="Target Audience & Personas" />

      {/* Section 2: Target Audience & Personas (Cardless Split Display) */}
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 mx-auto z-10 pb-8 sm:pb-12">
        <ScrollReveal direction="up" className="max-w-[1500px] mx-auto">
          <div className=" md:flex-row items-start md:items-end justify-between sm:mb-8 gap-2 sm:gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] sm:text-xs font-mono uppercase tracking-wider text-gray-300 mb-2.5">
                <Users className="w-3.5 h-3.5 text-white" />
                <span>Target Audience & Personas</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl font-extrabold text-white tracking-tight">
                Built For Whom? Tailored Superpowers for Every Role
              </h2>
            </div>

            {/* Horizontal Pill Bar Navigation */}
            <div className="flex items-center gap-3 sm:gap-2 bg-black/80 p-1.5 rounded-2xl boarder-white/10  backdrop-blur-xl mt-5 ">
              {personasData.map((persona, index) => (
                <button
                  key={persona.role}
                  onClick={() => setActivePersonaTab(index)}
                  className={`px-3.5 sm:px-4 lg:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${activePersonaTab === index
                    ? 'bg-white text-black shadow-xl scale-[1.02]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${activePersonaTab === index ? 'bg-black' : 'bg-white/40 animate-pulse'}`} />
                  {persona.role.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Cardless Open Split HUD Display */}
          <div key={activePersonaTab} className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start animate-in fade-in duration-300 pt-1 ">
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-white shrink-0">
                  {personasData[activePersonaTab].icon}
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 border border-white/15 text-white font-mono">
                    {personasData[activePersonaTab].badge}
                  </span>
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-white mt-1">{personasData[activePersonaTab].role}</div>
                </div>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                {personasData[activePersonaTab].headline}
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm lg:text-base leading-relaxed font-sans">
                {personasData[activePersonaTab].description}
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-4 text-xs sm:text-sm font-mono text-gray-300 border-t border-white/10">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Instant AST Mapping
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Zero Configuration
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  Draw.io XML Ready
                </span>
              </div>
            </div>

            {/* Right Column: Borderless Code Trace over #000000 */}
            <div className="lg:col-span-6 font-mono border-l lg:border-l-2 border-white/15 pl-0 lg:pl-10 space-y-5 pt-4 lg:pt-0">
              <div className="flex items-center justify-between border-b border-white/15 pb-4 text-xs text-gray-400">
                <div className="flex items-center gap-2 text-white font-bold font-sans">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{personasData[activePersonaTab].previewTitle}</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 font-mono">
                  {personasData[activePersonaTab].previewTag}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-gray-200 leading-relaxed break-all font-mono py-2">
                {personasData[activePersonaTab].previewCode}
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-500 font-mono">
                <span>Status: <strong className="text-white">Active Engine Trace</strong></span>
                <span>Spatial Coordinates: <strong className="text-white">Pinned</strong></span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      <SectionConnector number="03" label="Core Workflow Mechanics" />

      {/* Section 3: Developer Workflow Mechanics (Cardless Staggered Editorial Grid) */}
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 mx-auto z-10 pb-8 sm:pb-12">
        <ScrollReveal direction="up" className="max-w-[1500px] mx-auto">
          <div className="mb-8 sm:mb-10 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] sm:text-xs font-mono uppercase tracking-wider text-gray-300 mb-2.5">
              <BookOpen className="w-3.5 h-3.5 text-white" />
              <span>Developer Workflow & Core Mechanics</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl font-extrabold text-white tracking-tight">
              How It Makes Understanding Source Code Easy
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm lg:text-base mt-2 max-w-2xl font-normal">
              Three core pillars of cognitive psychology, progressive disclosure, and multi-agent AI intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14 items-start border-t border-white/15 pt-6 sm:pt-8">
            {workflowData.map((pillar, idx) => (
              <ScrollReveal key={pillar.title} direction="up" delay={100 + idx * 150} className="space-y-5 border-l-2 border-white/20 pl-6 sm:pl-8">
                <div className="flex items-center justify-between">
                  <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-600 tracking-tighter font-mono">
                    0{idx + 1}
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-mono uppercase px-2.5 py-1 rounded-full bg-white/5 border border-white/15 text-gray-300 font-bold">
                    {pillar.badge}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">{pillar.title}</h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-sans">
                  {pillar.description}
                </p>
                <div className="pl-3 border-l-2 border-white/30 text-xs text-gray-300 font-mono italic py-1">
                  &ldquo;{pillar.visualText}&rdquo;
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span>{pillar.visualBadge}</span>
                  <span className="text-white font-bold bg-white/10 px-2.5 py-1 rounded border border-white/20">{pillar.visualStat}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </ScrollReveal>
      </div>

      <SectionConnector number="04" label="Interactive Step-By-Step Guide" />

      {/* Section 4: Step-by-Step Guide (Cardless Split Display & Stepper) */}
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 mx-auto z-10 pb-10 sm:pb-16">
        <ScrollReveal direction="up" className="max-w-[1500px] mx-auto">
          <div className="mb-6 sm:mb-8 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] sm:text-xs font-mono uppercase tracking-wider text-gray-300 mb-2.5">
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Step-by-Step Guide</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl font-extrabold text-white tracking-tight">
              How To Use RepoMap: From GitHub Link to AST Mastery
            </h2>
          </div>

          {/* Horizontal Timeline Stepper Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 border-b border-white/15 pb-4 sm:pb-6">
            {stepData.map((item, idx) => (
              <button
                key={item.step}
                onClick={() => setActiveStepTab(idx)}
                className={`text-left pb-3 transition-all duration-200 flex items-center justify-between group ${activeStepTab === idx
                  ? 'border-b-2 border-white text-white opacity-100'
                  : 'text-gray-500 hover:text-gray-300 opacity-70 hover:opacity-100'
                  }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${activeStepTab === idx ? 'bg-white text-black shadow-lg' : 'bg-white/10 text-white'
                    }`}>
                    0{item.step}
                  </span>
                  <span className="font-bold text-xs sm:text-sm lg:text-base">{item.title}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Cardless Interactive Command Console Split */}
          <div key={activeStepTab} className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start animate-in fade-in duration-300 pt-2">
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-2.5 text-xs font-mono text-gray-400">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white font-bold">STEP 0{stepData[activeStepTab].step}</span>
                <span>//</span>
                <span>{stepData[activeStepTab].mockupHeader}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                {stepData[activeStepTab].title}
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm lg:text-base leading-relaxed font-sans">
                {stepData[activeStepTab].description}
              </p>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-4">
                <button
                  onClick={() => setActiveStepTab((prev) => (prev + 1) % stepData.length)}
                  className="bg-white hover:bg-gray-200 text-black font-semibold py-2 sm:py-2.5 px-5 sm:px-6 rounded-xl transition-colors text-xs sm:text-sm flex items-center gap-2 shadow-md"
                >
                  Next Step <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <span className="text-[11px] text-gray-500 font-mono">Click Next or use tabs above to cycle steps</span>
              </div>
            </div>

            {/* Right Column: Borderless Live Simulation Console over #000000 */}
            <div className="lg:col-span-6 font-mono border-l lg:border-l-2 border-white/15 pl-0 lg:pl-10 space-y-5 pt-4 lg:pt-0">
              <div className="flex items-center justify-between border-b border-white/15 pb-4 text-xs text-gray-400">
                <div className="flex items-center gap-2 text-white font-bold font-sans">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Simulation Console</span>
                </div>
                <span className="text-white font-bold bg-white/10 px-2.5 py-0.5 rounded border border-white/20 text-[11px]">{stepData[activeStepTab].mockupStatus}</span>
              </div>

              <div className="text-white text-xs sm:text-sm md:text-base flex items-center justify-between gap-4 py-3">
                <span className="break-all sm:break-normal font-mono text-emerald-300">{stepData[activeStepTab].mockupCommand}</span>
                <span className="text-[10px] sm:text-xs bg-white/10 text-white px-2.5 py-1 rounded font-mono border border-white/20 shrink-0">Active Action</span>
              </div>

              <div className="pt-4 border-t border-white/10 text-[11px] text-gray-500 font-mono flex justify-between">
                <span>Engine status: <strong className="text-white">Ready</strong></span>
                <span>Spatial layout: <strong className="text-white">Deterministic</strong></span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-black py-8 px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between text-xs sm:text-sm text-gray-500 z-10 gap-4 md:gap-0 mt-auto">
        <div className="flex items-center gap-2 text-white/80 font-mono">
          <Image src="/icon.svg" alt="RepoMap Logo" width={16} height={16} className="opacity-80" />
          <span>RepoMap © 2026</span>
        </div>
        <div className="flex items-center gap-6 font-sans">
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="https://github.com/armannhansda/RepoMap" className="flex items-center gap-1.5 hover:text-white transition-colors font-mono">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.8 4.8 0 0 0 9 18v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg> GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 sm:p-5 lg:p-6 transition-all hover:bg-white/[0.04] hover:border-white/20 group flex flex-col backdrop-blur-sm">
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform shrink-0">
        {icon}
      </div>
      <h3 className="text-sm sm:text-[15px] font-semibold text-white mb-1.5 sm:mb-2">{title}</h3>
      <p className="text-gray-400 text-xs sm:text-[13px] leading-relaxed">{description}</p>
    </div>
  );
}
