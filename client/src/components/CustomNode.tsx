import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { FileCode, FunctionSquare, Layout, Folder, Box, Code2, Globe } from 'lucide-react';

function CustomNodeComponent({ data, selected }: { data: any, selected: boolean }) {
  const nodeType = data.type || (data.functionType ? 'function' : 'file');
  const isFile = nodeType === 'file';
  const isFolder = nodeType === 'folder';
  const isClass = nodeType === 'class' || nodeType === 'interface';

  let borderColorClass = 'bg-node-file';
  let Icon = FileCode;

  if (isFolder) {
    borderColorClass = 'bg-amber-500';
    Icon = Folder;
  } else if (isClass) {
    borderColorClass = 'bg-purple-500';
    Icon = Box;
  } else if (!isFile) {
    borderColorClass = 'bg-node-function';
    Icon = FunctionSquare;
  } else if (data.label?.endsWith('.tsx') || data.label?.endsWith('.jsx')) {
    borderColorClass = 'bg-node-component';
    Icon = Layout;
  }

  return (
    <div className={`
      custom-node-outer relative rounded-xl bg-[#141419]/90 backdrop-blur-md border shadow-xl min-w-[240px] max-w-[280px] transition-all duration-200 hover:scale-[1.02] hover:bg-[#181822]/95 hover:shadow-2xl
      ${selected ? 'border-white ring-2 ring-white/30' : 'border-white/15 hover:border-white/30'}
    `}>
      {/* Compact Circle Content (shown automatically when zoom < 0.6 via .lod-low) */}
      <div className="lod-compact-circle hidden w-full h-full items-center justify-center relative">
        <div className={`absolute top-0 left-0 right-0 h-2.5 rounded-t-full ${borderColorClass}`} />
        <Icon className="w-11 h-11 text-white stroke-[2.2] drop-shadow-md" />
      </div>

      {/* Full Detailed Card Content (shown when zoom >= 0.6) */}
      <div className="lod-full-card w-full">
        <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-xl ${borderColorClass}`} />

        <div className="p-4 pt-5">
          <div className="flex items-center gap-3 mb-2">
            <Icon className="w-5 h-5 text-text-muted flex-shrink-0" />
            <h3 className="font-semibold text-text-main text-base truncate" title={data.label}>{data.label}</h3>
          </div>

          {data.apiEndpoint && (
            <div className="mb-2 flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded-md text-xs font-mono text-blue-300 truncate" title={`${data.apiEndpoint.httpMethod} ${data.apiEndpoint.routePath}`}>
              <Globe className="w-3 h-3 text-blue-400 flex-shrink-0" />
              <span className="font-bold text-blue-400">{data.apiEndpoint.httpMethod}</span>
              <span className="truncate">{data.apiEndpoint.routePath}</span>
            </div>
          )}

          {(data.path || data.file) && !isFolder && (
            <div className="bg-white/5 p-2 rounded-md text-[11px] text-text-muted font-mono truncate border border-white/10" title={data.path || data.file}>
              {data.path || data.file}
            </div>
          )}

          {isFolder && (
            <div className="bg-white/5 p-2 rounded-md text-[11px] text-amber-300 font-mono truncate border border-white/10" title={data.path}>
              Directory • {(data.files || []).length} files
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.functionType && (
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded border border-white/20 text-text-muted">
                {data.functionType}
              </span>
            )}
            {data.isExported && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Exported
              </span>
            )}
            {data.extendsClass && (
              <span className="text-[10px] bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20 truncate max-w-[140px]" title={`extends ${data.extendsClass}`}>
                ext: {data.extendsClass}
              </span>
            )}
            {data.implementsInterfaces && data.implementsInterfaces.length > 0 && (
              <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20 truncate max-w-[140px]">
                impl: {data.implementsInterfaces[0]}
              </span>
            )}
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-white !border-2 !border-[#141419] transition-transform hover:scale-125 z-10" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-white !border-2 !border-[#141419] transition-transform hover:scale-125 z-10" />
    </div>
  );
}

export default memo(CustomNodeComponent);
