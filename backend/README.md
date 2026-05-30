# OAuth User & Document API

Docker-fähige Backend-API mit **Google OAuth Login** (Authorization Code Flow),
**JWT Access Token**, **Refresh Token** (mit Rotation & Revokation) und
**Dokumentenverwaltung** mit Zugriffsschutz. Basiert auf
`swagger-oauth-user-document-api.yaml`.

Es gibt **keine echte App-UI** – nur eine kleine technische Testseite unter
[`/test-oauth`](http://localhost:3000/test-oauth).

## Tech-Stack

- Node.js 20 + Express
- PostgreSQL 16
- JWT (`jsonwebtoken`), Refresh Tokens in der DB (Hash, widerrufbar, rotierend)
- `multer` für Datei-Uploads (lokaler File Storage als Docker Volume)
- `zod` für Request-Validierung
- Reines Google OAuth ohne Passwort-Login (kein `passport`)

## Projektstruktur

```
.
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── public/
│   └── index.html              # Testseite unter /test-oauth
├── src/
│   ├── index.js                # Start: DB-Migration + Server
│   ├── app.js                  # Express-App, Middleware, Routen
│   ├── config.js               # Env-Konfiguration + sichere Defaults
│   ├── db.js                   # PG-Pool, Migration, waitForDb
│   ├── auth/
│   │   ├── tokens.js           # Access/Refresh/State Tokens
│   │   └── providers/google.js # Google OAuth Provider
│   ├── middleware/
│   │   ├── auth.js             # requireAuth (Bearer JWT)
│   │   ├── upload.js           # multer-Konfiguration
│   │   ├── validate.js         # zod-Validierung
│   │   └── errorHandler.js     # zentrales Error-Handling
│   ├── routes/                 # auth.js, users.js, documents.js
│   └── services/               # userService.js, documentService.js
└── swagger-oauth-user-document-api.yaml
```

## Endpunkte (Basis-Pfad `/v1`)

| Methode | Pfad | Auth | Beschreibung |
|--------|------|------|--------------|
| GET    | `/auth/oauth/google/login`    | – | Startet OAuth (Redirect zu Google) |
| GET    | `/auth/oauth/google/callback` | – | Tauscht Code gegen Tokens |
| POST   | `/auth/refresh`               | – | Neuer Access Token (Refresh Token Rotation) |
| POST   | `/auth/logout`                | ✓ | Widerruft Refresh Tokens |
| GET    | `/auth/me`                    | ✓ | Aktuelle Session |
| GET    | `/users/me`                   | ✓ | Eigenes Profil |
| PATCH  | `/users/me`                   | ✓ | Profil aktualisieren |
| GET    | `/documents`                  | ✓ | Eigene Dokumente listen |
| POST   | `/documents`                  | ✓ | Dokument hochladen (multipart, Feld `file`) |
| GET    | `/documents/{id}`             | ✓ | Dokument-Metadaten (nur eigene) |
| GET    | `/documents/{id}/download`    | ✓ | Datei herunterladen (Erweiterung) |
| DELETE | `/documents/{id}`             | ✓ | Dokument löschen (nur eigene) |

Geschützte Routen erwarten `Authorization: Bearer <accessToken>`.

---

## 1. Google OAuth Credentials einrichten

1. [Google Cloud Console](https://console.cloud.google.com/) öffnen → Projekt anlegen/wählen.
2. **APIs & Services → OAuth consent screen**: User Type *External* wählen,
   App-Namen + Support-E-Mail eintragen, Scopes `openid`, `email`, `profile`.
   In der Testphase eigene Google-Adresse unter *Test users* hinzufügen.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized redirect URIs** → siehe unten
4. Client ID und Client Secret kopieren und in `.env` eintragen
   (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

### Welche Redirect URI eintragen?

Exakt diese (für lokale Entwicklung):

```
http://localhost:3000/v1/auth/oauth/google/callback
```

Muss **buchstäblich identisch** zu `GOOGLE_REDIRECT_URI` in der `.env` sein.
Bei anderer Domain/Port/Pfad entsprechend anpassen (z.B. in Produktion
`https://api.example.com/v1/auth/oauth/google/callback`).

---

## 2. Projekt mit Docker starten

```bash
# 1. Env-Datei anlegen und ausfüllen (mind. Google-Credentials + Secrets)
cp .env.example .env

# Secrets erzeugen (Beispiel) und in .env eintragen:
openssl rand -hex 48   # für JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_STATE_SECRET, COOKIE_SECRET

# 2. Starten
docker compose up --build
```

- API: <http://localhost:3000>
- Testseite: <http://localhost:3000/test-oauth>
- PostgreSQL: `localhost:5432` (Volume `pgdata`)
- Uploads: Docker Volume `uploads` → `/app/uploads`

Das Schema wird beim Start automatisch migriert (idempotent). Stoppen mit
`docker compose down` (Daten bleiben), bzw. `docker compose down -v` löscht
auch die Volumes (DB + Uploads).

> Hinweis: `.env` setzt `NODE_ENV=development`, daher sind die Beispiel-Secrets
> zum Ausprobieren erlaubt. In Produktion `NODE_ENV=production` setzen – dann
> erzwingt die App echte (nicht `change-me`) Secrets.

---

## 3. API testen

### Variante A – über die Testseite (am einfachsten)

1. <http://localhost:3000/test-oauth> öffnen.
2. **Login with Google** klicken → Google-Login → zurück zur Seite.
3. Es werden Access/Refresh Token und die User-Daten (`GET /auth/me`) angezeigt.
4. Datei wählen → **Upload** → Dokument erscheint in der Liste.
5. **Download** / **Delete** pro Dokument testen, **Logout** beendet die Session.

Der Callback leitet zur Testseite zurück und übergibt die Tokens im
**URL-Fragment** (`#accessToken=...`), damit sie nicht in Server-Logs landen.

### Variante B – per curl

Tokens bekommst du am einfachsten über die Testseite (oben). Alternativ liefert
der Callback mit `Accept: application/json` bzw. `?format=json` JSON statt Redirect.

```bash
# Access Token aus der Testseite kopieren:
TOKEN="eyJ..."

# Eigenes Profil
curl -s http://localhost:3000/v1/users/me -H "Authorization: Bearer $TOKEN"

# Profil aktualisieren
curl -s -X PATCH http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"startup","description":"Mein Startup"}'

# Dokument hochladen
curl -s -X POST http://localhost:3000/v1/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./pitch-deck.pdf" -F "title=Pitch Deck"

# Eigene Dokumente listen
curl -s http://localhost:3000/v1/documents -H "Authorization: Bearer $TOKEN"

# Access Token erneuern
curl -s -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" -d '{"refreshToken":"<REFRESH_TOKEN>"}'

# Dokument löschen
curl -s -X DELETE http://localhost:3000/v1/documents/<documentId> \
  -H "Authorization: Bearer $TOKEN" -i

# Logout
curl -s -X POST http://localhost:3000/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN" -i
```

---

## Sicherheit & Design-Entscheidungen

- **Kein Passwort-Login** – ausschließlich OAuth (Google als erster Provider;
  Architektur erlaubt weitere Provider via `src/auth/providers/`).
- **CSRF-Schutz im OAuth-Flow**: signiertes `state`-Token + `nonce` in einem
  httpOnly-Cookie, das beim Callback abgeglichen wird.
- **Refresh Tokens** liegen gehasht (SHA-256) in der DB, werden bei jedem
  Refresh **rotiert** und beim Logout **widerrufen**. Access Tokens sind kurz
  lebende, stateless JWTs.
- **Zugriffsschutz Dokumente**: Lesen/Löschen/Download nur für den Eigentümer
  (`403` bei fremden, `404` bei nicht existierenden Dokumenten).
- **Validierung** aller Requests mit `zod`; **Upload-Limits** (Größe + MIME-Whitelist),
  serverseitig generierte Dateinamen (kein Path-Traversal).
- **Einheitliche Fehler** im `ErrorResponse`-Schema mit sinnvollen HTTP-Codes
  (`400/401/403/404/413/500`).
- Container läuft als **non-root** User, mit Healthcheck und Security-Headern.

## Lokale Entwicklung ohne Docker (optional)

```bash
npm install
# PostgreSQL lokal bereitstellen und .env anpassen (POSTGRES_HOST=localhost, UPLOAD_DIR=./uploads)
npm run dev
```
