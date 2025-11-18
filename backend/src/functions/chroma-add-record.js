const { app } = require('@azure/functions')
const { CloudClient } = require('chromadb')

let client = null
function getClient() {
  if (!client) {
    client = new CloudClient({
      apiKey: process.env.CHROMA_API_KEY,
      tenant: process.env.CHROMA_TENANT,
      database: process.env.CHROMA_DATABASE,
      baseUrl: process.env.CHROMA_BASE_URL || 'https://api.trychroma.com',
    })
  }
  return client
}

async function getCollection() {
  // Provide a no-op embedding function to avoid pulling the default embed package.
  const noopEmbeddingFn = {
    // Chroma will use this only if embeddings aren't provided; we enforce embeddings are supplied.
    generate: async () => {
      throw new Error('Embedding is required for this collection')
    },
  }

  const timeoutMs = Number(process.env.CHROMA_TIMEOUT_MS) || 15000
  const collPromise = getClient().getOrCreateCollection({
    name: 'analyst-memory-climate',
    embeddingFunction: noopEmbeddingFn,
  })
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Chroma getOrCreateCollection timed out after ${timeoutMs}ms`)), timeoutMs)
  )
  return Promise.race([collPromise, timeoutPromise])
}

app.http('chroma-add-record', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    context.log('Chroma add-record function invoked')

    if (!process.env.CHROMA_API_KEY || !process.env.CHROMA_TENANT || !process.env.CHROMA_DATABASE) {
      return { status: 500, jsonBody: { error: 'Missing CHROMA_* env vars' } }
    }

    if (request.method?.toUpperCase() !== 'POST') {
      return { status: 405, jsonBody: { error: 'Only POST supported' } }
    }

    let body = null
    try {
      body = await request.json()
    } catch (error) {
      return { status: 400, jsonBody: { error: 'Invalid JSON body' } }
    }

    const { id, prompt, response, embedding } = body || {}
    if (!id || !prompt || !Array.isArray(embedding)) {
      return { status: 400, jsonBody: { error: 'Missing id, prompt, or embedding array' } }
    }

    try {
      context.log('Connecting to Chroma...')
      const coll = await getCollection()
      await coll.upsert({
        ids: [id],
        embeddings: [embedding],
        documents: [response || ''],
        metadatas: [{ prompt, timestamp: Date.now() }],
      })
      return { status: 200, jsonBody: { ok: true } }
    } catch (error) {
      if (context?.log?.error) {
        context.log.error('Upsert failed', error)
      } else if (context?.log) {
        context.log('Upsert failed', error)
      }
      return { status: 500, jsonBody: { error: error.message } }
    }
  },
})
