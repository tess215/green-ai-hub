/**
 * @file PromptImproverModal.tsx
 * 3-stufiger Prompt-Verbesserer mit Ähnlichkeits-Check:
 * 1. "Prüfe, ob das schon gefragt wurde …" (lokal, 0 Tokens)
 *    Treffer ab 75%: Vorschau-Karte "Schon beantwortet" mit Prozentwert und Buttons "Antwort sofort anzeigen" / "Trotzdem verbessern"
 * 2. "Verbessere Formulierung …" (Gemini / Mock mit Systemanweisung, max 100 Tokens)
 * 3. "Prüfe nochmal mit verbessertem Text …" (lokal, 0 Tokens)
 * Vorschau-Karte mit farbigen Diff-Markierungen (Korrekturen grün unterstrichen, Ergänzungen fett).
 */

import React, { useState, useEffect } from "react";
import {
  Wand2,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import {
  runPromptImprover,
  ImprovementResult,
  ImproverStatusStep,
} from "../promptImprover";
import "./PromptImproverModal.css";

interface PromptImproverModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputPrompt: string;
  onApplyImproved: (
    improvedPrompt: string,
    originalPrompt: string,
    tokensUsed: number,
    isEstimated: boolean
  ) => void;
  onInstantAnswer: (
    targetPrompt: string,
    originalPrompt: string,
    similarityScore: number
  ) => void;
}

export const PromptImproverModal: React.FC<PromptImproverModalProps> = ({
  isOpen,
  onClose,
  inputPrompt,
  onApplyImproved,
  onInstantAnswer,
}) => {
  const [currentStep, setCurrentStep] = useState<ImproverStatusStep>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [result, setResult] = useState<ImprovementResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startImprovement = async (skipStep1 = false) => {
    setIsLoading(true);
    setResult(null);

    try {
      const res = await runPromptImprover(
        inputPrompt,
        (step, msg) => {
          setCurrentStep(step);
          setStatusMessage(msg);
        },
        { skipStep1 }
      );

      setResult(res);
      setIsLoading(false);
    } catch (err) {
      console.error("Fehler beim Verbessern des Prompts:", err);
      setIsLoading(false);
      setStatusMessage("Fehler beim Optimieren. Bitte erneut versuchen.");
    }
  };

  useEffect(() => {
    if (isOpen && inputPrompt.trim()) {
      startImprovement(false);
    } else {
      setResult(null);
      setCurrentStep("idle");
      setIsLoading(false);
    }
  }, [isOpen, inputPrompt]);

  if (!isOpen) return null;

  return (
    <div
      className="improver-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="improver-title"
    >
      <div className="improver-modal-header">
        <div className="improver-modal-title" id="improver-title">
          <Wand2 style={{ width: 18, height: 18, color: "#be123c" }} aria-hidden="true" />
          <span>Prompt verbessern & Ähnlichkeits-Check</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="improver-close-btn"
          aria-label="Schließen"
        >
          <X style={{ width: 18, height: 18 }} aria-hidden="true" />
        </button>
      </div>

      {/* Status-Zeile während der Schritte */}
      {isLoading && (
        <div className="improver-status-bar" role="status">
          <div className="improver-spinner" aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Fall 1: Treffer in Schritt 1 (Schon beantwortet) */}
      {!isLoading && result?.step1Match && (
        <div className="improver-already-answered-card">
          <div className="improver-already-title">
            <Sparkles style={{ width: 18, height: 18, color: "#16a34a" }} aria-hidden="true" />
            <span>Schon beantwortet!</span>
          </div>

          <p style={{ fontSize: "13px", fontWeight: 600, color: "#14532d", margin: "4px 0" }}>
            Zu deiner Frage existiert bereits eine verifizierte Antwort im lokalen Eco-Cache:
          </p>

          <div className="improver-already-query">
            „{result.step1Match.matchedPrompt}“
          </div>

          <div className="improver-already-meta">
            Ähnlichkeit: <strong>{result.step1Match.similarity} %</strong> · 0 Tokens Aufwand · 100% CO2 vermieden
          </div>

          <div className="improver-actions-row">
            <button
              type="button"
              onClick={() => {
                onInstantAnswer(
                  result.step1Match!.item.prompt,
                  inputPrompt,
                  result.step1Match!.similarity
                );
                onClose();
              }}
              className="improver-btn-primary"
            >
              <Zap style={{ width: 15, height: 15 }} aria-hidden="true" />
              <span>Antwort sofort anzeigen (0 Tokens)</span>
            </button>

            <button
              type="button"
              onClick={() => startImprovement(true)}
              className="improver-btn-secondary"
            >
              <RotateCcw style={{ width: 14, height: 14 }} aria-hidden="true" />
              <span>Trotzdem verbessern</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="improver-btn-secondary"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Fall 2: Ergebnis der Verbesserung (Vorschau-Karte aus C) */}
      {!isLoading && result && !result.step1Match && (
        <div className="improver-diff-card">
          {/* Hinweis aus Schritt 3, falls mit dem verbesserten Text ein Cache-Treffer vorliegt */}
          {result.step3Match && (
            <div className="improver-step3-cache-notice">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: "#1d4ed8" }} aria-hidden="true" />
                <span>
                  <strong>Mit der korrigierten Fassung gefunden:</strong> „{result.step3Match.matchedPrompt}“ ({result.step3Match.similarity}% Ähnlichkeit)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onInstantAnswer(
                    result.step3Match!.item.prompt,
                    result.improvedText,
                    result.step3Match!.similarity
                  );
                  onClose();
                }}
                style={{
                  padding: "5px 12px",
                  backgroundColor: "#1d4ed8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Antwort sofort anzeigen
              </button>
            </div>
          )}

          {/* Dein Text */}
          <div className="improver-section-box">
            <div className="improver-section-label">Dein Text</div>
            <div className="improver-orig-text">{result.originalText}</div>
          </div>

          {/* Vorschlag mit farbig markierten Änderungen */}
          <div className="improver-section-box">
            <div className="improver-section-label">
              Vorschlag (Korrekturen grün unterstrichen, Ergänzungen fett)
            </div>
            <div className="improver-proposal-text">
              {result.diffSegments.map((seg, idx) => {
                if (seg.type === "corrected") {
                  return (
                    <span key={idx} className="prompt-diff-corrected" title="Korrigiert">
                      {seg.text}{" "}
                    </span>
                  );
                } else if (seg.type === "added") {
                  return (
                    <strong key={idx} className="prompt-diff-added" title="Ergänzt">
                      {seg.text}{" "}
                    </strong>
                  );
                } else {
                  return (
                    <span key={idx} className="prompt-diff-unchanged">
                      {seg.text}{" "}
                    </span>
                  );
                }
              })}
            </div>
          </div>

          {/* Kleine Zeile: Verbesserung: ca. N Tokens */}
          <div className="improver-tokens-note">
            <span>
              Verbesserung: ca. {result.tokensUsed} Tokens
              {result.isEstimatedTokens ? " (geschätzt)" : " (Gemini-Antwort)"}
            </span>
          </div>

          {/* Buttons: Übernehmen und Behalten wie es ist */}
          <div className="improver-actions-row">
            <button
              type="button"
              onClick={() => {
                onApplyImproved(
                  result.improvedText,
                  result.originalText,
                  result.tokensUsed,
                  result.isEstimatedTokens
                );
                onClose();
              }}
              className="improver-btn-coral"
            >
              <ArrowRight style={{ width: 16, height: 16 }} aria-hidden="true" />
              <span>Übernehmen</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="improver-btn-secondary"
            >
              Behalten wie es ist
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
