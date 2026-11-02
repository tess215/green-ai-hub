# Green AI Hub – Nachhaltige KI-Orchestrierung

Der **Green AI Hub** ist ein transparentes, ressourcenschonendes KI-Interface für Entwicklerteams. Er minimiert den Energie- und Token-Verbrauch durch eine intelligente Kaskade (Eco-Cache, Teamwissen, grüne Websuche und energieoptimierte Modellauswahl).

Die Architektur ist konsequent modular und trennt die einzelnen Zuständigkeiten über klassische **Design Pattern** in dedizierte Dateien, um eine einfache Weiterentwicklung in VS Code zu gewährleisten.

---

## 🏛️ Architektur & Design Patterns

Jedes Design Pattern ist in einer eigenen Datei gekapselt und oben mit einem entsprechenden Kommentar versehen:

| Datei | Design Pattern | Zweck |
|---|---|---|
| `src/cache.ts` | **Proxy Pattern** | Normalisieren von Anfragen, SHA256/String-Fingerprinting, Cache-Check und Ersparnisberechnung (100% Token gespart). |
| `src/chain.ts` | **Chain of Responsibility** | Sequenzielle Kaskade: `Cache` → `Teamwissen` → `Grüne Websuche` → `Externe KI`. Jeder Schritt ist steuerbar ("Nur lokal", "Vor externer KI fragen"). |
| `src/strategy.ts` | **Strategy Pattern** | `GreenStrategy` bewertet Anbieter nach Ökostrom-Score (0–100) und Parameter-Effizienz. Wählt Kolibri (3,46 Mrd. Parameter) für Standardaufgaben und Regolo.ai für komplexe Pläne, mit automatischem Fallback. |
| `src/adapter.ts` | **Adapter Pattern** | Einheitliches Interface (`prepareRequest`, `sendRequest`). Implementiert als `GeminiAdapter` (server-seitig via Express) und `MockAdapter` für zuverlässigen Offline-Betrieb. |
| `src/logger.ts` | **Audit-Trail** | Protokolliert jede Anfrage mit Trace-ID (z. B. `#a3f9`), erfasst Token-Bilanzen und generiert ZIP-Exporte mit JSON, CSV und Markdown. |
| `src/config.ts` | **Konfiguration** | Alle Testdaten (Anbieter, Scores, Teamwissen-Einträge, Ökostrom-Hosts, Vorschlags-Chips) sind hier ohne Programmierkenntnisse anpassbar. |

---

## 🚀 Voraussetzungen

- **Node.js** Version 18 oder höher (empfohlen: Node 20 LTS)
- **npm** Version 9 oder höher
- Optional: Ein **Google Gemini API Key** (`GEMINI_API_KEY`) für echte Modell-Antworten. Fehlt dieser, schaltet die Anwendung automatisch auf den integrierten `MockAdapter` um (vollständige Demo offline nutzbar).

---

## 💻 Lokales Starten (VS Code)

1. **Repository klonen / öffnen:**
   ```bash
   git clone <repository-url>
   cd react-example
   ```

2. **Abhängigkeiten installieren:**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen einrichten (optional):**
   Erstelle eine `.env`-Datei auf Basis von `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Trage deinen `GEMINI_API_KEY` ein (falls vorhanden):
   ```env
   GEMINI_API_KEY="dein_api_key_hier"
   ```

4. **Entwicklungsserver starten:**
   ```bash
   npm run dev
   ```
   Die App ist anschließend unter **http://localhost:3000** erreichbar.

5. **Produktions-Build:**
   ```bash
   npm run build
   npm start
   ```

---

## 🧪 Code-Qualität & Linting

Für sauberen und konsistenten Code:
```bash
npm run lint
```

---

## 🌿 Wichtige Kernfunktionen

1. **Für dich vorbereitet (Prewritten Prompts):**
   - 4 adaptive Chips über dem Eingabefeld, sortiert nach Nutzerthemen (z. B. PHP, Testing, Green Cloud).
   - Treffer im Cache sind mit einem blauen Blitz markiert und stehen automatisch ganz vorn.

2. **Verständliche Modellwahl:**
   - Schnelle Antwort (1 Blatt) → Wählt Kolibri (deutsches Leichtgewicht mit 3,46B Parametern)
   - Alltagsaufgabe (2 Blätter) → Wählt Kolibri
   - Große Aufgabe (3 Blätter, orange) → Startet den **Plan Mode** mit Teilschritten und wählt Regolo.ai

3. **Transparenter Kontext & Schranken:**
   - Einstellbar: Eco-Cache, Teamwissen, Gespräche, Grüne Websuche, Externe KI.
   - "Nur lokal" und "Vor externer KI fragen" verhindern unüberlegten externen Token-Verbrauch.

4. **Kassenbon & Audit-Protokoll:**
   - Detailbeleg im Quittungsstil mit Tokens, Ersparnis und Provider.
   - Protokoll-Tab mit Live-Kennzahlen, Kaskaden-Zeitleiste und ZIP-Export (`protokoll.json`, `protokoll.csv`, `zusammenfassung.md`).
