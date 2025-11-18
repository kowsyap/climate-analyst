const STORAGE_KEYS = {
  news: 'climate:news-api-key',
  openaiKey: 'climate:openai-api-key',
  geminiKey: 'climate:gemini-api-key',
  geminiModel: 'climate:gemini-model',
  azureEndpoint: 'climate:azure-endpoint',
  azureDeployment: 'climate:azure-deployment',
  azureEmbeddingDeployment: 'climate:azure-embedding-deployment',
}

function getItem(key) {
  return localStorage.getItem(key) ?? ''
}

function setItem(key, value) {
  if (value) localStorage.setItem(key, value)
  else localStorage.removeItem(key)
}


export const getOpenAiKey = () => getItem(STORAGE_KEYS.openaiKey)
export const setOpenAiKey = (v) => setItem(STORAGE_KEYS.openaiKey, v)

export const getGeminiKey = () => getItem(STORAGE_KEYS.geminiKey)
export const setGeminiKey = (v) => setItem(STORAGE_KEYS.geminiKey, v)

export const getGeminiModel = () => getItem(STORAGE_KEYS.geminiModel)
export const setGeminiModel = (v) => setItem(STORAGE_KEYS.geminiModel, v)

export const getAzureEndpoint = () => getItem(STORAGE_KEYS.azureEndpoint)
export const setAzureEndpoint = (v) => setItem(STORAGE_KEYS.azureEndpoint, v)

export const getAzureDeployment = () => getItem(STORAGE_KEYS.azureDeployment)
export const setAzureDeployment = (v) => setItem(STORAGE_KEYS.azureDeployment, v)

export const getAzureEmbeddingDeployment = () => getItem(STORAGE_KEYS.azureEmbeddingDeployment)
export const setAzureEmbeddingDeployment = (v) => setItem(STORAGE_KEYS.azureEmbeddingDeployment, v)
