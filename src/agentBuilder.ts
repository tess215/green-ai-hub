/**
 * Agent Builder Engine
 * Supports 3 pathways:
 * 1. "Aus Vorlage" (Templates)
 * 2. "Selbst bauen" (4-step wizard)
 * 3. "Bauen lassen" (Prompt input, local similarity check >= 70% for 0 tokens, or Gemini AI generation)
 */

import { AGENT_TEMPLATES, AgentTemplate, AgentTask } from './config';
import { computeCombinedSimilarity } from './similarity';
import { AgentPolicy, parseAndValidatePolicyYaml, serializePolicyToYaml } from './policies';

export interface PromptMatchResult {
  template: AgentTemplate;
  similarity: number;
  percentage: number;
}

export function findMatchingTemplateForPrompt(promptText: string, threshold = 0.70): PromptMatchResult | null {
  if (!promptText || promptText.trim().length < 3) return null;

  let bestTemplate: AgentTemplate | null = null;
  let bestScore = 0;

  for (const t of AGENT_TEMPLATES) {
    const candidates = [
      t.name,
      t.description,
      ...t.tasks.map(task => task.text),
    ];

    for (const cand of candidates) {
      const score = computeCombinedSimilarity(promptText, cand);
      if (score > bestScore) {
        bestScore = score;
        bestTemplate = t;
      }
    }
  }

  if (bestTemplate && bestScore >= threshold) {
    return {
      template: bestTemplate,
      similarity: bestScore,
      percentage: Math.round(bestScore * 100),
    };
  }

  return null;
}

export async function generateAgentPolicyWithAi(userBrief: string): Promise<{
  policy: AgentPolicy;
  yamlContent: string;
  tokens: number;
  source: string;
}> {
  const prompt = `Erstelle eine Kolibri-Agentenrichtlinie für folgende Anforderung: "${userBrief}".
Folge exakt diesem YAML-Format mit deutschen Begriffen und ja/nein Werten:
# Richtlinie für [Name]
agent: [Name des Agenten]
icon: [eines aus: roboter, rechnung, kopfhoerer, kalender, code, aktentasche, megafon, lupe, herz, stern]
farbe: "[Hex-Farbcode]"

aufgaben:
  - text: [Aufgabenbeschreibung]
    haeufigkeit: [hoch|mittel|niedrig]
    personenbezogen: [ja|nein]

quellen:
  cache: [ja|nein]
  teamwissen: [ja|nein]
  websuche: [ja|nein]
  externe_ki: [ja|nein]

datenschutz:
  personenbezogene_daten: [nur_lokal|eigener_server|erlaubt]

anbieter:
  nur_gruen: [ja|nein]
  fallback_erlaubt: [ja|nein]

tagesbudget_tokens: [z.B. 15000]`;

  const resp = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      systemInstruction: 'Du bist der Richtlinien-Generator für Kolibri, eine nachhaltige KI-Pipeline. Erstelle eine saubere, vollständige YAML-Konfiguration für einen Agenten nach den Vorgaben. Gib NUR reinen YAML-Code ohne Markdown-Backticks zurück.',
      mode: 'agent_builder',
      maxOutputTokens: 500,
    }),
  });

  if (!resp.ok) {
    throw new Error('Fehler beim Aufruf des KI-Generators');
  }

  const data = await resp.json();
  let cleanYaml = data.text.replace(/```ya?ml/gi, '').replace(/```/g, '').trim();

  // Validate or fallback
  let parsed: AgentPolicy;
  try {
    const filename = (data.filename || 'neuer-agent.yaml').replace(/[^a-z0-9\-.]+/gi, '-');
    parsed = parseAndValidatePolicyYaml(cleanYaml, filename);
  } catch {
    cleanYaml = `# Richtlinie für Generierten Agenten
agent: Generierter Agent
icon: roboter
farbe: "#059669"

aufgaben:
  - text: Fachspezifische Anfragen bearbeiten
    haeufigkeit: hoch
    personenbezogen: nein

quellen:
  cache: ja
  teamwissen: ja
  websuche: ja
  externe_ki: ja

datenschutz:
  personenbezogene_daten: nur_lokal

anbieter:
  nur_gruen: ja
  fallback_erlaubt: nein

tagesbudget_tokens: 15000`;
    parsed = parseAndValidatePolicyYaml(cleanYaml, 'neuer-agent.yaml');
  }

  return {
    policy: parsed,
    yamlContent: cleanYaml,
    tokens: data.tokens || 110,
    source: data.source || 'gemini',
  };
}

export function createPolicyFromTemplate(template: AgentTemplate): AgentPolicy {
  const policyPartial: Partial<AgentPolicy> = {
    filename: template.filename,
    agent: template.name,
    icon: template.icon,
    farbe: template.color,
    aufgaben: [...template.tasks],
    quellen: { ...template.sources },
    datenschutz: { personenbezogene_daten: template.privacy },
    anbieter: { ...template.provider },
    tagesbudget_tokens: template.dailyBudgetTokens,
  };
  const yamlString = serializePolicyToYaml(policyPartial);
  return parseAndValidatePolicyYaml(yamlString, template.filename);
}
