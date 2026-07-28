# Application Flow Playground — Implementation Plan & Progress Tracker

This document serves as the living implementation plan and progress tracker for building the **Application Flow Playground (Interactive Execution & Animation Canvas)** in `RepoMap`.

---

## 📌 Feature Overview & Goal
Instead of only viewing static repository structure, users can enter the **Playground Mode** (`[ Structure Map ]` vs `[ Flow Playground ]`), select an application workflow (or ask AI to generate one based on the repository code), and press **Play (`▶`)** to watch data packets, function calls, and API payloads dynamically flow through the animated graph in real time.

---

## 🎯 Progress Tracker & Checklist

### Phase 1: Shared Types & Data Model
- [x] Create `client/src/types/flowTypes.ts`
  - [x] Define `FlowStep`, `FlowScenario`, `FlowPlaybackState`
  - [x] Define node status types (`'idle' | 'active' | 'visited'`)

### Phase 2: Backend AI Flow Generator Service (`/api/ai/generate-flow`)
- [x] Create `server/src/services/flowEngine.ts`
  - [x] Implement `generateFlowScenario(repoId, prompt, graph)` using `generateAIContent`
  - [x] Implement preset scenario generator (e.g., *"Authentication Flow"*, *"API Request Flow"*)
  - [x] Validate generated step node IDs against active `graph.nodes`
- [x] Update `server/src/controllers/aiController.ts`
  - [x] Add `generateFlowScenarioController` and `listPresetFlowsController`
- [x] Update `server/src/routes/aiRoutes.ts`
  - [x] Register `POST /api/ai/generate-flow` and `POST /api/ai/preset-flows`

### Phase 3: Frontend Client Services & Custom React Flow Components
- [x] Update `client/src/services/api.ts`
  - [x] Add `generateFlowApi(payload)` and `getPresetFlowsApi(repoId)`
- [x] Create `client/src/components/FlowAnimatedEdge.tsx`
  - [x] Custom animated SVG edge with glowing traveling particle (`@keyframes` / `strokeDasharray`) when step is active
  - [x] Floating step badge label along the edge path (`#1 POST /api/analyze`)
- [x] Create `client/src/components/FlowCustomNode.tsx`
  - [x] Custom node component reacting to `status`:
    - **Active**: Vibrant neon border pulse/glow + status indicator (`⚡ Executing Step X`)
    - **Visited**: Subtle emerald ring checkmark
    - **Idle**: Standard dark glassmorphism card
- [x] Create `client/src/components/FlowStepInspector.tsx`
  - [x] Floating right-side popover detailing current step (human explanation, simulated HTTP payload/function arguments, code preview)
- [x] Create `client/src/components/FlowPlaybackBar.tsx`
  - [x] Floating bottom controller bar (`▶ Play` / `⏸ Pause`, `⏭ Step Forward`, `⏮ Step Back`, `🔄 Reset`)
  - [x] Speed selector (`0.5x`, `1x`, `2x`)
  - [x] Timeline scrub slider (`Step X of Y`)
  - [x] Scenario Selector dropdown (`Select preset scenario` vs `+ Ask AI to simulate custom prompt`)

### Phase 4: Playground Canvas & View Integration
- [x] Create `client/src/components/PlaygroundCanvas.tsx`
  - [x] Dedicated `ReactFlow` canvas with `FlowAnimatedEdge` and `FlowCustomNode` types registered
  - [x] State management hook (`useFlowPlayback`) controlling step timing and animation ticks
  - [x] Auto-fit graph layout focused on nodes inside the active flow scenario
- [x] Update `client/src/components/Header.tsx`
  - [x] Add `Playground (Flows)` toggle button right next to `Analyze` / Feature tabs
- [x] Update `client/src/app/page.tsx`
  - [x] State for `activeViewMode: 'map' | 'playground'`
  - [x] Render `<PlaygroundCanvas />` with `<FlowPlaybackBar />` and `<FlowStepInspector />` when `activeViewMode === 'playground'`

### Phase 5: UI/UX & Focused Node Filtering Refinements
- [x] Update `client/src/components/PlaygroundCanvas.tsx`
  - [x] Filter graph nodes and edges to ONLY those involved in the active scenario (`fromNodeId`, `toNodeId`)
  - [x] Apply automatic `dagre` layouting (`getLayoutedElements`) to involved nodes so execution steps are cleanly arranged from left to right without overlapping
- [x] Update `client/src/app/page.tsx`
  - [x] Hide Left Sidebar (`LeftSidebar` and minimized `Files` toggle) when `activeViewMode === 'playground'` so canvas gets 100% full screen width
- [x] Update `client/src/components/Header.tsx`
  - [x] Create prominent top-level Segmented Mode Switcher (`[ 🗺️ Structure Map ]` vs `[ ▶️ Flow Playground ]`) for clear mode differentiation

---

## 🏗️ Technical Architecture & Detailed Specifications

### 1. Data Schema (`flowTypes.ts`)
```typescript
export interface FlowStep {
  stepIndex: number;          // 0-indexed sequence step
  id: string;                 // Unique step id (e.g. step-1)
  fromNodeId: string;         // Exact node ID from repo graph (source)
  toNodeId: string;           // Exact node ID from repo graph (target)
  label: string;              // Short action badge (e.g. "POST /api/analyze")
  description: string;        // Detailed explanation of what happens
  codeSnippet?: string;       // Key code preview for this step
  payloadExample?: any;       // Simulated HTTP payload, args, or return value
  durationMs?: number;        // Step duration (default 1800ms)
}

export interface FlowScenario {
  id: string;
  title: string;
  description: string;
  steps: FlowStep[];
}
```

### 2. State Machine (`useFlowPlayback`)
- Maintains `currentStepIndex` (`-1` to `steps.length - 1`).
- When `isPlaying === true`, a timer increments `currentStepIndex` every `(durationMs / speed)` milliseconds.
- Nodes where `id === currentStep.toNodeId` or `id === currentStep.fromNodeId` enter `status: 'active'`.
- Nodes previously processed enter `status: 'visited'`.
- Edges matching `source === currentStep.fromNodeId && target === currentStep.toNodeId` trigger their CSS glowing particle animation.

---

## 🔍 Verification & Testing Strategy
1. **TypeScript & Build Verification**: Run `npm run build` across `client` and `npx tsc --noEmit` across `server` after each phase.
2. **Preset Execution Flow Verification**: Test loading preset flows against real repositories and verify zero broken links (`fromNodeId`/`toNodeId`).
3. **Interactive UI Testing**: Test scrubbing back and forth on the timeline slider, pausing mid-animation, and verifying step inspector accurately reflects the current step.
