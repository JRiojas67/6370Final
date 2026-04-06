# BEAn — work & creative chatbot

Full-stack app: **BEAn** (personality + markdown replies), **OpenAI** or **Anthropic** for chat and prompt expansion, and two image engines: **Nano Banana Pro** on [fal.ai](https://fal.ai/models/fal-ai/nano-banana-pro/api) and **Reve** (`reve/create-image`) via [AI/ML API](https://docs.aimlapi.com/api-references/image-models/reve/reve-create-image).

## Setup

1. `npm install` — on first install, if `.env` is missing, a copy of `.env.example` is created as `.env`.
2. Open `.env` and paste your keys:
   - **`FAL_KEY`** — [fal.ai dashboard](https://fal.ai/dashboard) (Nano Banana Pro).
   - **`AIMLAPI_KEY`** — [AI/ML API](https://aimlapi.com/) (Reve `create-image`). Use both for the full image studio.
   - **`OPENAI_API_KEY`** / **`ANTHROPIC_API_KEY`** — for chat and “Expand with AI”.
3. `npm run dev` — UI at [http://localhost:5173](http://localhost:5173), API at port `3001` (proxied).

To recreate `.env` from the template again: `npm run setup:env` (only creates `.env` if it does not exist).

## Production

`npm run build` then `NODE_ENV=production npm start` — serves `dist` from the API on port `3001`.

## Project layout

- `server/` — Express API (`/api/chat`, `/api/creativity`, `/api/image`, `/api/health`), system prompts in `personality.ts`
- `src/` — Vite + React UI
