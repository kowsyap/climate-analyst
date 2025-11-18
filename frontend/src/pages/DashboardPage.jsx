import { useEffect, useState } from 'react'
import InsightCard from '../components/InsightCard.jsx'
import MetricCard from '../components/MetricCard.jsx'
import TrendChart from '../components/TrendChart.jsx'
import {  liveApiBlueprint, weeklyHighlights } from '../data/mockClimateData.js'
import { combineLiveSnapshot } from '../services/climateService.js'
import { fetchClimateNews } from '../services/newsService.js'

function DashboardPage() {
  const [metrics, setMetrics] = useState([])
  const [charts, setCharts] = useState({
    temperature: [],
    humidity: [],
    solar: [],
  })
  const [loadingLive, setLoadingLive] = useState(true)
  const [error, setError] = useState(null)
  const [solarSummary, setSolarSummary] = useState(null)
  const [climateSummary, setClimateSummary] = useState(null)
  const [newsItems, setNewsItems] = useState([])
  const [newsError, setNewsError] = useState(null)
  const [solarWindow, setSolarWindow] = useState('weekly')
  const initialCoords = () => {
    const stored = localStorage.getItem('climate:selected-coords')
    return stored ? JSON.parse(stored) : { latitude: null, longitude: null }
  }
  const [coords, setCoords] = useState(null)
  const [locationForm, setLocationForm] = useState(() => initialCoords())
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Dashboard | Climate Dashboard'
    return () => {
      document.title = previousTitle
    }
  }, [])

  function storeCoords(coords) {
    if (!coords?.latitude && !coords?.lon && !coords?.lat) return
    try {
      const normalized = {
        latitude: coords.latitude ?? coords.lat,
        longitude: coords.longitude ?? coords.lon,
      }
      localStorage.setItem('climate:selected-coords', JSON.stringify(normalized))
    } catch (error) {
      console.warn('Failed to store coords', error)
    }
  }

  const handleGeoLocate = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          latitude: Number(position.coords.latitude.toFixed(4)),
          longitude: Number(position.coords.longitude.toFixed(4)),
        }
        setCoords(nextCoords)
        storeCoords(nextCoords)
        setLocationForm(nextCoords)
        setLocationError(null)
        setLocating(false)
      },
      (err) => {
        setLocationError(err.message ?? 'Unable to access current location.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  useEffect(() => {
    let ignore = false
    setLoadingLive(true)
    if(coords === null) {
      handleGeoLocate()
    }
    combineLiveSnapshot({ solarWindow, coords })
      .then((snapshot) => {
        if (ignore || !snapshot) return
        setMetrics(snapshot.metrics ?? [])
        setCharts(snapshot.charts ?? { temperature: [], humidity: [], solar: [] })
        setSolarSummary(snapshot.solar ?? null)
        setClimateSummary(snapshot.climateSummary ?? null)
        setError(null)
      })
      .catch((err) => {
        if (ignore) return
        setError(err.message ?? 'Unable to load live climate data.')
      })
      .finally(() => {
        if (!ignore) setLoadingLive(false)
      })

    return () => {
      ignore = true
    }
  }, [solarWindow, coords])

  useEffect(() => {
    let ignore = false
    fetchClimateNews(3)
      .then((news) => {
        if (ignore) return
        setNewsItems(news)
        setNewsError(null)
      })
      .catch((err) => {
        if (ignore) return
        setNewsError(err.message ?? 'Unable to fetch latest climate news.')
      })

    return () => {
      ignore = true
    }
  }, [])

  const renderMetrics = () => {
    if (metrics.length === 0 && !loadingLive) {
      return (
        <div className="col-12">
          <div className="alert alert-warning mb-0">No live metrics available yet. Please retry in a moment.</div>
        </div>
      )
    }

    return metrics.map((metric) => (
      <div className="col-12 col-md-4" key={metric.id}>
        <MetricCard {...metric} />
      </div>
    ))
  }

  const solarWindowLabel = solarWindow === 'weekly' ? '7-day' : '30-day'

  const handleManualSubmit = (event) => {
    event.preventDefault()
    const lat = Number(locationForm.latitude)
    const lon = Number(locationForm.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const nextCoords = { latitude: lat, longitude: lon }
      setCoords(nextCoords)
      setLocationError(null)
    } else {
      setLocationError('Enter valid latitude and longitude values.')
    }
  }

  const handleLocationInput = (event) => {
    const { name, value } = event.target
    setLocationForm((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <>
      {loadingLive && (
        <div className="loading-overlay">
          <div className="text-center">
            <div className="spinner-border text-light" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-white-50 small mb-0">Fetching live telemetry…</p>
          </div>
        </div>
      )}

      <div className="d-flex flex-column gap-4">
        {error && (
          <div className="alert alert-danger mb-0" role="alert">
            {error}
          </div>
        )}

      <section className="card-glass p-4 p-lg-5">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-4">
          <div className="w-100">
            <p className="text-uppercase small text-muted mb-2">Mission Brief</p>
            <h2 className="h4 mb-2">Climate intelligence and anomaly tracker</h2>
            <p className="text-secondary mb-3">
              Visualize live temperature anomalies, humidity, wind, and solar flux while an AI analyst reasons over
              climate memory and breaking headlines.
            </p>
            <form className="row gy-2 gx-3 align-items-end" onSubmit={handleManualSubmit}>
              <div className="col-12 col-sm-4">
                <label htmlFor="latitude" className="form-label small text-muted text-uppercase fw-semibold">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-control"
                  id="latitude"
                  name="latitude"
                  value={locationForm.latitude}
                  onChange={handleLocationInput}
                  required
                />
              </div>
              <div className="col-12 col-sm-4">
                <label htmlFor="longitude" className="form-label small text-muted text-uppercase fw-semibold">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-control"
                  id="longitude"
                  name="longitude"
                  value={locationForm.longitude}
                  onChange={handleLocationInput}
                  required
                />
              </div>
              <div className="col-12 col-sm-4 d-flex gap-2">
                <button type="submit" className="btn btn-primary flex-fill">
                  Apply
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleGeoLocate}
                  disabled={locating}
                >
                  {locating ? 'Locating…' : 'Use Current'}
                </button>
              </div>
            </form>
            {locationError && <div className="alert alert-warning py-2 px-3 mt-3 mb-0">{locationError}</div>}
          </div>
        </div>
      </section>

      <section className="row g-3">{renderMetrics()}</section>

      <section className="row g-3">
        <div className="col-12 col-lg-4">
          <TrendChart
            title="Surface temperature (°C)"
            subtitle="Open-Meteo hourly anomalies"
            data={charts.temperature}
          />
        </div>
        <div className="col-12 col-lg-4">
          <TrendChart
            title="Relative humidity (%)"
            subtitle="Open-Meteo hourly humidity"
            color="#0ea5e9"
            data={charts.humidity}
          />
        </div>
        <div className="col-12 col-lg-4">
          <TrendChart
            title="Solar irradiance (kWh/m²)"
            subtitle={`NASA POWER · ${solarWindowLabel}`}
            color="#16a34a"
            data={charts.solar}
            actions={
              <div className="btn-group btn-group-sm" role="group" aria-label="Solar window toggle">
                {['weekly', 'monthly'].map((window) => (
                  <button
                    key={window}
                    type="button"
                    className={`btn btn-outline-primary ${solarWindow === window ? 'active' : ''}`}
                    onClick={() => setSolarWindow(window)}
                    aria-pressed={solarWindow === window}
                  >
                    {window === 'weekly' ? '7-day' : '30-day'}
                  </button>
                ))}
              </div>
            }
          />
        </div>
      </section>

      <section className="row g-3">
        {(newsItems.length ? newsItems : weeklyHighlights).map((item) => (
          <div className="col-12 col-md-4" key={item.id ?? item.title}>
            {newsItems.length ? (
              <div className="card-glass p-4 h-100 d-flex flex-column">
                <p className="text-uppercase small text-muted fw-semibold mb-1">
                  {new Date(item.publishedAt).toLocaleDateString() || 'Live feed'}
                </p>
                <h3 className="h6 mb-2">{item.title}</h3>
                <p className="text-secondary mb-3 flex-grow-1">{item.summary}</p>
                <a href={item.link} target="_blank" rel="noreferrer" className="fw-semibold small">
                  Read more · {item.source}
                </a>
              </div>
            ) : (
              <InsightCard {...item} />
            )}
          </div>
        ))}
        {newsError && (
          <div className="col-12">
            <div className="alert alert-info py-2 mb-0">{newsError}</div>
          </div>
        )}
      </section>

      <section className="row g-3">
        <div className="col-12 col-xl-6">
          <div className="card-glass p-4 h-100">
            <p className="text-uppercase small text-muted fw-semibold mb-1">Atmospheric Snapshot</p>
            {climateSummary ? (
              <>
                <h3 className="h6 mb-2">Surface · {climateSummary.timezone ?? 'UTC'}</h3>
                <p className="display-6 mb-1">
                  {typeof climateSummary.temperature.current === 'number'
                    ? climateSummary.temperature.current.toFixed(1)
                    : '—'}
                  <span className="fs-5 ms-1">{climateSummary.temperature.unit ?? '°C'}</span>
                </p>
                <p className="text-secondary mb-3">
                  Avg {climateSummary.temperature.average?.toFixed?.(1) ?? '—'} · High{' '}
                  {climateSummary.temperature.high?.toFixed?.(1) ?? '—'} · Low{' '}
                  {climateSummary.temperature.low?.toFixed?.(1) ?? '—'}
                </p>
                <div className="d-flex flex-column flex-sm-row gap-3">
                  <div>
                    <p className="small text-muted mb-1">Humidity</p>
                    <p className="mb-0">
                      {typeof climateSummary.humidity.current === 'number'
                        ? climateSummary.humidity.current.toFixed(1)
                        : '—'}
                      <span className="ms-1 text-secondary">{climateSummary.humidity.unit}</span>
                    </p>
                    <p className="text-secondary small mb-0">
                      Avg {climateSummary.humidity.average?.toFixed?.(1) ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="small text-muted mb-1">Wind</p>
                    <p className="mb-0">
                      {typeof climateSummary.wind.current === 'number'
                        ? climateSummary.wind.current.toFixed(1)
                        : '—'}
                      <span className="ms-1 text-secondary">{climateSummary.wind.unit}</span>
                    </p>
                    <p className="text-secondary small mb-0">
                      Avg {climateSummary.wind.average?.toFixed?.(1) ?? '—'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-secondary mb-0">Live climate signals will appear shortly.</p>
            )}
          </div>
        </div>
        <div className="col-12 col-xl-6">
          <div className="card-glass p-4 h-100">
            <p className="text-uppercase small text-muted fw-semibold mb-1">NASA Solar Snapshot</p>
            <h3 className="h6 mb-1">ALLSKY SFC SW DWN</h3>
            {solarSummary ? (
              <>
                <p className="mb-1">
                  <span className="display-6">
                    {typeof solarSummary.latest?.value === 'number'
                      ? solarSummary.latest.value.toFixed(1)
                      : '—'}
                  </span>
                  <span className="ms-2 text-secondary">kWh/m² latest</span>
                </p>
                <p className="text-secondary mb-0">
                  {solarWindowLabel} average{' '}
                  {typeof solarSummary.average === 'number' ? solarSummary.average.toFixed(1) : '—'} kWh/m² across the
                  selected lat/lon.
                </p>
              </>
            ) : (
              <p className="text-secondary mb-0">Waiting for NASA POWER feed…</p>
            )}
          </div>
        </div>
      </section>

      <section className="card-glass p-4">
        <div className="row g-4 align-items-center">
          <div className="col-12 col-lg-4">
            <h3 className="h5 mb-2">Live data feeds</h3>
            <p className="text-secondary mb-0">
              Each refresh hits the APIs below and stores normalized payloads for the AI analyst&apos;s reasoning loop or
              report writer.
            </p>
          </div>
          <div className="col-12 col-lg-8">
            <div className="row g-3">
              {liveApiBlueprint.map((source) => (
                <div className="col-12 col-md-4" key={source.title}>
                  <div className="h-100 border rounded-4 p-3 bg-body-secondary bg-opacity-25">
                    <p className="text-uppercase small text-muted mb-1">{source.title}</p>
                    <p className="small mb-2 text-secondary">{source.description}</p>
                    <a href={source.link} target="_blank" rel="noreferrer" className="small fw-semibold">
                      API docs →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  )
}

export default DashboardPage
