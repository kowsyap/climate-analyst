import {
  getAzureDeployment,
  getAzureEmbeddingDeployment,
  getAzureEndpoint,
  getGeminiKey,
  getGeminiModel,
  getOpenAiKey,
} from './apiKeyStore.js'
import { createAzureEmbeddings, fetchAzureChat, fetchGeminiChat, fetchNasaPower, fetchOpenMeteo } from './apiClient.js'

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash'

export async function runClimateAnalyst({
  prompt,
  liveSummary = '',
  provider = 'openai',
  coords = null,
  embedResponse = true,
  onStatus = () => {},
} = {}) {
  if (!prompt) {
    throw new Error('Prompt is required')
  }

  const baseCoords = coords || getStoredCoords()
  onStatus('Planning locations and dates...')
  const plans = await generatePlan({ prompt, provider, coords: baseCoords })

  onStatus('Fetching live telemetry data...')
  const data = await fetchClimateData(plans)

  onStatus('Retrieving similar insights...')
  const nearby = await persistEmbedding({ prompt, response: '', embedResponse: false })
  const topMemory = nearby?.[0]?.response ?? nearby?.[0] ?? ''

  onStatus('Building response prompt...')
  const enrichedPrompt = buildFinalPrompt({ prompt, plans, data, liveSummary, memoryContext: topMemory })

  onStatus('Generating tailored response...')
  const message = await runFinalModel({ provider, prompt: enrichedPrompt, systemPrompt: buildSystemPrompt() })

  onStatus('Saving insight to memory...')
  await persistEmbedding({ prompt, response: message, embedResponse })

  return { message, provider, plans, data, memorySnippets: nearby?.length ? nearby : undefined }
}

async function generatePlan({ prompt, provider, coords }) {
  const nowIso = new Date().toISOString()
  const coordText = coords
    ? `Current coordinates provided : lat ${coords.latitude}, lon ${coords.longitude}. For any named city/region, detect and use that location's own coordinates, otherwise use provided current location coordinates.`
    : 'No current coordinates provided; detect coordinates per city/region mentioned.'

  const systemPrompt = [
    'You are a climate parameter planner.',
    'Task: Return ONLY a JSON array of objects. Each object must have fields {"location":"string","lat":number,"lon":number,"start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD","notes":"string"}.',
    'If the user asks for multiple cities or time ranges, emit multiple objects—one per city/time slice. Each city/region must have its own coordinates.',
    'Use the provided current coordinates ONLY when the user implies the current location; otherwise, geocode each named place separately.',
    'Interpret the user query and choose appropriate coordinates and dates (today/tomorrow/next 7 days).',
    'If the user doesnt specify anything about place, use the current coordinates.',
    'Do not include prose or markdown—JSON array only.',
    `Current timestamp (UTC): ${nowIso}`,
  ].join('\n')

  const userPrompt = [coordText, `User query: ${prompt}`, 'Return JSON only.'].join('\n')

  const rawPlan = await runFinalModel({ provider, prompt: userPrompt, systemPrompt })
  const parsed = tryParseJson(rawPlan)
  if (!Array.isArray(parsed)) {
    throw new Error('Unable to parse locations from the model plan. Update the query or settings.')
  }
  return parsed
}

async function fetchClimateData(plans) {
  const results = []
  for (const plan of plans) {
    const { lat, lon, start_date: startDate, end_date: endDate } = plan
    const coords = { latitude: Number(lat), longitude: Number(lon) }

    // Normalize date range and guarantee start is before end for NASA POWER
    const endObj = endDate ? new Date(endDate) : new Date()
    let startObj = startDate ? new Date(startDate) : addDays(endObj, -7)
    if (startObj >= endObj) {
      startObj = addDays(endObj, -1)
    }
    const start = formatNasaDate(startObj)
    const end = formatNasaDate(endObj)

    const [{ temperature, humidity, wind }, solar] = await Promise.all([
      fetchOpenMeteo({ ...coords, startDate: startDate || formatHyphenDate(start), endDate: endDate || formatHyphenDate(end) }),
      fetchNasaPower({ ...coords, start, end }),
    ])

    results.push({ plan, coords, solar, temperature, humidity, wind })
  }
  return results
}

function buildFinalPrompt({ prompt, plans, data, liveSummary, memoryContext }) {
  const today = new Date().toISOString().slice(0, 10)
  const lines = [
    'You are a climate analyst. Use the provided live data to answer succinctly.',
    `Today: ${today}`,
    `User query: ${prompt}`,
    `Planned scopes: ${JSON.stringify(plans)}`,
    `Live summary: ${liveSummary || 'n/a'}`,
    memoryContext ? `Memory context: ${memoryContext}` : 'Memory context: none',
    'Data by plan:',
  ]

  data.forEach((entry, idx) => {
    const solarLatest = entry.solar.latest?.value ?? 'N/A'
    const solarAvg = entry.solar.average ?? 'N/A'
    const tempSeries = JSON.stringify(entry.temperature.series)
    const humiditySeries = JSON.stringify(entry.humidity.series)
    const windSeries = JSON.stringify(entry.wind.series)
    const solarSeries = JSON.stringify(entry.solar.series)
    lines.push(
      `Plan ${idx + 1} (${entry.plan.location || 'location'}):`,
      `- Temp avg: ${entry.temperature.average} ${entry.temperature.unit}, latest: ${entry.temperature.latest}`,
      `- Humidity avg: ${entry.humidity.average} ${entry.humidity.unit}, latest: ${entry.humidity.latest}`,
      `- Wind avg: ${entry.wind.average} ${entry.wind.unit}, latest: ${entry.wind.latest}`,
      `- Solar latest: ${solarLatest} kWh/m², window avg: ${solarAvg} kWh/m²`,
      `Raw series: temp=${tempSeries}; humidity=${humiditySeries}; wind=${windSeries}; solar=${solarSeries}`,
    )
  })

  lines.push('Provide a concise(if user query didnt ask for big or elaborated report) recommendation and cite metrics.')
  return lines.join('\n')
}

