// Vorverarbeitung vor dem Proxy, kein eigenes Pattern
/**
 * @file promptImprover.ts
 * Vorverarbeitung von Benutzer-Prompts vor dem Proxy-Aufruf.
 * 3-stufiger Ablauf:
 * 1. "Prüfe, ob das schon gefragt wurde …" (lokal, 0 Tokens, Schwellenwert 75%)
 * 2. "Verbessere Formulierung …" (Gemini / Mock mit Systemanweisung, max. 100 Tokens)
 * 3. "Prüfe nochmal mit verbessertem Text …" (lokal, 0 Tokens)
 *
 * Bietet Word-Diffing zur farblichen Hervorhebung (Korrekturen grün unterstrichen,
 * Ergänzungen fett) und Callback-Hooks für die UI-Statuszeile.
 */

import { globalCacheProxy } from "./cache";
import { findBestCacheMatch, SimilarityMatch } from "./similarity";
import { InitialCacheItem } from "./config";

export type ImproverStatusStep =
  | "idle"
  | "checking_existing"
  | "found_existing"
  | "improving_text"
  | "rechecking_cache"
  | "completed";

export interface DiffSegment {
  text: string;
  type: "unchanged" | "corrected" | "added";
}

export interface ImprovementResult {
  originalText: string;
  improvedText: string;
  diffSegments: DiffSegment[];
  tokensUsed: number;
  isEstimatedTokens: boolean;
  step1Match: SimilarityMatch<InitialCacheItem> | null;
  step3Match: SimilarityMatch<InitialCacheItem> | null;
}

/**
 * Erzeugt Wort-Diffs zwischen Original und verbessertem Text:
 * - "corrected": Korrekturen von Tippfehlern/Wortformen (grün unterstrichen)
 * - "added": Zusätzliche Präzisierungen/Ergänzungen (fett)
 * - "unchanged": Unveränderter Text
 */
export function computeWordDiff(original: string, improved: string): DiffSegment[] {
  const origWords = original.trim().split(/\s+/).filter(Boolean);
  const impWords = improved.trim().split(/\s+/).filter(Boolean);

  const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9äöüß]/g, "");

  const origClean = origWords.map(clean);
  const segments: DiffSegment[] = [];

  for (let i = 0; i < impWords.length; i++) {
    const word = impWords[i];
    const cWord = clean(word);

    // Exakte Übereinstimmung irgendwo im Original?
    const exactMatchIndex = origWords.findIndex((ow) => ow === word);
    if (exactMatchIndex !== -1) {
      segments.push({ text: word, type: "unchanged" });
      continue;
    }

    // Ähnliche Wurzel / Tippfehlerkorrektur?
    const fuzzyMatch = origClean.find((ow) => {
      if (!ow || !cWord) return false;
      return ow === cWord || (ow.length > 3 && cWord.startsWith(ow.slice(0, 3)));
    });

    if (fuzzyMatch) {
      // Wurde in der Schreibweise/Grammatik korrigiert
      segments.push({ text: word, type: "corrected" });
    } else {
      // Neues Wort hinzugefügt
      segments.push({ text: word, type: "added" });
    }
  }

  return segments;
}

/**
 * Fallback-Verbesserung im Mock-Modus (offline oder ohne API-Key)
 */
function localMockImprovement(text: string): { improved: string; tokens: number } {
  let cleaned = text.trim();

  // Häufige deutsche Tippfehler korrigieren
  cleaned = cleaned
    .replace(/funtioniert/gi, "funktioniert")
    .replace(/php unittest/gi, "PHPUnit-Test")
    .replace(/php 8\.3/gi, "PHP 8.3")
    .replace(/proxy patern/gi, "Proxy-Pattern")
    .replace(/colibri/gi, "Kolibri")
    .replace(/oekostrom/gi, "Ökostrom");

  // Erstes Zeichen groß
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Fragezeichen ergänzen, wenn eine Frage vorliegt
  if (!cleaned.endsWith("?") && !cleaned.endsWith(".") && !cleaned.endsWith("!")) {
    const lower = cleaned.toLowerCase();
    if (
      lower.startsWith("wie") ||
      lower.startsWith("was") ||
      lower.startsWith("warum") ||
      lower.startsWith("welche") ||
      lower.startsWith("wo") ||
      lower.startsWith("kann")
    ) {
      cleaned += "?";
    } else {
      cleaned += ".";
    }
  }

  // Präzisierungen für bekannte Themen
  if (cleaned.toLowerCase().includes("phpunit") && !cleaned.toLowerCase().includes("unit-test")) {
    cleaned = cleaned.replace(/test/gi, "Unit-Test");
  }

  const estimatedTokens = Math.max(12, Math.ceil(cleaned.length / 4) + 6);
  return { improved: cleaned, tokens: estimatedTokens };
}

