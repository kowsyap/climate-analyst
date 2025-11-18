const USER_AGENT = 'ECE553-ClimateDashboard/1.0'

export async function fetchOpenMeteo({ latitude, longitude, startDate, endDate }) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    hourly: 'temperature_2m,relative_humidity_2m,windspeed_10m,precipitation',
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
    timezone: 'UTC',
  })

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!response.ok) {
    throw new Error('Open-Meteo request failed')
  }

  const payload = await response.json()
  const hours = payload?.hourly?.time ?? []
  const temperatures = payload?.hourly?.temperature_2m ?? []
  const humidity = payload?.hourly?.relative_humidity_2m ?? []
  const wind = payload?.hourly?.windspeed_10m ?? []

  if (!hours.length || !temperatures.length) {
    throw new Error('Open-Meteo hourly data missing')
  }

  return {
    temperature: normalizeSeries({
      hours,
      values: temperatures,
      unit: payload?.hourly_units?.temperature_2m ?? '°C',
      timezone: payload?.timezone ?? 'UTC',
    }),
    humidity: normalizeSeries({
      hours,
      values: humidity,
      unit: payload?.hourly_units?.relative_humidity_2m ?? '%',
      timezone: payload?.timezone ?? 'UTC',
    }),
    wind: normalizeSeries({
      hours,
      values: wind,
      unit: payload?.hourly_units?.windspeed_10m ?? 'km/h',
      timezone: payload?.timezone ?? 'UTC',
    }),
  }
}

function normalizeSeries({ hours, values, unit, timezone }) {
  const series = hours.map((timestamp, index) => ({
    label: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', hour12: false }),
    value: Number(values[index]),
  }))

  const average = series.reduce((sum, entry) => sum + entry.value, 0) / series.length

  return {
    series,
    latest: series.at(-1)?.value ?? null,
    average: Number(average.toFixed(2)),
    high: Math.max(...series.map((point) => point.value)),
    low: Math.min(...series.map((point) => point.value)),
    unit,
    timezone,
  }
}

export async function fetchNasaPower({ latitude, longitude, start, end }) {
  const params = new URLSearchParams({
    parameters: 'ALLSKY_SFC_SW_DWN',
    start,
    end,
    latitude,
    longitude,
    community: 'RE',
    format: 'JSON',
  })

  const response = await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${params}`)
  if (!response.ok) {
    throw new Error('NASA POWER request failed')
  }

  const payload = await response.json()
  const solar = payload?.properties?.parameter?.ALLSKY_SFC_SW_DWN
  if (!solar) {
    throw new Error('NASA POWER response missing ALLSKY data')
  }

  const entries = Object.entries(solar).filter(([, value]) => Number(value) > -900)

  const series = entries.map(([date, value]) => ({
    label: formatSolarLabel(date),
    value: Number(value),
  }))

  const latest = series.at(-1)
  const average = series.reduce((sum, entry) => sum + entry.value, 0) / series.length

  return {
    series,
    latest,
    average: Number(average.toFixed(1)),
  }
}

function formatSolarLabel(raw) {
  if (!raw) return '—'
  const month = raw.slice(4, 6)
  const day = raw.slice(6, 8)
  return `${month}-${day}`
}

export async function fetchAzureChat({ apiKey, endpoint, deployment, systemPrompt = '', userPrompt }) {
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-12-01-preview`
  const body = {
    model: deployment,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: userPrompt },
    ],
  }

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!r.ok) throw new Error(`Azure Chat Error: ${r.status}`)
  const json = await r.json()

  return json.choices?.[0]?.message?.content ?? ''
}

export async function createAzureEmbeddings({ apiKey, endpoint, deployment, inputTexts }) {
  const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=2024-12-01-preview`

  const body = {
    model: deployment,
    input: inputTexts,
  }

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!r.ok) throw new Error(`Azure Embedding Error: ${r.status}`)
  const json = await r.json()

  return json.data.map((d) => d.embedding)
}

export async function fetchGeminiChat({ apiKey, model, prompt }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`

  const body = {
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.1,
  }

  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!r.ok) {
    const text = await r.text()
    throw new Error(`Gemini Chat Error: ${r.status} ${text}`)
  }

  const json = await r.json()
  return json.choices?.[0]?.message?.content ?? ''
}