async function runFinalModel({ provider, prompt, systemPrompt }) {
  if (provider === 'gemini') {
    return runGemini(prompt, systemPrompt)
  }
  return runOpenAi(prompt, systemPrompt)
}

async function runOpenAi(userPrompt, systemPrompt) {
  const apiKey = getOpenAiKey()
  const endpointRaw = getAzureEndpoint()
  const endpoint = endpointRaw ? endpointRaw.replace(/\/$/, '') : ''
  const deployment = getAzureDeployment() || DEFAULT_OPENAI_MODEL

  if (!apiKey || !endpoint || !deployment) {
    throw new Error('Configure OpenAI key, endpoint, and deployment in Settings.')
  }

  return fetchAzureChat({
    apiKey,
    endpoint,
    deployment,
    systemPrompt,
    userPrompt,
  })
}

async function runGemini(userPrompt, systemPrompt) {
  const apiKey = getGeminiKey()
  const model = getGeminiModel() || DEFAULT_GEMINI_MODEL

  if (!apiKey || !model) {
    throw new Error('Configure Gemini key and model in Settings.')
  }

  return fetchGeminiChat({ apiKey, model, prompt: [systemPrompt, userPrompt].join('\n\n') })
}

function buildSystemPrompt() {
  return `You are an AI climate analyst. Blend live telemetry (temperature, humidity, wind, solar irradiance) with memory snippets to produce concise, actionable recommendations. Always cite the data source and propose a clear next action.`
}

async function persistEmbedding({ prompt, response, embedResponse = true }) {
  try {
    const apiKey = getOpenAiKey()
    const endpointRaw = getAzureEndpoint()
    const endpoint = endpointRaw ? endpointRaw.replace(/\/$/, '') : ''
    const deployment = getAzureEmbeddingDeployment()
    console.log(endpoint, deployment)
    if (!apiKey || !endpoint || !deployment) return []
    const content = embedResponse ? JSON.stringify({ query: prompt, response }) : prompt
    const embeddings = await createAzureEmbeddings({
      apiKey,
      endpoint,
      deployment,
      inputTexts: [content],
    })

    const embedding = embeddings[0]
    if (embedResponse) {
      const record = {
        prompt,
        response: content,
        embedding,
        timestamp: Date.now(),
      }
      await postToChromaEndpoint(record)
      return []
    } else {
      return await postToChromaSearch(embedding)
    }
  } catch (error) {
    console.warn('Embedding persistence failed', error)
    return []
  }
}

function tryParseJson(text) {
  try {
    const start = text.indexOf('[')
    const end = text.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error('no json array braces')
    return JSON.parse(text.slice(start, end + 1))
  } catch (error) {
    throw new Error('Could not parse parameters from the model response.')
  }
}

function addDays(date, days) {
  const clone = new Date(date)
  clone.setDate(clone.getDate() + days)
  return clone
}

function formatNasaDate(date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function getStoredCoords() {
  try {
    const stored = localStorage.getItem('climate:selected-coords')
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.warn('Failed to read stored coords', error)
    return null
  }
}

function formatHyphenDate(compact) {
  if (!compact || compact.length !== 8) return ''
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6)}`
}

async function postToChromaEndpoint(record) {
  const url =
    typeof import.meta !== 'undefined'
      ? import.meta.env.VITE_CHROMA_INSERT_URL ||
        'https://climate-intelligence-api.azurewebsites.net/api/chroma-add-record'
      : null
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: record.timestamp ? `mem-${record.timestamp}` : `mem-${Date.now()}`,
        prompt: record.prompt,
        response: record.response,
        embedding: record.embedding,
      }),
    })
  } catch (err) {
    console.warn('Posting to Chroma endpoint failed', err)
  }
}

async function postToChromaSearch(embedding) {
  const url =
    typeof import.meta !== 'undefined'
      ? import.meta.env.VITE_CHROMA_SEARCH_URL ||
        'https://climate-intelligence-api.azurewebsites.net/api/chroma-search-record'
      : null
  if (!url) return
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embedding }),
    })
    if (!resp.ok) throw new Error(`Chroma search failed: ${resp.status}`)
    const json = await resp.json()
  console.log('Chroma search results:', json)
    return Array.isArray(json?.documents) ? json.documents : []
  } catch (err) {
    console.warn('Posting to Chroma search endpoint failed', err)
    return []
  }
}
