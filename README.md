# Orbit — work & creative chatbot

Full-stack app: **Orbit** (personality + markdown replies), **OpenAI** or **Anthropic** for chat and prompt expansion, **Nano Banana Pro** via [fal.ai](https://fal.ai/models/fal-ai/nano-banana-pro/api) for images.

## Setup

1. Copy `.env.example` to `.env` and add keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `FAL_KEY`).
2. `npm install`
3. `npm run dev` — UI at [http://localhost:5173](http://localhost:5173), API at port `3001` (proxied).

## Production

`npm run build` then `NODE_ENV=production npm start` — serves `dist` from the API on port `3001`.

## Project layout

- `server/` — Express API (`/api/chat`, `/api/creativity`, `/api/image`, `/api/health`), system prompts in `personality.ts`
- `src/` — Vite + React UI
