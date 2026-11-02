/**
 * Entscheidungsschicht, Teil 1: Welcher Agent ist zuständig? Lokal, ohne KI.
 * Analysiert Anfragen deterministisch anhand von erkannten Schlüsselwörtern,
 * Aufgaben-Ähnlichkeit und gelernten Korrekturen.
 */

import { AgentPolicy } from './policies';
import { normalizeText, levenshteinSimilarity, computeCombinedSimilarity } from './similarity';

export type RoutingMode = 'auto' | 'always_ask' | 'off';

export interface AgentScore {
  policy: AgentPolicy;
  score: number; // 0 to 100
  recognizedWords: string[];
  taskScore: number;
  keywordScore: number;
}

export interface LearnedRoute {
  id: string;
  normalizedQuery: string;
  originalQuery: string;
  agentFilename: string;
  agentName: string;
  agentColor?: string;
  timestamp: number;
}

export interface AgentRoutingResult {
  type: 'auto_selected' | 'clarification_needed' | 'general_assistant' | 'learned' | 'off';
  selectedAgent: AgentPolicy | null;
  score: number;
  allScores: AgentScore[];
  recognizedWords: string[];
  explanation: string;
  isLearned?: boolean;
  candidate1?: AgentScore;
  candidate2?: AgentScore;
  ruleFile?: string;
}

const LEARNED_ROUTES_STORAGE_KEY = 'kolibri_learned_agent_routes';
const ROUTING_MODE_STORAGE_KEY = 'kolibri_agent_routing_mode';

