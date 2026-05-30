# SpinFork
Bring researchers and founders together with our recommendation platform - SpinFork.

## Folder Structure

```text
SpinFork/
├── backend/
│   ├── src/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── package.json
│   └── swagger-oauth-user-document-api.yaml
└── frontend/
		├── src/
		├── docker-compose.yml
		├── Dockerfile
		├── package.json
		└── .env.example
```

## Tech Stack

Frontend

- Next.js 16
- React 18
- TypeScript
- Tailwind CSS
- NextAuth v5 (Google provider)

Backend

- Node.js 20+
- Express
- PostgreSQL 16
- JSON Web Tokens (access + refresh)
- multer uploads
- zod validation


## Prerequisites

- Node.js
	- Frontend: 22+
	- Backend: 20+


## Quick Start

Because both apps default to port 3000, run one of the following approaches.

### Run both locally (recommended for development)

backend:

```bash
cd backend
cp .env.example .env
npm install
PORT=3000 npm run dev
```

frontend:

```bash
cd frontend
cp .env.example .env.local
npm install
PORT=3001 npm run dev
```

URLs:

- Backend: http://localhost:3000
- Frontend: http://localhost:3001

## Docker

### Backend with PostgreSQL

```bash
cd backend
cp .env.example .env
docker compose up --build
```

This starts:

- api service
- db service (PostgreSQL)

### Frontend container

```bash
cd frontend
cp .env.example .env.local
docker compose up --build
```

## Environment Variables

- Frontend env file: frontend/.env.local
- Backend env file: backend/.env


## License

MIT


