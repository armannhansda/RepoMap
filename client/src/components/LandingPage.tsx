"use client";

import React from 'react';
import { Link2, ArrowRight, Map, Layers, Zap, GitMerge, Eye } from 'lucide-react';
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

const nodeTypes = { custom: CustomNode };

interface LandingPageProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  onAnalyze: () => void;
  loading: boolean;
}

export default function LandingPage({ repoUrl, setRepoUrl, onAnalyze, loading }: LandingPageProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [mousePos, setMousePos] = React.useState({ x: -1000, y: -1000 });
  const [graphMousePos, setGraphMousePos] = React.useState({ x: -1000, y: -1000 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const graphContainerRef = React.useRef<HTMLDivElement>(null);

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

      {/* Main Content */}
      <div className="w-full max-w-5xl px-6 pt-24 pb-12 flex flex-col items-center z-10">

        {/* Branding */}
        <div className="flex items-center gap-3 font-bold text-lg text-white mb-20">
          <Image src="/icon.svg" alt="RepoMap Logo" width={28} height={28} className="w-7 h-7 opacity-90" />
          <span className="text-xl tracking-wide">RepoMap</span>
        </div>

        {/* Hero */}
        <div className="text-center mb-12 max-w-4xl relative">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-white drop-shadow-2xl">
            Google Maps for <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-500">Source Code.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-md">
            Transform your repository into an explorable knowledge graph. Zoom from system architecture to individual function calls with zero configuration.
          </p>
        </div>

        {/* Search */}
        <div className="w-full max-w-2xl mb-12 relative z-20">
          <div className="relative flex items-center bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 shadow-[0_0_50px_rgba(255,255,255,0.05)] transition-all hover:border-white/20 focus-within:border-white/40 focus-within:bg-black/80">
            <div className="pl-4 pr-3 text-gray-400">
              <Link2 className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Enter a GitHub repository URL..."
              className="flex-1 bg-transparent border-none outline-none text-white text-base font-mono placeholder-gray-500 py-3 px-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAnalyze();
              }}
            />
            <button
              onClick={onAnalyze}
              disabled={loading || !repoUrl}
              className="bg-white hover:bg-gray-200 text-black font-semibold py-2.5 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm ml-2"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing</span>
                </div>
              ) : (
                <>
                  Analyze <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-Side: How It Works & Graph */}
      <div className="w-full px-8 md:px-16 mx-auto mb-32 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center max-w-[2000px] mx-auto">

          {/* Left Side: How It Works */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="mb-10 text-left">
              <h2 className="text-4xl font-bold text-white mb-4">How it works</h2>
              <p className="text-lg text-gray-400">From a standard GitHub URL to an interactive knowledge graph in seconds.</p>
            </div>

            <div className="space-y-10 relative before:absolute before:inset-0 before:ml-8 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              <div className="relative flex items-start gap-6 z-10">
                <div className="w-16 h-16 shrink-0 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-xl">
                  <Link2 className="w-6 h-6 text-white" />
                </div>
                <div className="pt-2 text-left">
                  <h3 className="text-xl font-semibold text-white mb-2">1. Connect Repo</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">Paste any public GitHub repository URL. No manifest files or configuration required.</p>
                </div>
              </div>

              <div className="relative flex items-start gap-6 z-10">
                <div className="w-16 h-16 shrink-0 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-xl">
                  <GitMerge className="w-6 h-6 text-white" />
                </div>
                <div className="pt-2 text-left">
                  <h3 className="text-xl font-semibold text-white mb-2">2. Map Dependencies</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">Our engine parses the AST, maps imports, and builds a comprehensive dependency graph.</p>
                </div>
              </div>

              <div className="relative flex items-start gap-6 z-10">
                <div className="w-16 h-16 shrink-0 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-xl">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div className="pt-2 text-left">
                  <h3 className="text-xl font-semibold text-white mb-2">3. Explore Visually</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">Navigate your codebase spatially. Zoom in to read inline code, zoom out for architecture.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Graph */}
          <div 
            ref={graphContainerRef}
            onMouseMove={handleGraphMouseMove}
            onMouseLeave={() => setGraphMousePos({ x: -1000, y: -1000 })}
            className="lg:col-span-7 w-full h-[500px] relative rounded-[2.5rem] border border-white/10 bg-black/20 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto select-none"
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

            <div className="absolute inset-0 opacity-90 cursor-grab active:cursor-grabbing z-10">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                proOptions={{ hideAttribution: true }}
                zoomOnScroll={false}
                panOnScroll={false}
                panOnDrag={true}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                preventScrolling={false}
                defaultViewport={{ x: 0, y: 50, zoom: 0.8 }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl px-6 flex flex-col items-center z-10">
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-24">
          <FeatureCard
            icon={<Map className="w-5 h-5 text-white" />}
            title="Spatial Memory"
            description="Deterministic layouts help you build a mental map of your codebase. Learn exactly where core modules and utility functions 'live'."
          />
          <FeatureCard
            icon={<Layers className="w-5 h-5 text-white" />}
            title="Progressive Disclosure"
            description="Navigate layers of detail intuitively. Start from high-level system boundaries and zoom seamlessly down into individual file contents."
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5 text-white" />}
            title="Zero Configuration"
            description="No complex setup, manifest files, or local dependencies required. Simply paste a standard GitHub repository URL and begin exploring."
          />
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-black py-8 px-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-500 z-10 gap-4 md:gap-0 mt-auto">
        <div className="flex items-center gap-2 text-white/70">
          <Image src="/icon.svg" alt="RepoMap Logo" width={16} height={16} className="opacity-70" />
          <span>RepoMap © 2024</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="flex items-center gap-1 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.8 4.8 0 0 0 9 18v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg> GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 transition-all hover:bg-white/[0.04] hover:border-white/20 group flex flex-col backdrop-blur-sm">
      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-[13px] leading-relaxed">{description}</p>
    </div>
  );
}