export class AgentRouterService {
  private learnedRoutes: LearnedRoute[] = [];
  private routingMode: RoutingMode = 'auto';
  private lastResult: AgentRoutingResult | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const savedRoutes = localStorage.getItem(LEARNED_ROUTES_STORAGE_KEY);
      if (savedRoutes) {
        this.learnedRoutes = JSON.parse(savedRoutes);
      }
      const savedMode = localStorage.getItem(ROUTING_MODE_STORAGE_KEY) as RoutingMode;
      if (savedMode && ['auto', 'always_ask', 'off'].includes(savedMode)) {
        this.routingMode = savedMode;
      }
    } catch {
      // Ignore storage errors in sandbox
    }
  }

  private saveState() {
    try {
      localStorage.setItem(LEARNED_ROUTES_STORAGE_KEY, JSON.stringify(this.learnedRoutes));
      localStorage.setItem(ROUTING_MODE_STORAGE_KEY, this.routingMode);
    } catch {
      // Ignore
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public getRoutingMode(): RoutingMode {
    return this.routingMode;
  }

  public setRoutingMode(mode: RoutingMode): void {
    this.routingMode = mode;
    this.saveState();
  }

  public getLearnedRoutes(): LearnedRoute[] {
    return [...this.learnedRoutes];
  }

  public addLearnedRoute(query: string, agent: AgentPolicy): void {
    const norm = normalizeText(query);
    if (!norm) return;

    // Remove existing identical route
    this.learnedRoutes = this.learnedRoutes.filter(r => r.normalizedQuery !== norm);

    this.learnedRoutes.unshift({
      id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      normalizedQuery: norm,
      originalQuery: query.trim(),
      agentFilename: agent.filename,
      agentName: agent.agent,
      agentColor: agent.farbe,
      timestamp: Date.now(),
    });

    // Keep max 50 learned routes
    if (this.learnedRoutes.length > 50) {
      this.learnedRoutes = this.learnedRoutes.slice(0, 50);
    }

    this.saveState();
  }

  public removeLearnedRoute(id: string): void {
    this.learnedRoutes = this.learnedRoutes.filter(r => r.id !== id);
    this.saveState();
  }

  public clearLearnedRoutes(): void {
    this.learnedRoutes = [];
    this.saveState();
  }

  public getLastResult(): AgentRoutingResult | null {
    return this.lastResult;
  }

  /**
   * Main routing decision logic (0 Tokens, strictly local)
   */
  public routeQuery(query: string, allPolicies: AgentPolicy[]): AgentRoutingResult {
    const normQuery = normalizeText(query);

    if (this.routingMode === 'off') {
      const res: AgentRoutingResult = {
        type: 'off',
        selectedAgent: null,
        score: 0,
        allScores: [],
        recognizedWords: [],
        explanation: 'Agentenwahl ist deaktiviert (Aus). Standard-Assistent aktiv.',
      };
      this.lastResult = res;
      this.notify();
      return res;
    }

    // Step 0: Check learned mappings (Part E)
    if (this.learnedRoutes.length > 0 && normQuery.length > 3) {
      for (const route of this.learnedRoutes) {
        const sim = computeCombinedSimilarity(normQuery, route.normalizedQuery);
        if (normQuery === route.normalizedQuery || sim >= 0.85) {
          const targetPolicy = allPolicies.find(p => p.filename === route.agentFilename);
          if (targetPolicy) {
            const res: AgentRoutingResult = {
              type: 'learned',
              selectedAgent: targetPolicy,
              score: 100,
              allScores: allPolicies.map(p => ({
                policy: p,
                score: p.filename === targetPolicy.filename ? 100 : 0,
                recognizedWords: p.filename === targetPolicy.filename ? ['Gelernt'] : [],
                taskScore: 0,
                keywordScore: 100,
              })),
              recognizedWords: ['Gelernt aus früherer Korrektur'],
              explanation: `${targetPolicy.agent} übernimmt · gelernt (Ähnlichkeit zu früherer Frage: ${Math.round(sim * 100)}%)`,
              isLearned: true,
              ruleFile: targetPolicy.filename,
            };
            this.lastResult = res;
            this.notify();
            return res;
          }
        }
      }
    }

    // Step 1: Tokenize query into words
    const queryWords = normQuery.split(' ').filter(w => w.length >= 2);

    // Step 2: Score each agent
    const scores: AgentScore[] = allPolicies.map(policy => {
      let keywordScore = 0;
      const recognizedWords: string[] = [];

      const keywords = policy.erkennt || [];
      for (const kw of keywords) {
        const normKw = normalizeText(kw);
        if (!normKw) continue;

        // Check if keyword is part of query
        if (normQuery.includes(normKw)) {
          keywordScore += 55;
          recognizedWords.push(kw);
          continue;
        }

        // Fuzzy match against individual query words
        for (const qw of queryWords) {
          if (qw === normKw) {
            keywordScore += 55;
            recognizedWords.push(kw);
            break;
          }
          // Substring match for longer words (e.g. rechnungsbetrag contains rechnung)
          if ((qw.length >= 5 && normKw.length >= 4 && (qw.includes(normKw) || normKw.includes(qw)))) {
            keywordScore += 45;
            recognizedWords.push(kw);
            break;
          }
          // Levenshtein similarity for typos (e.g. "rechung" vs "rechnung")
          const lev = levenshteinSimilarity(qw, normKw);
          if (lev >= 0.78 && Math.abs(qw.length - normKw.length) <= 2) {
            keywordScore += 40;
            recognizedWords.push(`${kw} (Tippfehler "${qw}")`);
            break;
          }
        }
      }

      // Step 3: Similarity to defined agent tasks
      let taskScore = 0;
      if (policy.aufgaben && policy.aufgaben.length > 0) {
        let maxTaskSim = 0;
        for (const task of policy.aufgaben) {
          const sim = computeCombinedSimilarity(normQuery, task.text);
          if (sim > maxTaskSim) {
            maxTaskSim = sim;
          }
        }
        if (maxTaskSim >= 0.35) {
          taskScore = Math.round(maxTaskSim * 45);
        }
      }

      const totalScore = Math.min(100, keywordScore + taskScore);

      return {
        policy,
        score: totalScore,
        recognizedWords: Array.from(new Set(recognizedWords)),
        taskScore,
        keywordScore,
      };
    });

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);

    const top1 = scores[0];
    const top2 = scores[1];

    // Mode: always_ask
    if (this.routingMode === 'always_ask' && top1 && top1.score >= 35) {
      const res: AgentRoutingResult = {
        type: 'clarification_needed',
        selectedAgent: null,
        score: top1.score,
        allScores: scores,
        recognizedWords: top1.recognizedWords,
        candidate1: top1,
        candidate2: top2 && top2.score >= 20 ? top2 : undefined,
        explanation: `Modus "Immer nachfragen" aktiv: Bitte wähle den zuständigen Agenten.`,
      };
      this.lastResult = res;
      this.notify();
      return res;
    }

    // Step 4: Decision conditions
    // C3: Ein Agent liegt bei mindestens 60 und mindestens 20 Punkte vor dem zweiten
    if (top1 && top1.score >= 60 && (!top2 || top1.score - top2.score >= 20)) {
      const wordsText = top1.recognizedWords.length > 0
        ? `'${top1.recognizedWords.slice(0, 3).join("', '")}' erkannt`
        : `Aufgaben-Ähnlichkeit ${top1.taskScore} Punkte`;

      const runnerUpText = top2 && top2.score > 0
        ? `deutlich vor ${top2.policy.agent} (${top2.score})`
        : 'keine Konkurrenz';

      const res: AgentRoutingResult = {
        type: 'auto_selected',
        selectedAgent: top1.policy,
        score: top1.score,
        allScores: scores,
        recognizedWords: top1.recognizedWords,
        ruleFile: top1.policy.filename,
        explanation: `${top1.policy.agent} gewählt: ${wordsText}, ${top1.score} Punkte, ${runnerUpText}.`,
      };
      this.lastResult = res;
      this.notify();
      return res;
    }

    // C4: Zwei Agenten liegen knapp beieinander
    if (top1 && top2 && top1.score >= 45 && top2.score >= 30 && (top1.score - top2.score < 20)) {
      const res: AgentRoutingResult = {
        type: 'clarification_needed',
        selectedAgent: null,
        score: top1.score,
        allScores: scores,
        recognizedWords: Array.from(new Set([...top1.recognizedWords, ...top2.recognizedWords])),
        candidate1: top1,
        candidate2: top2,
        explanation: `Zwei Agenten liegen nah beieinander: ${top1.policy.agent} (${top1.score} Pkt.) und ${top2.policy.agent} (${top2.score} Pkt.).`,
      };
      this.lastResult = res;
      this.notify();
      return res;
    }

    // C5: Kein Agent erreicht 60 Punkte -> Allgemeiner Assistent
    const res: AgentRoutingResult = {
      type: 'general_assistant',
      selectedAgent: null,
      score: top1 ? top1.score : 0,
      allScores: scores,
      recognizedWords: top1 ? top1.recognizedWords : [],
      explanation: top1 && top1.score > 0
        ? `Kein Agent erreicht 60 Punkte (${top1.policy.agent} hat nur ${top1.score} Pkt.). Allgemeiner Assistent übernimmt.`
        : 'Keine passenden Fachbegriffe erkannt. Allgemeiner Assistent übernimmt.',
    };
    this.lastResult = res;
    this.notify();
    return res;
  }
}

export const globalAgentRouter = new AgentRouterService();
