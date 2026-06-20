import { Handle, Position } from 'reactflow';
import { FileCode, FunctionSquare, Layout } from 'lucide-react';

export default function CustomNode({ data, selected }: { data: any, selected: boolean }) {
  const isFile = !data.functionType;
  
  let borderColorClass = 'bg-node-file';
  let Icon = FileCode;
  
  if (!isFile) {
    borderColorClass = 'bg-node-function';
    Icon = FunctionSquare;
  } else if (data.label?.endsWith('.tsx') || data.label?.endsWith('.jsx')) {
    borderColorClass = 'bg-node-component';
    Icon = Layout;
  }

  return (
    <div className={`
      relative rounded-xl bg-surface border shadow-lg min-w-[240px]
      ${selected ? 'border-brand ring-2 ring-brand ring-opacity-50' : 'border-border-subtle'}
    `}>
      <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-xl ${borderColorClass}`} />
      
      <div className="p-4 pt-5">
        <div className="flex items-center gap-3 mb-3">
          <Icon className="w-5 h-5 text-text-muted" />
          <h3 className="font-semibold text-text-main text-base truncate max-w-[180px]" title={data.label}>{data.label}</h3>
        </div>
        
        {data.path && (
          <div className="bg-bg-base p-2 rounded-md text-[11px] text-text-muted font-mono truncate border border-border-subtle max-w-[200px]" title={data.path}>
            {data.path}
          </div>
        )}
        
        {data.functionType && (
          <div className="mt-2 flex gap-2">
            <span className="text-[10px] bg-surface-active px-1.5 py-0.5 rounded border border-border-subtle text-text-muted">
              {data.functionType}
            </span>
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-brand !border-none" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-brand !border-none" />
    </div>
  );
}
