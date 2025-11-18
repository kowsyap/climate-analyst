import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { quickPrompts } from '../data/mockClimateData.js'
import { getGeminiKey, getGeminiModel, getOpenAiKey, getAzureDeployment } from '../services/apiKeyStore.js'
import { runClimateAnalyst } from '../services/aiAnalystService.js'

function AnalystPage() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [memorySnippets, setMemorySnippets] = useState([])
  const [quickSuggestions, setQuickSuggestions] = useState(() =>
    [...quickPrompts].sort(() => Math.random() - 0.5).slice(0, 3),
  )
  const [modelProvider, setModelProvider] = useState('openai')
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState(null)
  const [progressLog, setProgressLog] = useState([])

  const shufflePrompts = () => {
    setQuickSuggestions([...quickPrompts].sort(() => Math.random() - 0.5).slice(0, 3))
  }

  const handleQuery = async (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const missingProvider =
      modelProvider === 'openai'
        ? !getOpenAiKey() || !getAzureDeployment()
        : !getGeminiKey() || !getGeminiModel()

    if (missingProvider) {
      setError('Please add the required API key/model in Settings before querying.')
      return
    }

    setIsThinking(true)
    setError(null)
    setProgressLog(['Starting climate analysis...'])

    try {
      const aiResponse = await runClimateAnalyst({
        prompt: trimmed,
        provider: modelProvider,
        onStatus: (msg) => setProgressLog((prev) => [...prev, msg]),
      })
      setResponse(aiResponse.message)
      const parsedMemory = normalizeMemories(aiResponse.memorySnippets)
      setMemorySnippets(parsedMemory)
    } catch (err) {
      setError(err.message ?? 'Unable to reach the climate analyst.')
    } finally {
      setIsThinking(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    handleQuery(prompt)
  }

  const handleSuggestion = (suggestion) => {
    setPrompt(suggestion)
    handleQuery(suggestion)
  }

  const handleClear = () => {
    setPrompt('')
    setResponse('')
    setError(null)
  }

  const openAiLabel = (() => {
    const deployment = getAzureDeployment()
    return deployment ? `Azure OpenAI (${deployment})` : 'Azure OpenAI'
  })()

  const geminiLabel = (() => {
    const model = getGeminiModel()
    return model ? `Gemini (${model})` : 'Gemini'
  })()

  const openAiAvailable = Boolean(getOpenAiKey() && getAzureDeployment())
  const geminiAvailable = Boolean(getGeminiKey() && getGeminiModel())

  const handleGeoLocate = () => {
    const stored = localStorage.getItem('climate:selected-coords')
    if (stored) return
    if (!navigator.geolocation) {
      setError((prev) => prev ?? 'Geolocation not supported in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: Number(position.coords.latitude.toFixed(4)),
          longitude: Number(position.coords.longitude.toFixed(4)),
        }
        localStorage.setItem('climate:selected-coords', JSON.stringify(coords))
      },
      (err) => {
        setError((prev) => prev ?? err.message ?? 'Unable to access current location.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  useEffect(() => {
    handleGeoLocate()
  }, [])

  useEffect(() => {
    handleGeoLocate()
  }, [])

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Analyst | Climate Dashboard'
    return () => {
      document.title = previousTitle
    }
  }, [])

  const memoriesToRender = memorySnippets
  const formatSnippet = (text) => {
    if (!text) return ''
    const plain = text.replace(/[#*_`>-]/g, '').replace(/\s+/g, ' ').trim()
    return plain.length > 140 ? `${plain.slice(0, 137)}...` : plain
  }

  return (
    <div className="row g-4 position-relative">
      {isThinking && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
          style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(6px)', zIndex: 2000 }}
        >
          <div className="d-flex justify-content-center mb-3">
            <div className="spinner-border text-primary" role="status" aria-label="loading" />
          </div>
          <p className="fw-semibold text-primary mb-2">Preparing your climate insight…</p>
          <p className="text-muted small mb-0">{progressLog[progressLog.length - 1] || 'Starting up...'}</p>
        </div>
      )}
      <div className="col-12 col-lg-7 d-flex flex-column gap-3">
        <form onSubmit={handleSubmit} className="card-glass p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <p className="text-uppercase small text-muted mb-1">Climate Analyst</p>
            </div>
            {isThinking && <span className="badge text-bg-info text-dark">Working…</span>}
          </div>
          <div className="mb-3">
            <label htmlFor="prompt" className="form-label text-muted small fw-semibold text-uppercase">
              Query
            </label>
            <textarea
              id="prompt"
              className="form-control"
              rows={3}
              placeholder="Ask a question"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isThinking}
            />
          </div>
          <div className="mb-3">
            <label className="form-label text-muted small fw-semibold text-uppercase">Model</label>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className={`btn btn-outline-primary btn-sm ${modelProvider === 'openai' ? 'active' : ''} ${!openAiAvailable ? 'opacity-50' : ''}`}
                onClick={() => {
                  if (!openAiAvailable) {
                    setError('Please add OpenAI key + model in Settings.')
                    return
                  }
                  setModelProvider('openai')
                  setError(null)
                }}
                disabled={isThinking}
              >
                {openAiLabel}
              </button>
              <button
                type="button"
                className={`btn btn-outline-primary btn-sm ${modelProvider === 'gemini' ? 'active' : ''} ${!geminiAvailable ? 'opacity-50' : ''}`}
                onClick={() => {
                  if (!geminiAvailable) {
                    setError('Please add Gemini key + model in Settings.')
                    return
                  }
                  setModelProvider('gemini')
                  setError(null)
                }}
                disabled={isThinking}
              >
                {geminiLabel}
              </button>
            </div>
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={handleClear} disabled={isThinking}>
              Clear
            </button>
            <button type="submit" className="btn btn-primary px-4" disabled={isThinking}>
              {isThinking ? 'Generating…' : 'Get insight'}
            </button>
          </div>
        </form>

        <div className="card-glass p-4" style={{ minHeight: 220 }}>
          <p className="text-uppercase small text-muted fw-semibold mb-1">Response</p>
          {response ? (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-secondary mb-0">Ask a question or pick a suggestion to see the analyst’s reply.</p>
          )}
        </div>
      </div>

      <div className="col-12 col-lg-5 d-flex flex-column gap-3">
        <div className="card-glass p-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <p className="text-uppercase small text-muted fw-semibold mb-0">Quick prompts</p>
            <button
              type="button"
              className="btn btn-link btn-sm text-decoration-none"
              onClick={shufflePrompts}
              disabled={isThinking}
            >
              &#x21bb; Refresh
            </button>
          </div>
          <div className="d-flex flex-column gap-2">
            {quickSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="btn btn-outline-primary text-start"
                onClick={() => handleSuggestion(s)}
                disabled={isThinking}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="card-glass p-4">
          <p className="text-uppercase small text-muted fw-semibold mb-2">Related past insights</p>
          {memoriesToRender.length === 0 ? (
            <p className="text-secondary mb-0"> Ask a question to see related insights.</p>
          ) : (
            <ul className="list-group list-group-flush">
              {memoriesToRender.map((memory, idx) => (
                <li
                  key={memory.id || memory.query || idx}
                  className="list-group-item bg-transparent px-0"
                  role="button"
                  onClick={() => {
                    setPrompt(memory.query || memory.prompt || '')
                    setResponse(memory.response || memory.answer || '')
                  }}
                >
                  <p className="small fw-semibold mb-1">{memory.query || memory.prompt || 'Previous query'}</p>
                  <p className="mb-1 text-secondary">
                    {formatSnippet(memory.response || memory.answer || 'No cached response')}
                  </p>
                  {memory.timestamp && (
                    <p className="text-muted small mb-0">
                      {new Date(memory.timestamp).toLocaleDateString()} {new Date(memory.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function normalizeMemories(list) {
  if (!list || !Array.isArray(list)) return []
  const parsed = list
    .map((item) => {
      if (!item) return null
      if (typeof item === 'string') {
        try {
          return JSON.parse(item)
        } catch {
          return { query: item, response: '' }
        }
      }
      if (typeof item === 'object') {
        if (item.query || item.response) return item
        if (item.prompt) return { query: item.prompt, response: item.response ?? '' }
      }
      return null
    })
    .filter(Boolean)
  return parsed.length ? parsed.slice(0, 5) : []
}

export default AnalystPage
