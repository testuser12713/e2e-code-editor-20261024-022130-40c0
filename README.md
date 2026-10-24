# Forge

Forge ist ein schlanker, lokal arbeitender Code-Editor für Windows. Die Anwendung öffnet einen
Arbeitsbereichsordner und zeigt dessen Dateien in einem Baum, öffnet Dateien in Tabs mit
Syntaxhervorhebung und merkt sich Einstellungen, offene Tabs und Cursorpositionen. Sämtliche
Dateizugriffe laufen über eine schmale, abgesicherte Electron-Brücke und bleiben auf den geöffneten
Ordner beschränkt. Forge arbeitet vollständig offline: Es gibt kein Konto, keine Synchronisierung,
keine Telemetrie und während der Laufzeit keine HTTP- oder HTTPS-Anfrage.

## Technik

- **Sprache:** TypeScript
- **Desktop-Shell:** Electron mit getrenntem Main- und Preload-Prozess
- **Renderer:** React, gebündelt mit Vite
- **Editor:** Monaco Editor, lokal mitgeliefert
- **Python:** Python 3 des Betriebssystems, über `child_process.spawn` im Main-Prozess gestartet
- **Persistenz:** JSON-Dateien im Benutzerdatenverzeichnis von Electron (Einstellungen, Sitzung,
  zuletzt geöffnete Ordner)
- **Tests:** Vitest; Komponententests laufen mit jsdom
- **Paketierung:** electron-builder

## Dienst `app`

Das Produkt besteht aus genau einem Dienst aus `RUN.json`: **`app`**. Er ist die
Forge-Anwendung selbst (Verzeichnis `.`, Stack `electron`): Der Main-Prozess liegt in
`electron/`, der React-Renderer wird mit `npm run build` nach `dist/` gebaut. Die App läuft
lokal auf dem Rechner des Nutzers und benötigt keinen eigenen Server. Gestartet wird sie in der
Entwicklung mit `npm start` (baut den Renderer und öffnet das Electron-Fenster); `npm run build`
erzeugt allein die statische Oberfläche in `dist/`.

## Funktionen

- Arbeitsbereichsordner über den nativen Ordnerdialog öffnen; der Dateibaum zeigt Ordner zuerst,
  jeweils alphabetisch sortiert, und lässt sich auf- und zuklappen.
- Dateien in Tabs öffnen; ein bereits geöffneter Tab wird fokussiert statt dupliziert.
- Syntaxhervorhebung für JavaScript, TypeScript, JSON, HTML, CSS, SCSS, Python, Markdown, Shell,
  YAML und XML; die erkannte Sprache lässt sich in der Statusleiste umstellen.
- Python-Ausführung: die geöffnete `.py`-Datei mit „Run“ (`Strg+Enter`) starten oder mit
  „Check syntax“ (`Strg+Shift+B`) prüfen. Das Output-Panel unter dem Editor streamt stdout und
  stderr, nennt Exit-Code und Laufzeit, lässt sich stoppen und leert sich über „Clear“; ein Klick
  auf eine Zeilenangabe springt zur Fehlerzeile im Editor. Während eines Laufs zeigt die
  Statusleiste „Python: running“ mit Dateinamen, danach den letzten Exit-Code.
- Python-Autovervollständigung im Editor: Keywords, Builtins mit Signatur, Stdlib-Module und
  deren Member, Snippets, die Symbole der geöffneten Datei sowie die `.py`-Dateien des
  Arbeitsbereichs nach `import` und `from`.
- Änderungsmarkierung am Tab, Speichern mit `Strg+S`, alle geänderten Tabs speichern mit
  `Strg+Alt+S`; beim Schließen eines geänderten Tabs oder des Fensters erscheint ein
  Speichern-Dialog.
- Schnellöffnen mit `Strg+P`, Projektweite Suche mit `Strg+Shift+F` inklusive Groß-/Kleinschreibung,
  ganzem Wort, regulärem Ausdruck und abbrechbaren Suchen.
- Befehlspalette mit `Strg+Shift+P`; alle Befehle zeigen ihr Tastenkürzel.
- Dateiverwaltung im Baum: neue Datei, neuer Ordner, Umbenennen und Löschen mit
  Bestätigungsdialog und verständlichen Fehlermeldungen.
- Suchen und Ersetzen innerhalb einer Datei mit `Strg+F` beziehungsweise `Strg+H`.
- Statusleiste mit Sprache, Zeile:Spalte, Einrückung, Zeilenende und Kodierung.
- Einstellungen über das Zahnrad oder `Strg+,`: Theme (dunkel/hell), Schriftgröße 10–24,
  Tab-Größe 2/4/8, Wortumbruch, Leerzeichenanzeige und Schriftgröße des Dateibaums. Änderungen
  wirken sofort und bleiben nach einem Neustart erhalten.
- Sitzungswiederherstellung: zuletzt geöffneter Ordner, Tabs in ihrer Reihenfolge und
  Cursorpositionen; die Begrüßungsansicht listet die letzten fünf Ordner.
- Hilfe-Menü mit „About / Privacy“ und „Reset Local Data“.
- Alle Dateien bleiben auf dem Rechner. Die persistierten JSON-Dateien enthalten nur
  Einstellungswerte, Dateipfade und Cursorpositionen – niemals Dateiinhalte.
