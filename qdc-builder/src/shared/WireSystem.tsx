
'use client';

import React, { useEffect, useState, useRef } from 'react';

interface PortPosition {
  id: string;
  x: number;
  y: number;
}

interface WireSystemProps {
  connections: { fromPort: string; toPort: string }[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const WireSystem: React.FC<WireSystemProps> = ({ connections, containerRef }) => {
  const [positions, setPositions] = useState<Record<string, PortPosition>>({});
  const requestRef = useRef<number>(0);

  const updatePositions = () => {
    if (!containerRef.current) return;

    const newPositions: Record<string, PortPosition> = {};
    const ports = containerRef.current.querySelectorAll('[data-port-id]');
    const containerRect = containerRef.current.getBoundingClientRect();

    ports.forEach((port) => {
      const portId = port.getAttribute('data-port-id');
      if (portId) {
        const rect = port.getBoundingClientRect();
        newPositions[portId] = {
          id: portId,
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
        };
      }
    });

    setPositions(newPositions);
    requestRef.current = requestAnimationFrame(updatePositions);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
      {connections.map((conn, idx) => {
        const start = positions[conn.fromPort];
        const end = positions[conn.toPort];

        if (!start || !end) return null;

        // Desenhar uma curva suave (Bezier)
        const midY = (start.y + end.y) / 2;
        const path = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;

        return (
          <g key={`${conn.fromPort}-${conn.toPort}-${idx}`}>
            <path 
              d={path} 
              stroke="#ef4444" 
              strokeWidth="3" 
              fill="none" 
              strokeLinecap="round"
              className="drop-shadow-[0_2px_4px_rgba(239,68,68,0.5)]"
            />
            {/* Sombras e brilho para realismo */}
            <path 
              d={path} 
              stroke="white" 
              strokeWidth="1" 
              fill="none" 
              strokeLinecap="round"
              strokeDasharray="2 10"
              className="opacity-30"
            />
          </g>
        );
      })}
    </svg>
  );
};
