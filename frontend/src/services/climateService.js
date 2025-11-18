import { fetchNasaPower, fetchOpenMeteo } from './apiClient.js'

const DEFAULT_COORDS = { latitude: 37.7749, longitude: -122.4194 }

export async function combineLiveSnapshot({ solarWindow = 'weekly', coords = DEFAULT_COORDS } = {}) {
  const windowDays = solarWindow === 'monthly' ? 30 : 7
  const now = new Date()
  const start = formatNasaDate(addDays(now, -windowDays))
  const end = formatNasaDate(now)

  const [{ temperature, humidity, wind }, solar] = await Promise.all([
    fetchOpenMeteo(coords),
    fetchNasaPower({ ...coords, start, end }),
  ])

  const metrics = [
    buildTemperatureMetric(temperature),
    buildHumidityMetric(humidity),
    buildSolarMetric(solar),
  ]

  return {
    metrics,
    charts: {
      temperature: temperature.series,
      humidity: humidity.series,
      solar: solar.series,
    },
    solar: {
      average: solar.average,
      latest: solar.latest,
    },
    climateSummary: {
      timezone: temperature.timezone,
      temperature: {
        current: temperature.latest,
        average: temperature.average,
        high: temperature.high,
        low: temperature.low,
        unit: temperature.unit,
      },
      humidity: {
        current: humidity.latest,
        average: humidity.average,
        unit: humidity.unit,
      },
      wind: {
        current: wind.latest,
        average: wind.average,
        unit: wind.unit,
      },
    },
  }
}

function buildTemperatureMetric(temperature) {
  const anomaly = Number((temperature.average - 14).toFixed(2))
  return {
    id: 'temperature',
    label: 'Surface Temperature Anomaly',
    value: anomaly,
    unit: '°C vs. baseline',
    change: `${(temperature.latest - temperature.average).toFixed(1)}° vs 24h avg`,
    badge: 'Open-Meteo',
  }
}

function buildHumidityMetric(humidity) {
  const delta = humidity.latest - humidity.average
  return {
    id: 'humidity',
    label: 'Relative Humidity',
    value: Number(humidity.latest?.toFixed?.(1) ?? humidity.latest ?? 0),
    unit: humidity.unit ?? '%',
    change: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts vs 24h avg`,
    badge: 'Open-Meteo',
  }
}

function buildSolarMetric(solar) {
  const latestValue = solar.latest?.value ?? 0
  const delta = latestValue - solar.average
  return {
    id: 'solar',
    label: 'Solar Irradiance',
    value: Number(latestValue.toFixed(1)),
    unit: 'kWh/m²',
    change: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} vs window avg`,
    badge: 'NASA POWER',
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