- Python-Ausgaben, Fehler und Pfade eines Laufs bleiben ausschließlich im Arbeitsspeicher des
  Panels. Sie werden nicht persistiert, nicht in Logs geschrieben und nicht über das Netzwerk
  gesendet; der Kindprozess erhält eine eigens aufgebaute Umgebung statt der Electron-Umgebung.

## Installation

Voraussetzung ist Node.js 22 oder neuer. Für die Python-Ausführung muss zusätzlich Python 3
installiert und im `PATH` des Systems verfügbar sein.

```bash
npm ci
```

`npm ci` installiert die exakt im Lockfile festgehaltenen Versionen. Ohne Lockfile kann alternativ
`npm install` verwendet werden.

## Entwicklung starten

Der folgende Befehl baut den Renderer und startet anschließend das Electron-Fenster:

```bash
npm run build && npm start
```

`npm start` führt den Renderer-Build selbst aus; `npm run build` lässt sich davon getrennt
verwenden, wenn nur der Renderer nach `dist/` gebaut werden soll.

## Produktionsbuild erstellen

```bash
npm run dist
```

Dieser Befehl baut den Renderer und erzeugt anschließend mit electron-builder das
Installationspaket für die aktuelle Plattform (unter Windows das Windows-Paket) im Ordner
`release/`.

## Tests

```bash
npm test
```

Die Suite läuft ohne grafische Oberfläche und prüft unter anderem die Pfadprüfung gegen den
Arbeitsbereich, den Dateibaum-Aufbau, die Shell-Struktur sowie die Hilfsfunktionen der
Schnittstelle.

## Bedienung

Beim Start erscheint das Hauptfenster mit Titelleiste, Aktivitätsleiste, Seitenleiste,
Tab-Leiste, Editorbereich und Statusleiste. Solange kein Ordner geöffnet ist, zeigt der
Editorbereich die Begrüßungsansicht mit „Open Folder“, „Open Recent“ und den wichtigsten
Tastenkürzeln.

Die Aktivitätsleiste schaltet die Seitenleiste zwischen Explorer, Suche und Einstellungen um.
Im Explorer öffnet ein Klick auf eine Datei einen Tab; ein Rechtsklick auf einen Eintrag öffnet
das Kontextmenü für die Dateiverwaltung. Die Statusleiste zeigt die Werte der aktiven Datei und
erlaubt das Umschalten der Sprache.

### Python

Ist eine `.py`-Datei aktiv, erscheint unter dem Editor das Output-Panel mit Dateiname,
Interpreter-Version und Laufzustand. „Run“ speichert die Datei bei Bedarf und startet sie;
„Stop“ beendet einen laufenden Prozess; „Check syntax“ kompiliert die Datei, ohne sie
auszuführen. Bei einem Syntaxfehler nennt das Panel Zeile, Spalte und die betroffene
Quellzeile, bei einer erfolgreichen Prüfung die Anzahl der Zeilen. Verweise auf Zeilen im
Arbeitsbereich sind anklickbar und setzen den Cursor im Editor. Läuft ein Skript länger als
60 Sekunden, wird es beendet. Im Browser-Build ohne Electron-Bridge bleiben Ausführung und
Syntaxprüfung sichtbar deaktiviert; die Autovervollständigung funktioniert dort unverändert.

### Tastenkürzel

| Aktion | Tastenkürzel |
| --- | --- |
| Explorer anzeigen | `Strg+Shift+E` |
| Projektweite Suche | `Strg+Shift+F` |
| Schnellöffnen | `Strg+P` |
| Befehlspalette | `Strg+Shift+P` |
| Speichern | `Strg+S` |
| Alle speichern | `Strg+Alt+S` |
| Suchen in Datei | `Strg+F` |
| Ersetzen in Datei | `Strg+H` |
| Python-Datei ausführen | `Strg+Enter` |
| Python-Syntax prüfen | `Strg+Shift+B` |
| Einstellungen | `Strg+,` |
| Ordner öffnen | `Strg+Shift+O` |

## Datenschutz und Sicherheit

- Der Renderer läuft mit `contextIsolation`, ohne `nodeIntegration` und in einer Sandbox.
- Jeder Dateizugriff geht über die feste Preload-Brücke. Der Main-Prozess löst jeden Pfad nach
  `realpath` auf und lehnt Pfade ab, die außerhalb des geöffneten Arbeitsbereichs liegen.
- Der HTML-Einstiegspunkt setzt eine Content-Security-Policy ohne entfernte Quellen. Navigation
  zu externen Adressen und neue Fenster werden verweigert; nur geprüfte `http(s)`-Adressen
  dürfen über den Main-Prozess an den Systembrowser gehen.
- Schriften, Icons und der Editor sind lokal gebündelt.
- Einstellungen, Sitzung und zuletzt geöffnete Ordner liegen als JSON im userData-Verzeichnis des
  Betriebssystems. „Reset Local Data“ löscht diese Dateien und stellt den Ausgangszustand her.

## Projektstruktur

- `electron/` – Main-Prozess, Preload-Brücke, Menü und Handler
- `electron/lib/` – Pfadprüfung und Dateibaum-Durchlauf
- `src/` – React-Renderer mit Shell, Ansichten, Zustand, Befehlen und UI-Kit
- `src/styles/` – Design-Tokens, Komponentenstile und lokale Schriften
- `tests/` – Vitest-Suite
- `dist/` – gebauter Renderer (wird beim Build erzeugt)
- `release/` – erzeugte Pakete (wird von `npm run dist` erzeugt)
