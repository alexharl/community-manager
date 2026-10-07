# Community Manager

Schlankes, selbst gehostetes Verwaltungstool für Vereine. Version 1: Sitzungsprotokolle erstellen (ONLYOFFICE), ablegen, durchsuchen, als PDF abschließen und per Mail versenden.

Die vollständige Spezifikation steht in [docs/SPEZIFIKATION.md](docs/SPEZIFIKATION.md).

## Sicherheit

> **Es gibt noch keine Anmeldung.** Wer die App erreicht, kann alle Dokumente lesen, ändern, löschen und über die hinterlegten Mail-Konten versenden. Betreibe das System daher **nur in einem vertrauenswürdigen Netz** (lokal oder per VPN) und mache es nicht öffentlich im Internet erreichbar.

- `APP_SECRET` verschlüsselt die SMTP-Passwörter in der Datenbank. Geht es verloren oder wird es geändert, lassen sich die Passwörter nicht mehr entschlüsseln und müssen in den Einstellungen neu eingegeben werden. Die `.env` gehört daher ins Backup, aber nie ins Git-Repository.
- `ONLYOFFICE_JWT_SECRET` sichert die Kommunikation zwischen App und Document Server ab und muss auf beiden Seiten gleich sein (Docker Compose übernimmt das aus der `.env`).
- Hochgeladene Logos werden am Dateiinhalt geprüft; SVG-Logos werden mit einer Content-Security-Policy ausgeliefert, die Skripte unterbindet.

## Entwicklung

### Voraussetzungen

- Node.js 22 oder neuer
- Docker (PostgreSQL, ONLYOFFICE Document Server, Mailpit)

### Einrichtung

```bash
cp .env.example .env
# APP_SECRET und ONLYOFFICE_JWT_SECRET in .env setzen, z. B.:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

npm install
npm run services:up   # PostgreSQL, ONLYOFFICE (erster Start lädt ca. 5 GB), Mailpit
npm run dev           # Backend (Port 3000) + Frontend (Port 5173)
```

Danach ist die App unter <http://localhost:5173> erreichbar. Das Backend legt die Datenbanktabellen beim Start automatisch an. ONLYOFFICE braucht nach dem ersten Start ein bis zwei Minuten, bis der Editor lädt.

### Mails in der Entwicklung (Mailpit)

