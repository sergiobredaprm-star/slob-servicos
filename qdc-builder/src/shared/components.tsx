
import React from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type ComponentType = 'breaker_1p' | 'breaker_2p' | 'idr_2p' | 'idr_4p' | 'dps' | 'connector';

interface DeviceProps {
  id: string;
  type: ComponentType;
  label: string;
  amps?: number;
  isOn?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  onPortClick?: (portId: string) => void;
}

export const DeviceComponent: React.FC<DeviceProps> = ({ 
  id, 
  type, 
  label, 
  amps, 
  isOn = true, 
  isSelected, 
  onClick,
  onPortClick 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  const isBreaker = type.startsWith('breaker');
  const isIDR = type.startsWith('idr');
  const isDPS = type === 'dps';
  const isConnector = type === 'connector';

  let width = 35;
  if (type === 'breaker_2p' || type === 'idr_2p' || type === 'dps') width = 70;
  if (type === 'idr_4p') width = 140;
  if (isConnector) width = 20;

  const getBodyColor = () => {
    if (isDPS) return 'bg-white border-red-500';
    if (isConnector) return 'bg-blue-800 border-blue-900';
    return 'bg-[#e2e8f0] border-slate-300';
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative flex flex-col items-center group cursor-default ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* Drag Handle Area (Top part) */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-0 inset-x-0 h-8 cursor-grab active:cursor-grabbing z-10" 
      />

      {/* Bornes Superiores (Ports) */}
      {!isConnector && (
        <div className="flex justify-around w-full absolute -top-3 px-2 z-20">
          <button 
            data-port-id={`${id}-in-1`}
            onClick={(e) => { e.stopPropagation(); onPortClick?.(`${id}-in-1`); }}
            className="w-4 h-4 bg-slate-600 rounded-full border-2 border-slate-400 hover:bg-yellow-400 transition-colors shadow-sm"
            title="Entrada 1"
          />
          {(type === 'breaker_2p' || isIDR) && (
            <button 
              data-port-id={`${id}-in-2`}
              onClick={(e) => { e.stopPropagation(); onPortClick?.(`${id}-in-2`); }}
              className="w-4 h-4 bg-slate-600 rounded-full border-2 border-slate-400 hover:bg-yellow-400 transition-colors shadow-sm"
              title="Entrada 2"
            />
          )}
        </div>
      )}

      {/* Corpo do Dispositivo */}
      <div className={`w-full ${isConnector ? 'h-[60px]' : 'h-[120px]'} ${getBodyColor()} border-x-2 rounded shadow-lg flex flex-col items-center py-2 relative overflow-hidden`}>
        <div className={`text-[5px] font-bold ${isDPS ? 'text-red-500' : 'text-slate-400'} mb-1`}>
          {isIDR ? 'DR SAFETY' : isDPS ? 'SURGE PROTECTOR' : 'ORÇA DIÁRIA PRO'}
        </div>

        {isIDR && (
          <div className="absolute top-8 right-2 w-4 h-4 bg-yellow-400 border border-yellow-600 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-[8px] font-black text-yellow-900">T</span>
          </div>
        )}

        {(isBreaker || isIDR) && (
          <div className="flex-1 flex items-center justify-center w-full relative">
            <div className="w-8 h-12 bg-slate-200 border border-slate-400 rounded shadow-inner flex flex-col items-center justify-between p-1">
               <div className={`w-6 h-4 rounded-sm transition-transform duration-200 shadow-sm ${isOn ? 'translate-y-0 bg-slate-100 border border-slate-300' : 'translate-y-6 bg-slate-300 border border-slate-400'}`} />
            </div>
          </div>
        )}

        {!isConnector && !isDPS && (
          <div className="mt-2 text-[9px] font-black text-slate-700 bg-white px-1 rounded border border-slate-200">
            {isIDR ? '30mA' : `C${amps}`}
          </div>
        )}
      </div>

      {/* Etiqueta Inferior */}
      <div className="mt-2 w-full text-center">
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter truncate block px-1">
          {label}
        </span>
      </div>

      {/* Bornes Inferiores (Ports) */}
      {!isConnector && (
        <div className="flex justify-around w-full absolute -bottom-3 px-2 z-20">
          <button 
            data-port-id={`${id}-out-1`}
            onClick={(e) => { e.stopPropagation(); onPortClick?.(`${id}-out-1`); }}
            className="w-4 h-4 bg-slate-600 rounded-full border-2 border-slate-400 hover:bg-yellow-400 transition-colors shadow-sm"
            title="Saída 1"
          />
          {(type === 'breaker_2p' || isIDR) && (
            <button 
              data-port-id={`${id}-out-2`}
              onClick={(e) => { e.stopPropagation(); onPortClick?.(`${id}-out-2`); }}
              className="w-4 h-4 bg-slate-600 rounded-full border-2 border-slate-400 hover:bg-yellow-400 transition-colors shadow-sm"
              title="Saída 2"
            />
          )}
        </div>
      )}
    </div>
  );
};

export const DINRail: React.FC<{ children: React.ReactNode, id: string }> = ({ children, id }) => {
  return (
    <div id={id} className="w-full h-[180px] relative flex items-center px-8 mb-16 bg-slate-200/30 rounded-lg border border-dashed border-slate-300">
      <div className="absolute inset-x-0 h-10 top-1/2 -translate-y-1/2 bg-gradient-to-b from-[#cbd5e1] via-[#94a3b8] to-[#cbd5e1] border-y border-slate-400 shadow-md flex items-center justify-around overflow-hidden">
         {Array.from({ length: 25 }).map((_, i) => (
           <div key={i} className="w-1.5 h-4 bg-slate-600/20 rounded-full" />
         ))}
      </div>
      <div className="relative z-10 flex items-end gap-1 w-full min-h-[120px]">
        {children}
      </div>
    </div>
  );
};

export const Busbar: React.FC<{ color: 'blue' | 'green' | 'red', position: 'top' | 'side' }> = ({ color, position }) => {
  const colors = {
    blue: 'bg-blue-600 border-blue-800',
    green: 'bg-emerald-600 border-emerald-800',
    red: 'bg-red-600 border-red-800'
  };
  
  return (
    <div className={`relative ${position === 'top' ? 'w-48 h-4' : 'w-4 h-32'} ${colors[color]} border-2 rounded-sm flex ${position === 'top' ? 'flex-row' : 'flex-col'} items-center justify-around p-0.5 shadow-lg`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="w-2 h-2 rounded-full bg-yellow-500 border border-yellow-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]" />
      ))}
    </div>
  );
};
