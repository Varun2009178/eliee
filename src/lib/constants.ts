export interface ExplanationResult {
  intro: string;
  essence: string;
  nodes: Array<{ id: string; label: string; type: string }>;
  connections: Array<{ from: string; to: string }>;
  gaps: string[];
  suggestions: string[];
  judgment?: string;
  mermaid?: string;
}

export const PERSONAS = {
  default: "Default",
};