[Mailpit](https://mailpit.axllent.org/) fängt alle Mails ab, nichts geht nach außen. Unter <http://localhost:8025> lassen sich die Mails samt HTML und Anhängen ansehen. Mail-Konto dafür in den Einstellungen: Host `127.0.0.1`, Port `1025`, Benutzer und Passwort beliebig.

### Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Backend und Frontend im Entwicklungsmodus |
| `npm run build` | Produktions-Build von Frontend und Backend |
| `npm run typecheck` | TypeScript-Prüfung aller Pakete |
| `npm test` | Unit-Tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run services:up` / `services:down` | Docker-Dienste starten/stoppen |

## Betrieb

### Starten

Die App läuft als ein Container (`app`), der Backend und Frontend ausliefert, zusammen mit PostgreSQL und dem ONLYOFFICE Document Server:

```bash
cp .env.example .env   # Secrets setzen (siehe oben)
docker compose --profile prod up -d --build
```

Die App ist dann unter `http://<server>:3080` erreichbar (Port über `APP_PORT` änderbar). Mailpit startet im Produktivbetrieb nicht.

Wichtige Einstellungen in der `.env`:

| Variable | Bedeutung |
|---|---|
| `ONLYOFFICE_PUBLIC_URL` | Adresse, unter der **der Browser** den Document Server erreicht, z. B. `https://office.verein.example` |
| `APP_SECRET`, `ONLYOFFICE_JWT_SECRET` | Secrets (siehe [Sicherheit](#sicherheit)) |
| `POSTGRES_*` | Zugangsdaten der Datenbank |
| `TZ` | Zeitzone für Titel und Ablageordner (Standard `Europe/Berlin`) |
| `EVENTS_SOURCE`, `EVENTS_URL` | Veranstaltungen für smarte Vorlagen, z. B. `wp-fullcalendar` und die `admin-ajax.php`-Adresse der Vereinswebseite (Standard `none` = keine) |

Die Adressen der Container untereinander (`http://onlyoffice`, `http://app:3000`) setzt Docker Compose selbst.

### Smarte Vorlagen

Vorlagen können einen Inhalt mit Platzhaltern haben (z. B. `{titel}`, `{#tage(-6, -1)}…{/}`), der beim Anlegen eines Dokuments einmalig befüllt wird – inklusive Veranstaltungen der Vereinswebseite mit Link. Die Platzhalter-Hilfe steht direkt in der Vorlage; Details in [Kapitel 14 der Spezifikation](docs/SPEZIFIKATION.md#14-smarte-vorlagen-v11). Für Veranstaltungen braucht der App-Container Zugriff auf die konfigurierte Webseite; ist sie nicht erreichbar, entsteht das Dokument trotzdem (mit Hinweis).

### Reverse-Proxy und HTTPS

Browser müssen sowohl die App als auch den Document Server erreichen. Hinter einem Reverse-Proxy mit HTTPS, z. B. Caddy:

```
verein.example        { reverse_proxy localhost:3080 }
office.verein.example { reverse_proxy localhost:8090 }
```

Dazu `ONLYOFFICE_PUBLIC_URL=https://office.verein.example` setzen. Der Document Server benötigt WebSockets; Caddy leitet sie automatisch weiter, bei nginx müssen `Upgrade`- und `Connection`-Header gesetzt werden.

### Aktualisieren

```bash
git pull
docker compose --profile prod up -d --build
```

Datenbank-Migrationen laufen beim Start automatisch.

### Backup und Wiederherstellung

Zu sichern sind drei Dinge, die zusammengehören: die **Datenbank**, die **Dateien** (DOCX, PDF, Vorlageninhalte, Logo im Volume `appdata`) und die **`.env`**.

```bash
# Sichern
docker compose exec -T db pg_dump -U cm -Fc cm > backup-db.dump
docker run --rm -v community-manager_appdata:/data -v "$PWD":/backup alpine \
  tar czf /backup/backup-dateien.tgz -C /data .

# Wiederherstellen (App vorher stoppen: docker compose --profile prod stop app)
docker compose exec -T db pg_restore -U cm -d cm --clean --if-exists < backup-db.dump
docker run --rm -v community-manager_appdata:/data -v "$PWD":/backup alpine \
  tar xzf /backup/backup-dateien.tgz -C /data
```

## Bekannte Einschränkungen

- **ONLYOFFICE Community Edition:** höchstens 20 gleichzeitige Verbindungen. Die mobilen Editoren sind in dieser Edition nur lesend; deshalb nutzt die App auch auf dem Handy die Desktop-Oberfläche – voll bearbeitbar, aber eng.
- **Mailtext:** Der Dokumentinhalt wird als einfaches HTML übernommen (Überschriften, Fett/Kursiv, Listen, Tabellen, Bilder). Farben und Schriftgrößen entfallen bewusst; die originalgetreue Fassung ist die angehängte PDF.
- **Ein Prozess:** Mails werden im Backend-Prozess zugestellt. Wird der Server während eines Versands neu gestartet, gilt dieser als fehlgeschlagen und lässt sich erneut auslösen.

## Hinweise

- **npm-Override für `argparse`:** mammoth hängt an `argparse` 1.x, das `sprintf-js` (DoS-Lücke ohne Fix) mitbringt. `argparse` braucht mammoth nur für sein Kommandozeilen-Tool, daher erzwingt `package.json` Version 2.x. `npm ls` markiert das als „invalid“, Installation (`npm ci`) und Betrieb sind davon nicht betroffen.

## Aufbau

```
apps/backend    Fastify-API (TypeScript), Kysely + PostgreSQL
apps/frontend   React-SPA (Vite)
packages/shared Gemeinsame Typen, zod-Schemas und Logik (z. B. Versandgruppen)
docs/           Spezifikation
Dockerfile      Produktiv-Image (Backend liefert das Frontend aus)
```
