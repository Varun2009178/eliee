"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { cn } from "@/lib/utils";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize only once on client side
    try {
        mermaid.initialize({
            startOnLoad: false,
            theme: "base",
            securityLevel: "loose",
            flowchart: {
                useMaxWidth: false,
                htmlLabels: true,
                curve: 'basis',
                padding: 20,
                nodeSpacing: 50,
                rankSpacing: 50,
            },
            themeVariables: {
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: "20px", 
                primaryColor: "#f8fafc",
                primaryTextColor: "#334155",
                primaryBorderColor: "#e2e8f0",
                lineColor: "#94a3b8",
                background: "#ffffff",
                mainBkg: "#f8fafc",
                nodeBorder: "#e2e8f0",
            }
        });
        setIsInitialized(true);
    } catch(e) {
        console.error("Mermaid init failed", e);
    }
  }, []);

  useEffect(() => {
    if (!chart || !isInitialized) return;
    
    let fixedChart = chart.trim();
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
        mermaid.render(id, fixedChart)
        .then(({ svg: renderedSvg }) => {
            // Modify SVG for better scaling
            // Removed max-width restriction to allow full expansion
            let responsiveSvg = renderedSvg
                .replace(/max-width:[^;]*;/g, 'max-width: none;');
            setSvg(responsiveSvg);
            setError(null);
        })
        .catch((err) => {
            console.error("Mermaid render error:", err);
            setError(`Failed to render: ${err.message}`);
        });
    } catch (e: any) {
        console.error("Mermaid sync error:", e);
        setError(`Error: ${e.message}`);
    }
  }, [chart, isInitialized]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-rose-500 bg-rose-50/50 rounded-lg border border-rose-100">
        <p className="font-semibold mb-2">Diagram Error</p>
        <p className="text-sm text-center opacity-80 mb-4">{error}</p>
        <pre className="text-[10px] bg-white p-2 rounded border border-rose-100 overflow-auto max-w-full text-left">
            {chart.substring(0, 200)}...
        </pre>
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      className={cn("mermaid-container w-full h-full overflow-auto relative", className)}
    >
      <div 
        className="mermaid-svg-wrapper min-h-full min-w-full flex items-center justify-center p-8"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      
      <style jsx global>{`
        /* Allow SVG to define its own height naturally */
        .mermaid-svg-wrapper svg {
          height: auto !important;
          max-width: none !important;
        }
        
        .nodeLabel {
            font-size: 20px !important;
            font-weight: 500 !important;
            font-family: system-ui, -apple-system, sans-serif !important;
        }

        .node:hover rect, .node:hover circle, .node:hover polygon {
            stroke: #334155 !important;
            stroke-width: 3px !important;
            filter: drop-shadow(0 4px 6px -1px rgb(0 0 0 / 0.1));
            cursor: pointer;
        }
        
        .edgePath path {
          stroke: #94a3b8 !important;
          stroke-width: 2px !important;
        }
      `}</style>
    </div>
  );
};
