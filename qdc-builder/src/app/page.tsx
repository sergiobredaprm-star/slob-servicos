
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { 
  Plus, 
  Trash2, 
  Download, 
  Zap,
  Calendar,
  Cpu,
  Sparkles,
  Loader2,
  ShieldCheck,
  Edit3,
  Link2,
  X
} from 'lucide-react';
import { DeviceComponent, DINRail, Busbar, ComponentType } from '@/shared/components';
import { WireSystem } from '@/shared/WireSystem';
import { getSmartSuggestions } from '@/server/actions';

interface Device {
  id: string;
  type: ComponentType;
  label: string;
  amps: number;
  railIndex: number;
}

interface Connection {
  id: string;
  fromPort: string;
  toPort: string;
}

export default function InteractiveQDCDesigner() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState('Quadro de Distribuição Inteligente');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Wiring State
  const [isWiringMode, setIsWiringMode] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setDevices([
      { id: '1', type: 'idr_2p', label: 'Proteção DR Geral', amps: 40, railIndex: 0 },
      { id: '2', type: 'dps', label: 'DPS Cl. II', amps: 0, railIndex: 0 },
      { id: '3', type: 'breaker_1p', label: 'Circuito 1 - Tomadas', amps: 20, railIndex: 1 },
    ]);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setDevices((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        // Se arrastou para outro trilho (lógica simplificada para protótipo)
        const updatedItems = arrayMove(items, oldIndex, newIndex);
        
        // Detecção de troca de trilho baseada no ID do container se disponível
        // Por agora, apenas reordenamos no mesmo array global
        return updatedItems;
      });
    }
  };

  const addDevice = (type: ComponentType, railIndex: number) => {
    const newDevice: Device = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      label: type.toUpperCase().replace('_', ' '),
      amps: type.startsWith('breaker') ? 20 : 0,
      railIndex
    };
    setDevices(prev => [...prev, newDevice]);
  };

  const updateDevice = (id: string, updates: Partial<Device>) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const handlePortClick = (portId: string) => {
    if (!isWiringMode) return;
    
    if (!pendingConnection) {
      setPendingConnection(portId);
    } else {
      if (pendingConnection !== portId) {
        setConnections(prev => [...prev, {
          id: `conn-${Date.now()}`,
          fromPort: pendingConnection,
          toPort: portId
        }]);
      }
      setPendingConnection(null);
    }
  };

  const handleAISuggestions = async () => {
    setIsLoadingAI(true);
    try {
      const res = await getSmartSuggestions(boardName, devices);
      setSuggestions(res);
    } catch (err) {
      setSuggestions(["Erro ao conectar com DeepSeek."]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const selectedDevice = devices.find(d => d.id === selectedId);

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-[#0f172a] text-slate-100 overflow-hidden font-sans">
        
        {/* Sidebar Esquerda: Ferramentas */}
        <aside className="w-72 bg-[#1e293b] border-r border-slate-800 p-5 flex flex-col gap-6 z-30 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Cpu className="text-white" size={20} />
            </div>
            <h2 className="text-md font-black tracking-tighter uppercase">QDC Designer PRO</h2>
          </div>

          <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Biblioteca</h3>
              <div className="grid grid-cols-2 gap-2">
                {['idr_2p', 'dps', 'breaker_1p', 'breaker_2p'].map((type) => (
                  <button 
                    key={type}
                    onClick={() => addDevice(type as ComponentType, 0)}
                    className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg border border-slate-700 transition-all text-center flex flex-col items-center"
                  >
                    <div className={`w-6 h-6 rounded-sm mb-1 ${type === 'dps' ? 'bg-red-500' : 'bg-slate-300'}`} />
                    <span className="text-[8px] font-bold uppercase">{type.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
               <button 
                onClick={() => setIsWiringMode(!isWiringMode)}
                className={`w-full py-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-2 border transition-all ${isWiringMode ? 'bg-yellow-500 text-black border-yellow-600 shadow-lg shadow-yellow-500/20' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
              >
                <Link2 size={14} />
                {isWiringMode ? 'MODO FIAÇÃO ATIVO' : 'ATIVAR MODO FIAÇÃO'}
              </button>
              
              <button 
                onClick={handleAISuggestions}
                disabled={isLoadingAI}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-bold text-[10px] flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50"
              >
                {isLoadingAI ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                DeepSeek Insight
              </button>
            </section>

            {suggestions.length > 0 && (
              <div className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-purple-400">
                  <ShieldCheck size={12} />
                  <span className="text-[8px] font-black uppercase">Relatório IA</span>
                </div>
                {suggestions.map((s, i) => (
                  <p key={i} className="text-[9px] text-slate-400 leading-tight">• {s}</p>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Workspace Central */}
        <main className="flex-1 bg-[#334155] p-10 overflow-auto flex flex-col items-center relative custom-scrollbar">
          
          {/* Header do Projeto */}
          <div className="w-[800px] mb-8 flex justify-between items-end">
            <div>
              <input 
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                className="bg-transparent text-3xl font-black text-white outline-none border-b-2 border-transparent focus:border-blue-500 transition-all w-full"
              />
              <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} /> {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="flex gap-2">
               <button className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400"><Download size={18}/></button>
            </div>
          </div>

          <div 
            ref={containerRef}
            className="bg-[#e2e8f0] w-[850px] min-h-[900px] rounded shadow-2xl p-10 relative border-[8px] border-slate-400"
          >
            {/* Busbars */}
            <div className="flex justify-around mb-12">
               <Busbar color="blue" position="top" />
               <Busbar color="green" position="top" />
            </div>

            <div className="space-y-4 relative">
              {/* Novo Sistema de Fiação Dinâmico */}
              <WireSystem connections={connections} containerRef={containerRef} />
              
              {pendingConnection && (
                <div className="absolute top-4 left-4 z-50 bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black animate-pulse shadow-lg">
                  CONECTANDO: {pendingConnection} (CLIQUE NO ALVO)
                </div>
              )}

              {[0, 1, 2].map((railIdx) => (
                <DINRail key={railIdx} id={`rail-${railIdx}`}>
                  <SortableContext 
                    items={devices.filter(d => d.railIndex === railIdx).map(d => d.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {devices.filter(d => d.railIndex === railIdx).map((device) => (
                      <DeviceComponent 
                        key={device.id}
                        id={device.id}
                        type={device.type}
                        label={device.label}
                        amps={device.amps}
                        isSelected={selectedId === device.id}
                        onClick={() => setSelectedId(device.id)}
                        onPortClick={handlePortClick}
                      />
                    ))}
                  </SortableContext>
                </DINRail>
              ))}
            </div>
          </div>

          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: '0.5' } }
            })
          }}>
            {activeId ? (
              <DeviceComponent 
                id={activeId}
                type={devices.find(d => d.id === activeId)?.type || 'breaker_1p'}
                label={devices.find(d => d.id === activeId)?.label || ''}
                amps={devices.find(d => d.id === activeId)?.amps || 0}
              />
            ) : null}
          </DragOverlay>
        </main>

        {/* Sidebar Direita: Propriedades */}
        <aside className={`w-80 bg-[#1e293b] border-l border-slate-800 p-6 flex flex-col gap-6 z-30 transition-all ${selectedId ? 'translate-x-0' : 'translate-x-full absolute right-0'}`}>
          {selectedDevice ? (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-black uppercase tracking-widest text-blue-400">Propriedades</h2>
                <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-white"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Etiqueta do Circuito</label>
                  <div className="relative">
                    <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                      type="text"
                      value={selectedDevice.label}
                      onChange={(e) => updateDevice(selectedDevice.id, { label: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Amperagem (A)</label>
                  <input 
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={selectedDevice.amps}
                    onChange={(e) => updateDevice(selectedDevice.id, { amps: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>10A</span>
                    <span className="text-blue-400">{selectedDevice.amps}A</span>
                    <span>100A</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-2">
                   <button 
                    onClick={() => {
                      setDevices(prev => prev.filter(d => d.id !== selectedId));
                      setSelectedId(null);
                    }}
                    className="w-full py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-2 border border-red-500/20"
                   >
                     <Trash2 size={14} /> EXCLUIR COMPONENTE
                   </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
               <Settings2 size={48} className="text-slate-500" />
               <p className="text-[10px] font-bold uppercase tracking-widest">Selecione um componente para editar</p>
            </div>
          )}
        </aside>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </DndContext>
  );
}

// Helper components missing from imports in this scope
function Settings2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  )
}
