# Community Manager

Schlankes, selbst gehostetes Verwaltungstool für Vereine. Version 1: Sitzungsprotokolle erstellen (ONLYOFFICE), ablegen, durchsuchen, als PDF abschließen und per Mail versenden.

Die vollständige Spezifikation steht in [docs/SPEZIFIKATION.md](docs/SPEZIFIKATION.md).

> **Sicherheitshinweis:** Es gibt noch keine Anmeldung. Betreibe das System nur in einem vertrauenswürdigen Netz (lokal oder per VPN).

## Voraussetzungen

- Node.js 22 oder neuer
- Docker (für PostgreSQL und den ONLYOFFICE Document Server)

## Einrichtung

```bash
cp .env.example .env
# APP_SECRET und ONLYOFFICE_JWT_SECRET in .env setzen, z. B.:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

npm install
npm run services:up   # PostgreSQL + ONLYOFFICE (erster Start lädt ca. 4 GB)
npm run dev           # Backend (Port 3000) + Frontend (Port 5173)
```

Danach ist die App unter <http://localhost:5173> erreichbar. Das Backend legt die Datenbanktabellen beim Start automatisch an.

### Mails in der Entwicklung (Mailpit)

`npm run services:up` startet zusätzlich [Mailpit](https://mailpit.axllent.org/). Es fängt alle Mails ab, nichts geht nach außen. Unter <http://localhost:8025> lassen sich die Mails samt HTML und Anhängen ansehen. Mail-Konto dafür in den Einstellungen: Host `127.0.0.1`, Port `1025`, Benutzer und Passwort beliebig.

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Backend und Frontend im Entwicklungsmodus |
| `npm run build` | Produktions-Build von Frontend und Backend |
| `npm run typecheck` | TypeScript-Prüfung aller Pakete |
| `npm test` | Unit-Tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run services:up` / `services:down` | Docker-Dienste starten/stoppen |

## Hinweise

- **npm-Override für `argparse`:** mammoth hängt an `argparse` 1.x, das `sprintf-js` (DoS-Lücke ohne Fix) mitbringt. `argparse` braucht mammoth nur für sein Kommandozeilen-Tool, daher erzwingt `package.json` Version 2.x. `npm ls` markiert das als „invalid“, Installation (`npm ci`) und Betrieb sind davon nicht betroffen.

## Aufbau

```
apps/backend    Fastify-API (TypeScript), Kysely + PostgreSQL
apps/frontend   React-SPA (Vite)
packages/shared Gemeinsame Typen und zod-Schemas
docs/           Spezifikation
```
