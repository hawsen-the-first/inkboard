# Inkboard

Inkboard is a tablet-first progressive web app that combines a kanban board with stylus-friendly sketching for each task. It is designed for Android Chrome, runs as a single-user app, and ships with Docker Compose for local deployment.

## Features

- Four-stage kanban board with drag-and-drop reordering
- Touch-friendly task editing and tag management
- Sketch capture per task using `react-sketch-canvas`
- Offline-ready PWA shell with cached assets
- MongoDB-backed Express API
- Production nginx container proxying `/api` to the backend

## Production setup

```bash
docker compose up --build
```

The frontend is served at `http://localhost:8080`.

## Development setup

Start MongoDB and the backend with Docker Compose:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Then start the frontend locally:

```bash
cd frontend
npm install
npm run dev
```

The development frontend runs on Vite's default port and proxies `/api` requests to `http://localhost:3001`.

## Project structure

- `backend/` - Express + TypeScript + Mongoose API
- `frontend/` - React + Vite PWA
- `docker-compose.yml` - production stack
- `docker-compose.dev.yml` - backend development stack
