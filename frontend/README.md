# Global Climate Intelligence Dashboard

Single-page Vite + React app focused entirely on live climate insights.

- **Dashboard**: Live temperature, humidity, wind, and solar irradiance charts (Open-Meteo + NASA POWER) with location picker/geolocation, weekly/monthly solar toggle, and curated climate headlines (NewsAPI).
- **AI Analyst**: Provider toggle (Azure OpenAI or Gemini), status-overlay pipeline, markdown responses, quick prompts (shuffleable), memory snippets, and clickable history to rehydrate query/response. It builds plans, fetches live telemetry, enriches prompts with nearby embeddings, and can store/search embeddings via the provided Chroma API gateway.
- **Settings**: All keys live only in `localStorage`—never bundled. Supports Azure endpoint + deployments, Azure-compatible key, Gemini key/model, and NewsAPI key.

## Tech

- React 18 + Vite 7, Bootstrap 5, Recharts, React Markdown (remark-gfm)
- Data: Open-Meteo, NASA POWER, NewsAPI
- AI: Azure OpenAI chat + embeddings (using your endpoint/deployments with an Azure-compatible key) or Gemini chat; optional Chroma add/search via Azure Function gateway

## Run locally

```bash
cd climate-dashboard
npm install
npm run dev
# open http://localhost:5173
```

Node 18+ recommended (project previously built on Node 22.x).

## Configure keys in the app (preferred)

Open **Settings** in the UI and paste:

- **NewsAPI Key** – enables live headlines
- **Azure OpenAI** – endpoint (e.g., `https://your-resource.openai.azure.com`), chat deployment, embedding deployment, API key
- **Gemini** – API key and model (e.g., `gemini-1.5-flash`)

All values are stored in `localStorage` only.

## Optional environment variables

If you prefer env wiring (or for CI):

```
VITE_AZURE_OPENAI_ENDPOINT=...
VITE_AZURE_OPENAI_API_KEY=...
VITE_AZURE_OPENAI_DEPLOYMENT=...
VITE_AZURE_OPENAI_EMBEDDING_DEPLOYMENT=...
VITE_CHROMA_INSERT_URL=https://climate-intelligence-api.azurewebsites.net/api/chroma-add-record   # optional
VITE_CHROMA_SEARCH_URL=https://climate-intelligence-api.azurewebsites.net/api/chroma-search-record # optional
```

If the Chroma URLs are unset, embedding features still run locally but skip remote storage/search.

## How the AI analyst works

1) **Plan**: Model receives a system/user prompt to emit a JSON array of location/time windows (one per city/period).
2) **Fetch**: For each plan, pulls Open-Meteo (temp/humidity/wind) and NASA POWER (solar) using start/end dates.
3) **Memory**: Creates an embedding for the current prompt; searches Chroma via the search endpoint for nearest memories.
4) **Final prompt**: Combines live data, plans, and top memory into a markdown response request.
5) **Response + persist**: Sends to Azure OpenAI (default) or Gemini, renders markdown, then optionally embeds `{query,response}` and posts to the Chroma add endpoint.
6) **UX**: Full-screen blurred loader shows live status (planning, fetching telemetry, retrieving insights, building prompt, generating, saving).

## Data sources

- **Open-Meteo** (no key): hourly temperature, humidity, wind; uses start/end dates.
- **NASA POWER** (no key): solar irradiance; start must precede end by at least one day.
- **NewsAPI**: climate headlines (requires key).
- **Chroma (optional)**: via Azure Function HTTPS endpoints for add/search records.

## Project layout

```
src/
├── App.jsx
├── components/           # cards, charts
├── data/mockClimateData.js # quick prompts, seeds
├── pages/                # DashboardPage, AnalystPage, SettingsPage
└── services/             # apiClient, climateService, aiAnalystService, newsService, apiKeyStore
public/vite.svg           # earth-globe favicon
```

## Usage tips

- Use “Use current location” on the dashboard or enter lat/lon manually; selection is saved to `localStorage`.
- On Analyst, pick provider (Azure OpenAI or Gemini); if keys are missing the button is greyed and prompts to update settings.
- Quick prompts can be refreshed (↻). Memory snippets show related past insights; click one to reload its query/response.
- The loader text shows the current pipeline stage.

## Deployment

Standard Vite build: `npm run build` (outputs to `dist/`). Host the static files on any CDN/static host. Ensure environment vars or `localStorage` keys are set in the target environment before use.

### Azure Function helper (optional Chroma gateway)

The repo includes an Azure Function under `azure/chroma-function` that exposes a `chroma-add-record` endpoint (and can be extended for search). This is used as a CORS-safe proxy to Chroma Cloud:

- Deploy the function (e.g., `func azure functionapp publish <your-app>`) and set its env for Chroma:
  - `CHROMA_API_KEY`
  - `CHROMA_TENANT`
  - `CHROMA_DATABASE`
  - `CHROMA_COLLECTION` (if applicable)
- The deployed sample endpoint in this project: `https://climate-intelligence-api.azurewebsites.net/api/chroma-add-record`
- Point the UI via `VITE_CHROMA_INSERT_URL` / `VITE_CHROMA_SEARCH_URL` to your function URLs.

If you don't need remote embedding storage/search, you can skip deploying the function; the app will still work locally without Chroma persistence.
