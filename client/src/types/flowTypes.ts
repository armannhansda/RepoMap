export type FlowNodeStatus = 'idle' | 'active' | 'visited' | 'dimmed' | 'flow_target';

export interface FlowStep {
  stepIndex: number;          // 0-indexed sequence step (e.g., 0, 1, 2)
  id: string;                 // Unique identifier for the step (e.g., 'step-1')
  fromNodeId: string;         // Source node ID exactly matching graph node ID
  toNodeId: string;           // Target node ID exactly matching graph node ID
  label: string;              // Short action label (e.g., 'POST /api/analyze')
  description: string;        // Detailed human-readable explanation of what happens in this step
  codeSnippet?: string;       // Optional code snippet representing this action/function
  payloadExample?: any;       // Simulated payload, HTTP body, parameters, or return value
  durationMs?: number;        // Step duration in milliseconds (default: 1800ms)
}

export interface FlowScenario {
  id: string;
  title: string;
  description: string;
  steps: FlowStep[];
}

export interface FlowPlaybackState {
  isPlaying: boolean;
  currentStepIndex: number;   // -1 when stopped/ready, 0..steps.length-1 when playing/paused
  speed: number;              // 0.5 | 1 | 2
  selectedScenario: FlowScenario | null;
}

export interface FlowCustomNodeData {
  label: string;
  type?: string;
  functionType?: string;
  path?: string;
  file?: string;
  apiEndpoint?: {
    httpMethod: string;
    routePath: string;
  };
  status?: FlowNodeStatus;
  activeStepNumber?: number;
  [key: string]: any;
}