/**
 * Führt den vollständigen 3-Stufen-Ablauf aus
 */
export async function runPromptImprover(
  prompt: string,
  onStatusChange?: (status: ImproverStatusStep, message: string) => void,
  options?: { skipStep1?: boolean }
): Promise<ImprovementResult> {
  const trimmed = prompt.trim();
  const allCacheEntries = globalCacheProxy.getAllEntries();

  // --- SCHRITT 1: Prüfe, ob das schon gefragt wurde … (lokal, 0 Tokens) ---
  let step1Match: SimilarityMatch<InitialCacheItem> | null = null;
  if (!options?.skipStep1) {
    onStatusChange?.("checking_existing", "Prüfe, ob das schon gefragt wurde …");
    await new Promise((r) => setTimeout(r, 320));

    step1Match = findBestCacheMatch(trimmed, allCacheEntries, 75);

    if (step1Match) {
      onStatusChange?.(
        "found_existing",
        `Schon beantwortet (${step1Match.similarity}% Ähnlichkeit): „${step1Match.matchedPrompt}“`
      );
      // Wenn Treffer existiert, beenden wir vor Schritt 2, damit die UI die Entscheidung abfragen kann
      return {
        originalText: trimmed,
        improvedText: trimmed,
        diffSegments: [{ text: trimmed, type: "unchanged" }],
        tokensUsed: 0,
        isEstimatedTokens: false,
        step1Match,
        step3Match: null,
      };
    }
  }

  // --- SCHRITT 2: Verbessere Formulierung … (Gemini oder Mock) ---
  onStatusChange?.("improving_text", "Verbessere Formulierung …");

  let improvedText = trimmed;
  let tokensUsed = 18;
  let isEstimatedTokens = true;

  try {
    const response = await fetch("/api/gemini/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: trimmed,
        systemInstruction:
          "Verbessere diese Frage an einen KI-Assistenten. Korrigiere Rechtschreibung und Grammatik, formuliere klar und präzise, erhalte die Bedeutung. Antworte nur mit der verbesserten Frage.",
        maxOutputTokens: 100,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.text && !data.isMock) {
        // Bereinigen von Anführungszeichen falls das Modell welche drumherum setzt
        let cleaned = data.text.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
          cleaned = cleaned.slice(1, -1).trim();
        }
        if (cleaned.startsWith("„") && cleaned.endsWith("“")) {
          cleaned = cleaned.slice(1, -1).trim();
        }
        improvedText = cleaned;
        tokensUsed = data.tokens?.total ?? Math.ceil(improvedText.length / 4);
        isEstimatedTokens = false;
      } else {
        // Mock-Modus
        const mockRes = localMockImprovement(trimmed);
        improvedText = mockRes.improved;
        tokensUsed = mockRes.tokens;
        isEstimatedTokens = true;
      }
    } else {
      const mockRes = localMockImprovement(trimmed);
      improvedText = mockRes.improved;
      tokensUsed = mockRes.tokens;
    }
  } catch (err) {
    console.warn("Gemini prompt improvement fallback:", err);
    const mockRes = localMockImprovement(trimmed);
    improvedText = mockRes.improved;
    tokensUsed = mockRes.tokens;
  }

  // --- SCHRITT 3: Prüfe nochmal mit verbessertem Text … (lokal, 0 Tokens) ---
  onStatusChange?.("rechecking_cache", "Prüfe nochmal mit verbessertem Text …");
  await new Promise((r) => setTimeout(r, 280));

  const step3Match = findBestCacheMatch(improvedText, allCacheEntries, 75);

  onStatusChange?.("completed", "Formulierung optimiert");

  const diffSegments = computeWordDiff(trimmed, improvedText);

  return {
    originalText: trimmed,
    improvedText,
    diffSegments,
    tokensUsed,
    isEstimatedTokens,
    step1Match,
    step3Match,
  };
}
