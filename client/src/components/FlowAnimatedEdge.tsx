"use client";

import React, { memo } from "react";
import { EdgeProps, getBezierPath, getSmoothStepPath } from "reactflow";
import { Zap } from "lucide-react";

function FlowAnimatedEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps) {
  const isExecuting = Boolean(data?.isExecuting);
  const isVisitedStep = Boolean(data?.isVisitedStep);
  const isRoadmapStep = Boolean(data?.isRoadmapStep);
  const isFlowEdge = Boolean(data?.isFlowEdge);
  const isDimmed = Boolean(data?.isDimmed);
  const stepNumber = data?.stepNumber;
  const labelText = data?.label || "";

  // Vary offset based on stepNumber so parallel orthogonal tracks run in separate lanes like circuit traces without overlapping
  const trackOffset = stepNumber !== undefined ? 16 + ((stepNumber % 4) * 10) : 20;

  const [edgePath, labelX, labelY] = (isFlowEdge || isRoadmapStep || isVisitedStep || isExecuting)
    ? getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 20,
        offset: trackOffset,
      })
    : getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });

  return (
    <>
      <style>
        {`
          @keyframes flowPacketDash {
            from { stroke-dashoffset: 24; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes flowGlowPulse {
            0%, 100% { filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.6)); }
            50% { filter: drop-shadow(0 0 12px rgba(16, 185, 129, 1)); }
          }
        `}
      </style>

      {/* Base background track edge */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: isExecuting
            ? "#10b981"
            : isVisitedStep
            ? "#10b981"
            : isRoadmapStep || isFlowEdge
            ? "rgba(16, 185, 129, 0.65)"
            : isDimmed
            ? "rgba(255, 255, 255, 0.04)"
            : "rgba(255, 255, 255, 0.15)",
          strokeWidth: isExecuting ? 3 : isVisitedStep ? 2.2 : isRoadmapStep || isFlowEdge ? 2 : isDimmed ? 1 : 1.5,
          strokeDasharray: isRoadmapStep && !isExecuting && !isVisitedStep ? "5 5" : style?.strokeDasharray || "none",
          opacity: isDimmed ? 0.25 : 1,
          transition: "all 0.3s ease",
          ...style,
        }}
      />

      {/* Animated glowing packet stream when active */}
      {isExecuting && (
        <path
          d={edgePath}
          fill="none"
          stroke="#34d399"
          strokeWidth={3.5}
          strokeDasharray="6 8"
          markerEnd={markerEnd}
          style={{
            animation: "flowPacketDash 0.6s linear infinite, flowGlowPulse 1.5s ease-in-out infinite",
          }}
        />
      )}

      {/* Compact step number badge sitting intact directly centered on the edge line with crisp white text */}
      {(isExecuting || stepNumber !== undefined) && (
        <foreignObject
          width={90}
          height={32}
          x={labelX - 45}
          y={labelY - 16}
          className="overflow-visible pointer-events-none z-50"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="flex items-center justify-center w-full h-full">
            <div
              className={`
                flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono shadow-[0_2px_12px_rgba(0,0,0,0.95)] transition-all duration-300 backdrop-blur-2xl border text-white font-semibold
                ${
                  isExecuting
                    ? "bg-[#0c1f17] border-emerald-400 ring-2 ring-emerald-400/50 scale-110 animate-bounce"
                    : isVisitedStep
                    ? "bg-[#101915] border-emerald-500/70"
                    : "bg-[#0e0e16] border-white/40"
                }
              `}
            >
              {isExecuting && <Zap className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />}
              {stepNumber !== undefined && (
                <span className="font-bold text-white tracking-tight">
                  {isVisitedStep ? `✓ #${stepNumber}` : isExecuting ? `#${stepNumber}` : `Step ${stepNumber}`}
                </span>
              )}
            </div>
          </div>
        </foreignObject>
      )}
    </>
  );
}

export default memo(FlowAnimatedEdgeComponent);
