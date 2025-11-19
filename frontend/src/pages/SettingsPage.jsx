import { useEffect, useState } from 'react'
import {
  getAzureDeployment,
  getAzureEmbeddingDeployment,
  getAzureEndpoint,
  getGeminiKey,
  getGeminiModel,
  getOpenAiKey,
  setAzureDeployment,
  setAzureEmbeddingDeployment,
  setAzureEndpoint,
  setGeminiKey,
  setGeminiModel,
  setOpenAiKey,
} from '../services/apiKeyStore.js'

function SettingsPage() {
  const [openAiKey, updateOpenAiKey] = useState(() => getOpenAiKey())
  const [azureEndpoint, updateAzureEndpoint] = useState(() => getAzureEndpoint())
  const [azureDeployment, updateAzureDeployment] = useState(() => getAzureDeployment())
  const [azureEmbeddingDeployment, updateAzureEmbeddingDeployment] = useState(() => getAzureEmbeddingDeployment())
  const [geminiKey, updateGeminiKey] = useState(() => getGeminiKey())
  const [geminiModel, updateGeminiModel] = useState(() => getGeminiModel() || 'gemini-2.0-flash')
  const [status, setStatus] = useState(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Settings | Climate Dashboard'
    return () => {
      document.title = previousTitle
    }
  }, [])

  const handleSave = (event) => {
    event.preventDefault()
    setOpenAiKey(openAiKey.trim())
    setAzureEndpoint(azureEndpoint.trim())
    setAzureDeployment(azureDeployment.trim())
    setAzureEmbeddingDeployment(azureEmbeddingDeployment.trim())
    setGeminiKey(geminiKey.trim())
    setGeminiModel(geminiModel.trim())
    setStatus('Saved API settings locally.')
  }

  const handleClear = () => {
    updateOpenAiKey('')
    updateAzureEndpoint('')
    updateAzureDeployment('')
    updateAzureEmbeddingDeployment('')
    updateGeminiKey('')
    updateGeminiModel('')
    setOpenAiKey('')
    setAzureEndpoint('')
    setAzureDeployment('')
    setAzureEmbeddingDeployment('')
    setGeminiKey('')
    setGeminiModel('')
    setStatus('Cleared stored keys and model settings.')
  }

  return (
    <div className="card-glass p-4">
      <div className="mb-4">
        <p className="text-uppercase small text-muted mb-1">Settings</p>
        <h2 className="h5 mb-2">API Access</h2>
        <p className="text-secondary mb-0">
          Keys live only in <code>localStorage</code> on this browser—never bundled into the build or sent elsewhere.
        </p>
      </div>

      <form onSubmit={handleSave} className="d-flex flex-column gap-4">

        <div className="row g-3">
          <div className="col-12">
            <label htmlFor="azureEndpoint" className="form-label fw-semibold">
              Azure OpenAI Endpoint
            </label>
            <input
              id="azureEndpoint"
              type="text"
              className="form-control"
              placeholder="https://your-resource.openai.azure.com"
              value={azureEndpoint}
              onChange={(e) => updateAzureEndpoint(e.target.value)}
            />
            <div className="form-text">Used for chat and embeddings calls.</div>
          </div>
          <div className="col-12 col-md-6">
            <label htmlFor="azureDeployment" className="form-label fw-semibold">
              Azure Chat Deployment
            </label>
            <input
              id="azureDeployment"
              type="text"
              className="form-control"
              placeholder="gpt-4o-mini"
              value={azureDeployment}
              onChange={(e) => updateAzureDeployment(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <label htmlFor="azureEmbeddingDeployment" className="form-label fw-semibold">
              Azure Embedding Deployment
            </label>
            <input
              id="azureEmbeddingDeployment"
              type="text"
              className="form-control"
              placeholder="text-embedding-3-large"
              value={azureEmbeddingDeployment}
              onChange={(e) => updateAzureEmbeddingDeployment(e.target.value)}
            />
          </div>
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-12">
            <label htmlFor="openAiKey" className="form-label fw-semibold">
              OpenAI API Key
            </label>
            <input
              id="openAiKey"
              type="password"
              className="form-control"
              placeholder="sk-..."
              value={openAiKey}
              onChange={(e) => updateOpenAiKey(e.target.value)}
            />
          </div>
          
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label htmlFor="openAiKey" className="form-label fw-semibold">
              Gemini API Key
            </label>
            <input
              id="geminiKey"
              type="password"
              className="form-control"
              placeholder="AI..."
              value={geminiKey}
              onChange={(e) => updateGeminiKey(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <label htmlFor="geminiModel" className="form-label fw-semibold">
              Gemini Model
            </label>
            <input
              id="geminiModel"
              type="text"
              className="form-control"
              placeholder="gemini-2.0-flash"
              value={geminiModel}
              onChange={(e) => updateGeminiModel(e.target.value)}
            />
          </div>
        </div>

        {status && <div className="alert alert-info py-2 mb-0">{status}</div>}

        <div className="d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={handleClear}>
            Clear
          </button>
          <button type="submit" className="btn btn-primary px-4">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

export default SettingsPage
